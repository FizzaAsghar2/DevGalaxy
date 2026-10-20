import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { FRAMEWORKS, SECTION_TYPES, makeSection, hash, slug } from '../../studio/core/spec'
import { FONT_NAMES, buildPalette } from '../../studio/core/tokens'

const PALETTE_KEYS = ['primary', 'accent', 'background', 'surface', 'text', 'muted']

function Field({ label, children }) {
  return (
    <label className="block text-xs">
      <span className="label-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

/** Editable view of the website specification, used before generation and in the editor's Plan tab. */
export default function SpecEditor({ spec, onChange, compact = false }) {
  const set = (patch) => onChange({ ...spec, ...patch })
  const setPage = (i, page) => set({ pages: spec.pages.map((p, j) => (j === i ? page : p)) })
  const ctx = (seed) => ({ subject: spec.subject, name: spec.name, cards: 'Highlights', category: spec.category, seed })

  return (
    <div className={`grid gap-5 ${compact ? '' : 'lg:grid-cols-[1.2fr_1fr]'}`}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project name"><input className="input w-full" value={spec.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Framework">
            <select className="input w-full" value={spec.framework} onChange={(e) => set({ framework: e.target.value })}>
              {Object.entries(FRAMEWORKS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Purpose"><textarea className="input w-full" rows={2} value={spec.purpose} maxLength={300} onChange={(e) => set({ purpose: e.target.value })} /></Field>
        <Field label="Audience"><input className="input w-full" value={spec.audience} maxLength={160} onChange={(e) => set({ audience: e.target.value })} /></Field>

        <div>
          <div className="flex items-center justify-between">
            <span className="label-muted text-xs">Pages & sections</span>
            <button type="button" className="btn-ghost px-2 py-1 text-xs" disabled={spec.pages.length >= 8}
              onClick={() => set({ pages: [...spec.pages, { id: `page-${spec.pages.length + 1}`, name: `Page ${spec.pages.length + 1}`, path: `/page-${spec.pages.length + 1}`, sections: [makeSection('about', ctx(spec.pages.length)), makeSection('cta', ctx(1))] }] })}>
              <Plus className="h-3.5 w-3.5" /> Add page
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {spec.pages.map((page, i) => (
              <div key={page.id + i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <input aria-label="Page name" className="input flex-1 py-1.5 text-sm" value={page.name} maxLength={24}
                    onChange={(e) => setPage(i, { ...page, name: e.target.value, ...(i ? { path: `/${slug(e.target.value) || 'page'}` } : {}) })} />
                  {i > 0 && (
                    <button type="button" aria-label={`Remove ${page.name} page`} className="btn-ghost p-2" onClick={() => set({ pages: spec.pages.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <ol className="mt-2 flex flex-wrap gap-1.5">
                  {page.sections.map((s, k) => (
                    <li key={s.id + k} className="group flex items-center gap-1 rounded-lg bg-white/[0.06] py-1 pl-2 pr-1 text-xs text-slate-200">
                      <span title={s.title}>{s.type}</span>
                      <button type="button" aria-label={`Move ${s.type} up`} disabled={k === 0} className="rounded p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
                        onClick={() => { const next = [...page.sections];[next[k - 1], next[k]] = [next[k], next[k - 1]]; setPage(i, { ...page, sections: next }) }}>
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button type="button" aria-label={`Move ${s.type} down`} disabled={k === page.sections.length - 1} className="rounded p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
                        onClick={() => { const next = [...page.sections];[next[k + 1], next[k]] = [next[k], next[k + 1]]; setPage(i, { ...page, sections: next }) }}>
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      {!(i === 0 && s.type === 'hero') && (
                        <button type="button" aria-label={`Remove ${s.type}`} className="rounded p-0.5 text-slate-400 hover:text-rose-300" onClick={() => setPage(i, { ...page, sections: page.sections.filter((_, j) => j !== k) })}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </li>
                  ))}
                  <li>
                    <select aria-label={`Add section to ${page.name}`} className="rounded-lg border border-dashed border-white/20 bg-transparent px-2 py-1 text-xs text-slate-300" value=""
                      onChange={(e) => e.target.value && setPage(i, { ...page, sections: [...page.sections, makeSection(e.target.value, ctx(hash(page.name + e.target.value + page.sections.length)))] })}>
                      <option value="">+ section</option>
                      {SECTION_TYPES.filter((t) => t !== 'hero').map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </li>
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <span className="label-muted text-xs">Colour palette</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PALETTE_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 rounded-lg bg-white/[0.04] p-2 text-xs capitalize text-slate-300">
                <input type="color" value={spec.palette[k]} aria-label={`${k} colour`} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
                  onChange={(e) => set({ palette: k === 'primary' || k === 'background' ? { ...buildPalette({ primary: k === 'primary' ? e.target.value : spec.palette.primary, background: k === 'background' ? e.target.value : spec.palette.background }) } : { ...spec.palette, [k]: e.target.value } })} />
                {k}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['heading', 'body'].map((k) => (
            <Field key={k} label={`${k} font`}>
              <select className="input w-full" value={spec.typography[k]} onChange={(e) => set({ typography: { ...spec.typography, [k]: e.target.value } })}>
                {FONT_NAMES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
          ))}
          <Field label="Corner radius">
            <select className="input w-full" value={spec.layout.radius} onChange={(e) => set({ layout: { ...spec.layout, radius: e.target.value } })}>
              {['none', 'sm', 'md', 'lg', 'full'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Spacing">
            <select className="input w-full" value={spec.layout.density} onChange={(e) => set({ layout: { ...spec.layout, density: e.target.value } })}>
              {['compact', 'comfortable', 'spacious'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Hero layout">
            <select className="input w-full" value={spec.style.heroLayout} onChange={(e) => set({ style: { ...spec.style, heroLayout: e.target.value } })}>
              {['centered', 'split', 'editorial'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Animation">
            <select className="input w-full" value={spec.animation.level} onChange={(e) => set({ animation: { ...spec.animation, level: e.target.value } })}>
              {['none', 'subtle', 'rich'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={spec.navigation.sticky} onChange={(e) => set({ navigation: { ...spec.navigation, sticky: e.target.checked } })} /> Sticky navigation bar
        </label>
        {!compact && (
          <div className="rounded-xl bg-white/[0.03] p-3 text-xs leading-relaxed text-slate-400">
            <p><span className="text-slate-200">Responsive:</span> {spec.responsive.join(' · ')}</p>
            <p className="mt-1"><span className="text-slate-200">Interactions:</span> {spec.interactions.join(' · ')}</p>
            <p className="mt-1"><span className="text-slate-200">Accessibility:</span> {spec.accessibility.join(' · ')}</p>
            <p className="mt-1"><span className="text-slate-200">Dependencies:</span> {spec.dependencies.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
