import { build } from 'esbuild'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import { authenticate } from './_lib/account.js'
import { clientIp, readBody, rateLimited, send } from './_lib/http.js'
import { validateFiles } from '../src/studio/core/paths.js'
import { TAILWIND_THEME } from '../src/studio/core/tokens.js'

/**
 * Preview compiler. Validates the project files, bundles them with esbuild from
 * an in-memory file system (no disk writes, no installs, no code execution on the
 * server) and compiles Tailwind. Only an allow-list of packages can be imported.
 * The browser runs the result inside a sandboxed, opaque-origin iframe.
 */
const ALLOWED_PACKAGES = new Set(['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'lucide-react', 'framer-motion'])
const EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js']
const ENTRY = `import { createRoot } from 'react-dom/client'
import { Component } from 'react'
import App from './src/App'
class Boundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { parent.postMessage({ type: 'gs:error', message: String(error && error.message || error) }, '*') }
  render() { return this.state.error ? null : this.props.children }
}
createRoot(document.getElementById('root')).render(<Boundary><App /></Boundary>)
parent.postMessage({ type: 'gs:ready' }, '*')
`

function join(dir, rel) {
  const parts = dir ? dir.split('/') : []
  for (const seg of rel.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg !== '.' && seg) parts.push(seg)
  }
  return parts.join('/')
}

function loaderFor(path) {
  if (/\.tsx$/.test(path)) return 'tsx'
  if (/\.ts$/.test(path)) return 'ts'
  if (/\.jsx$/.test(path)) return 'jsx'
  if (/\.m?js$/.test(path)) return 'js'
  if (/\.json$/.test(path)) return 'json'
  return 'dataurl'
}

function mapErrors(errors) {
  return errors.slice(0, 20).map((e) => ({ file: e.location?.file?.replace(/^project:/, '') ?? null, line: e.location?.line ?? null, column: e.location?.column ?? null, text: e.text }))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { error: 'Method not allowed' })
  }
  const auth = await authenticate(req)
  if (!auth) return send(res, 401, { error: 'Sign in to build previews.' })
  if (rateLimited(`build:${auth.userId}:${clientIp(req)}`, 30)) return send(res, 429, { error: 'Too many preview builds. Wait a moment.' })
  let body
  try {
    body = await readBody(req)
  } catch {
    return send(res, 400, { error: 'Invalid request body.' })
  }
  const { files, problems } = validateFiles(body.files)
  if (problems.length) return send(res, 422, { ok: false, stage: 'validate', errors: problems.map((text) => ({ file: null, line: null, column: null, text })) })
  const map = new Map(files.map((f) => [f.path, f]))
  if (!map.has('src/App.tsx') && !map.has('src/App.jsx')) return send(res, 422, { ok: false, stage: 'validate', errors: [{ file: null, line: null, column: null, text: 'The project has no src/App.tsx.' }] })

  const started = Date.now()
  let js
  try {
    const result = await build({
      stdin: { contents: ENTRY, loader: 'jsx', sourcefile: 'preview-entry.jsx', resolveDir: process.cwd() },
      bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2020', minify: true, jsx: 'automatic', logLevel: 'silent',
      define: { 'process.env.NODE_ENV': '"production"' },
      plugins: [{
        name: 'galaxy-studio-project',
        setup(b) {
          b.onResolve({ filter: /.*/ }, (args) => {
            const fromProject = args.namespace === 'project' || args.importer === 'preview-entry.jsx' || args.importer.endsWith('preview-entry.jsx')
            if (args.path.startsWith('.')) {
              if (!fromProject) return undefined
              const base = join(args.namespace === 'project' ? args.importer.split('/').slice(0, -1).join('/') : '', args.path)
              const hit = EXTENSIONS.map((ext) => base + ext).find((p) => map.has(p))
              if (!hit) return { errors: [{ text: `Cannot find "${args.path}" (from ${args.importer || 'entry'})` }] }
              return { path: hit, namespace: 'project' }
            }
            if (!fromProject) return undefined
            const pkg = args.path.startsWith('@') ? args.path.split('/').slice(0, 2).join('/') : args.path.split('/')[0]
            if (ALLOWED_PACKAGES.has(args.path) || (ALLOWED_PACKAGES.has(pkg) && !args.path.includes('..'))) return undefined
            return { errors: [{ text: `The package "${args.path}" is not available in the preview. Allowed: ${[...ALLOWED_PACKAGES].join(', ')}.` }] }
          })
          b.onLoad({ filter: /.*/, namespace: 'project' }, (args) => {
            const file = map.get(args.path)
            if (/\.css$/.test(args.path)) return { contents: '', loader: 'js' }
            if (file.encoding === 'base64') return { contents: Buffer.from(file.content, 'base64'), loader: 'dataurl' }
            return { contents: file.content, loader: loaderFor(args.path), resolveDir: process.cwd() }
          })
        },
      }],
    })
    js = result.outputFiles[0].text
  } catch (error) {
    return send(res, 200, { ok: false, stage: 'compile', errors: mapErrors(error.errors ?? [{ text: String(error.message ?? error) }]), ms: Date.now() - started })
  }
  if (js.length > 4_000_000) return send(res, 200, { ok: false, stage: 'compile', errors: [{ file: null, line: null, column: null, text: 'The compiled preview is too large.' }] })

  let css = ''
  try {
    const sources = files.filter((f) => /\.(tsx|ts|jsx|js|html)$/.test(f.path)).map((f) => ({ raw: f.content, extension: f.path.split('.').pop() }))
    const sheets = files.filter((f) => f.path.endsWith('.css')).sort((a) => (a.path === 'src/index.css' ? -1 : 1))
    const result = await postcss([tailwindcss({ content: sources, theme: TAILWIND_THEME, plugins: [] })]).process(sheets.map((f) => f.content).join('\n'), { from: undefined })
    css = result.css
  } catch (error) {
    return send(res, 200, { ok: false, stage: 'styles', errors: [{ file: error.file ?? 'src/index.css', line: error.line ?? null, column: error.column ?? null, text: error.reason ?? String(error.message) }], ms: Date.now() - started })
  }
  return send(res, 200, { ok: true, js, css, ms: Date.now() - started })
}
