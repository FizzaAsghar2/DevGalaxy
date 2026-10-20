import { describe, expect, it } from 'vitest'
import handler from '../api/studio-build.js'
import { generateProject } from '../src/studio/core/codegen.js'
import { planOffline } from '../src/studio/core/spec.js'

function call(body) {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v }, status(code) { return { json: (b) => resolve({ code, body: b }) } } }
    handler({ method: 'POST', headers: {}, body, socket: { remoteAddress: `t-${Math.random()}` } }, res)
  })
}

describe('/api/studio-build', () => {
  it('compiles a generated project in memory', async () => {
    const files = generateProject(planOffline('A modern SaaS landing page for a team task manager with pricing and FAQ'))
    const r = await call({ files })
    expect(r.code).toBe(200)
    expect(r.body.ok).toBe(true)
    expect(r.body.js.length).toBeGreaterThan(1000)
    expect(r.body.css).toContain('--')
  }, 30_000)
  it('reports compile errors with file and line', async () => {
    const files = generateProject(planOffline('A modern SaaS landing page for a team task manager'))
    const broken = files.map((f) => (f.path === 'src/App.tsx' ? { ...f, content: `${f.content}\nconst = ;` } : f))
    const r = await call({ files: broken })
    expect(r.body.ok).toBe(false)
    expect(r.body.stage).toBe('compile')
    expect(r.body.errors[0].file).toBe('src/App.tsx')
  }, 30_000)
  it('rejects disallowed packages, traversal and secrets', async () => {
    const files = generateProject(planOffline('A portfolio website for a designer'))
    const evil = files.map((f) => (f.path === 'src/App.tsx' ? { ...f, content: `import fs from 'fs'\nconsole.log(fs)\n${f.content}` } : f))
    const r1 = await call({ files: evil })
    expect(r1.body.ok).toBe(false)
    expect(JSON.stringify(r1.body.errors)).toMatch(/not available in the preview/)
    const r2 = await call({ files: [...files, { path: '../../etc/x.ts', content: '' }] })
    expect(r2.code).toBe(422)
    const r3 = await call({ files: [...files, { path: 'src/k.ts', content: 'export const k = "sk-proj-abcdefghijklmnopqrstuvwxyz123456"' }] })
    expect(r3.code).toBe(422)
  }, 30_000)
})
