import { describe, expect, it } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { CATEGORIES, DIRECTIONS, applyDirection, clarifyingQuestions, combineVariations, normaliseSpec, planOffline, validatePrompt } from '../src/studio/core/spec.js'
import { applyOfflineEdit } from '../src/studio/core/offlineEdit.js'
import { generateProject } from '../src/studio/core/codegen.js'
import { checkPath, containsSecret, validateFiles } from '../src/studio/core/paths.js'
import { buildProjectZip } from '../src/studio/core/zip.js'
import { changedFiles, lineDiff } from '../src/studio/core/diff.js'
import { contrast, readableOn } from '../src/studio/core/tokens.js'
import { previewDocument } from '../src/studio/preview.js'

const PERFUME = 'Build a premium perfume website with a black and gold theme, elegant typography, product cards, testimonials and a responsive navigation bar.'

describe('planner', () => {
  it('turns any prompt into a complete spec', () => {
    for (const prompt of [PERFUME, 'A website for my dog grooming salon in Leeds', 'Portfolio for a wedding photographer', 'zzzz qqqq website for things']) {
      const spec = planOffline(prompt)
      expect(spec.pages.length).toBeGreaterThan(0)
      expect(spec.pages[0].path).toBe('/')
      expect(spec.pages[0].sections[0].type).toBe('hero')
      expect(CATEGORIES).toContain(spec.category)
      expect(spec.typography.heading).toBeTruthy()
    }
  })
  it('respects colours and dark mood from the prompt', () => {
    const spec = planOffline(PERFUME)
    expect(spec.category).toBe('E-commerce frontend')
    expect(contrast(spec.palette.text, spec.palette.background)).toBeGreaterThanOrEqual(4.5)
  })
  it('validates prompt length and asks clarifying questions only when vague', () => {
    expect(validatePrompt('short')).toMatch(/at least/)
    expect(validatePrompt(PERFUME)).toBeNull()
    expect(clarifyingQuestions('a site').length).toBeGreaterThan(0)
    expect(clarifyingQuestions(PERFUME)).toHaveLength(0)
  })
  it('normalises hostile or incomplete AI output', () => {
    const spec = normaliseSpec({ name: '<script>x</script>'.repeat(10), pages: [{ name: 'Home', sections: [{ type: 'evil' }] }], palette: { primary: 'red; background:url(x)' } })
    expect(spec.name.length).toBeLessThanOrEqual(40)
    expect(spec.pages[0].sections.every((s) => s.type !== 'evil')).toBe(true)
    expect(spec.palette.primary).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe('design variations', () => {
  it('produce materially different designs', () => {
    const base = planOffline(PERFUME)
    const [a, b, c] = DIRECTIONS.map((d) => applyDirection(base, d.key))
    const sig = (s) => JSON.stringify([s.typography, s.layout.radius, s.layout.heroLayout, s.layout.navStyle])
    expect(new Set([sig(a), sig(b), sig(c)]).size).toBe(3)
  })
  it('can combine colours, typography and layout from different variations', () => {
    const base = planOffline(PERFUME)
    const [a, b, c] = DIRECTIONS.map((d) => applyDirection(base, d.key))
    const mixed = combineVariations({ colors: a, type: b, layout: c })
    expect(mixed.palette).toEqual(a.palette)
    expect(mixed.typography).toEqual(b.typography)
    expect(mixed.layout.heroLayout).toBe(c.layout.heroLayout)
  })
})

describe('offline editor', () => {
  const spec = planOffline(PERFUME)
  it('applies supported commands', () => {
    expect(applyOfflineEdit(spec, 'Make the navbar sticky').spec.navigation.sticky).toBe(true)
    const t = applyOfflineEdit(spec, 'Add testimonials below the cards')
    expect(t.summary.length).toBeGreaterThan(0)
    const emerald = applyOfflineEdit(spec, 'Change the theme to emerald')
    expect(emerald.spec.palette.primary).not.toBe(spec.palette.primary)
    expect(applyOfflineEdit(spec, 'Add a contact section').spec.pages[0].sections.some((s) => s.type === 'contact')).toBe(true)
  })
  it('reports unsupported requests honestly and leaves the spec untouched', () => {
    const r = applyOfflineEdit(spec, 'integrate with my SAP backend over SOAP')
    expect(r.unsupported).toMatch(/could not understand/)
    expect(r.spec).toBe(spec)
  })
})

describe('code generation', () => {
  it.each(['react-vite', 'nextjs'])('generates a valid %s project', (framework) => {
    const files = generateProject({ ...planOffline(PERFUME), framework })
    const { problems } = validateFiles(files)
    expect(problems).toEqual([])
    const paths = files.map((f) => f.path)
    expect(paths).toContain('package.json')
    expect(paths).toContain('README.md')
    expect(paths.some((p) => p.includes('.env') && !p.endsWith('.example'))).toBe(false)
  })
})

describe('path and secret validation', () => {
  it.each(['../etc/passwd', '/abs.ts', 'src/../../x.ts', '.env', 'src/.env.local', 'node_modules/a.js', '.git/config', 'a\\b.ts', 'x.exe'])('rejects %s', (p) => {
    expect(checkPath(p).ok).toBe(false)
  })
  it('accepts normal source paths', () => {
    expect(checkPath('src/components/Hero.tsx').ok).toBe(true)
  })
  it('detects credentials', () => {
    expect(containsSecret('const k = "sk-proj-abcdefghijklmnopqrstuvwxyz123456"')).toBe(true)
    expect(containsSecret('-----BEGIN PRIVATE KEY-----')).toBe(true)
    expect(containsSecret('const title = "Hello"')).toBe(false)
  })
})

describe('ZIP export', () => {
  it('contains the project and skips unsafe files', () => {
    const files = [...generateProject(planOffline(PERFUME)), { path: '../evil.ts', content: 'x' }, { path: 'src/leak.ts', content: 'AKIAABCDEFGHIJKLMNOP' }]
    const { bytes, included, skipped } = buildProjectZip(files, 'Maison Noir!')
    const entries = unzipSync(bytes)
    expect(Object.keys(entries).every((k) => k.startsWith('Maison-Noir/'))).toBe(true)
    expect(skipped).toEqual(expect.arrayContaining(['../evil.ts', 'src/leak.ts']))
    expect(included).toContain('package.json')
    expect(JSON.parse(strFromU8(entries['Maison-Noir/package.json'])).dependencies.react).toBeTruthy()
  })
})

describe('diffs and tokens', () => {
  it('computes line diffs and changed files', () => {
    const d = lineDiff('a\nb\nc', 'a\nB\nc')
    expect(d.filter((l) => l.type !== 'same')).toHaveLength(2)
    expect(changedFiles([{ path: 'a', content: '1' }, { path: 'b', content: '1' }], [{ path: 'a', content: '2' }, { path: 'c', content: '1' }])).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'a' }), expect.objectContaining({ path: 'b' }), expect.objectContaining({ path: 'c' })]))
  })
  it('picks readable foreground colours', () => {
    expect(contrast(readableOn('#ffd700'), '#ffd700')).toBeGreaterThanOrEqual(4.5)
    expect(contrast(readableOn('#101010'), '#101010')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('preview sandbox document', () => {
  it('blocks network, frames and form posts and escapes script terminators', () => {
    const html = previewDocument({ js: 'console.log("</script><img src=x>")', css: '', fonts: ['Inter'] })
    expect(html).toContain("connect-src 'none'")
    expect(html).toContain("frame-src 'none'")
    expect(html).toContain("form-action 'none'")
    expect(html).not.toContain('</script><img')
  })
})
