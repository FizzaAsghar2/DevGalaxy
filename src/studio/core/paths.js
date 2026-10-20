// @ts-check
/**
 * Path and content validation for generated projects. Everything that enters a
 * project (AI output, uploads, edits) and everything that leaves it (ZIP export,
 * preview compiler) goes through these checks.
 */

export const MAX_FILES = 120
export const MAX_TEXT_BYTES = 200_000
export const MAX_ASSET_BYTES = 2_000_000
export const MAX_PROJECT_BYTES = 8_000_000

const TEXT_EXT = /\.(tsx|ts|jsx|js|mjs|css|json|md|html|svg|txt)$/i
const ASSET_EXT = /\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i
/** Files written by Galaxy Studio itself; AI edits may not replace them. */
export const MANAGED_FILES = new Set([
  'package.json', 'index.html', 'vite.config.ts', 'tsconfig.json', 'tailwind.config.js', 'postcss.config.js',
  'next.config.mjs', 'next-env.d.ts', '.gitignore', 'src/main.tsx', 'src/vite-env.d.ts', 'src/app/layout.tsx', 'src/app/page.tsx',
])

/** @param {unknown} path @returns {{ ok: true, path: string } | { ok: false, reason: string }} */
export function checkPath(path) {
  if (typeof path !== 'string' || !path) return { ok: false, reason: 'empty path' }
  if (path.length > 160) return { ok: false, reason: 'path too long' }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\\:*?"<>|]/.test(path)) return { ok: false, reason: 'illegal characters' }
  if (path.startsWith('/') || path.startsWith('~')) return { ok: false, reason: 'absolute path' }
  const parts = path.split('/')
  if (parts.some((p) => p === '' || p === '.' || p === '..')) return { ok: false, reason: 'path traversal' }
  if (parts.some((p) => /^\.env/i.test(p) || p === '.git' || p === 'node_modules')) return { ok: false, reason: 'forbidden file' }
  if (!TEXT_EXT.test(path) && !ASSET_EXT.test(path) && path !== '.gitignore') return { ok: false, reason: 'unsupported file type' }
  return { ok: true, path }
}

/** Paths an AI edit or a user upload may write. @param {string} path */
export function isWritableByEditor(path) {
  const check = checkPath(path)
  if (!check.ok || MANAGED_FILES.has(path)) return false
  if (path.startsWith('src/assets/')) return ASSET_EXT.test(path)
  return path.startsWith('src/') && /\.(tsx|ts|css|json)$/.test(path)
}

export function isAssetPath(/** @type {string} */ path) {
  return /\.(png|jpe?g|webp|gif|ico|woff2?)$/i.test(path)
}

const SECRET_PATTERNS = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/, /sk_(?:live|test)_[A-Za-z0-9]{16,}/, /AKIA[0-9A-Z]{16}/, /AIza[0-9A-Za-z_-]{35}/,
  /ghp_[A-Za-z0-9]{30,}/, /xox[baprs]-[A-Za-z0-9-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./,
]

/** True when the text looks like it contains a credential. @param {string} text */
export function containsSecret(text) {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text))
}

/**
 * @typedef {{ path: string, content: string, encoding?: 'utf8' | 'base64' }} ProjectFile
 * Validates a whole file set; returns the accepted files and readable problems.
 * @param {unknown} files
 * @returns {{ files: ProjectFile[], problems: string[] }}
 */
export function validateFiles(files) {
  /** @type {ProjectFile[]} */
  const out = []
  const problems = []
  const seen = new Set()
  let total = 0
  if (!Array.isArray(files)) return { files: out, problems: ['files must be an array'] }
  for (const raw of files) {
    const file = /** @type {Partial<ProjectFile>} */ (raw ?? {})
    const check = checkPath(file.path)
    if (!check.ok) {
      problems.push(`${String(file.path).slice(0, 80)}: ${check.reason}`)
      continue
    }
    if (typeof file.content !== 'string') {
      problems.push(`${check.path}: content must be text`)
      continue
    }
    const encoding = file.encoding === 'base64' ? 'base64' : 'utf8'
    const size = encoding === 'base64' ? Math.floor((file.content.length * 3) / 4) : file.content.length
    if (size > (encoding === 'base64' ? MAX_ASSET_BYTES : MAX_TEXT_BYTES)) {
      problems.push(`${check.path}: file too large`)
      continue
    }
    if (encoding === 'utf8' && containsSecret(file.content)) {
      problems.push(`${check.path}: looks like it contains a credential and was rejected`)
      continue
    }
    if (seen.has(check.path)) {
      problems.push(`${check.path}: duplicate path`)
      continue
    }
    total += size
    if (total > MAX_PROJECT_BYTES || out.length >= MAX_FILES) {
      problems.push('project is too large')
      break
    }
    seen.add(check.path)
    out.push({ path: check.path, content: file.content, ...(encoding === 'base64' ? { encoding } : {}) })
  }
  return { files: out, problems }
}
