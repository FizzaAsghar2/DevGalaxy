import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { FONT_NAMES } from '../../studio/core/tokens'

const COLORS = ['primary', 'accent', 'background', 'surface', 'text', 'muted']
const SEG = (value, options, onChange, label) => (
  <div>
    <span className="label-muted text-[10px]">{label}</span>
    <div className="mt-1 flex rounded-lg bg-white/[0.04] p-0.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className={`flex-1 rounded-md px-1.5 py-1 text-[11px] capitalize ${value === o ? 'bg-violet-500/40 text-white' : 'text-slate-400 hover:text-white'}`}>{o}</button>
      ))}
    </div>
  </div>
)

/** Direct design controls. Changes are batched and committed as one version after a short pause. */
export default function DesignPanel({ spec, onCommit }) {
  const [draft, setDraft] = useState(spec)
  const [dirty, setDirty] = useState(false)
  useEffect(() => { setDraft(spec); setDirty(false) }, [spec])
  useEffect(() => {
    if (!dirty) return undefined
    const t = setTimeout(() => { onCommit(draft); setDirty(false) }, 700)
    return () => clearTimeout(t)
  }, [dirty, draft, onCommit])
  const patch = (k, v) => { setDraft((d) => ({ ...d, [k]: { ...d[k], ...v } })); setDirty(true) }

  return (
    <div className="space-y-4 text-xs">
      <div>
        <span className="label-muted text-[10px]">Colours</span>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {COLORS.map((k) => (
            <label key={k} className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] p-1.5 capitalize text-slate-300">
              <input type="color" value={draft.palette[k]} aria-label={`${k} colour`} onChange={(e) => patch('palette', { [k]: e.target.value })} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent" /> {k}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {['heading', 'body'].map((k) => (
          <label key={k}><span className="label-muted text-[10px]">{k} font</span>
            <select className="input mt-1 px-2 py-1.5 text-xs" value={draft.typography[k]} onChange={(e) => patch('typography', { [k]: e.target.value })}>{FONT_NAMES.map((f) => <option key={f}>{f}</option>)}</select>
          </label>
        ))}
      </div>
      {SEG(draft.layout.radius, ['none', 'sm', 'md', 'lg', 'full'], (v) => patch('layout', { radius: v }), 'Corner radius')}
      {SEG(draft.layout.density, ['compact', 'comfortable', 'spacious'], (v) => patch('layout', { density: v }), 'Section spacing')}
      {SEG(draft.style.heroLayout, ['centered', 'split', 'editorial'], (v) => patch('style', { heroLayout: v }), 'Hero layout')}
      {SEG(draft.style.cardStyle, ['flat', 'bordered', 'elevated'], (v) => patch('style', { cardStyle: v }), 'Card style')}
      {SEG(draft.style.cardSize, ['sm', 'md', 'lg'], (v) => patch('style', { cardSize: v }), 'Card size')}
      {SEG(draft.animation.level, ['none', 'subtle', 'rich'], (v) => patch('animation', { level: v }), 'Animation')}
      {SEG(draft.navigation.style, ['left', 'centered'], (v) => patch('navigation', { style: v }), 'Navigation layout')}
      <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={draft.navigation.sticky} onChange={(e) => patch('navigation', { sticky: e.target.checked })} /> Sticky navigation</label>
      <p className="flex gap-2 rounded-lg bg-white/[0.03] p-2 text-[11px] text-slate-400"><Info className="h-3.5 w-3.5 shrink-0" /> Click-to-select element editing is not available yet. Use these controls, the chat, or edit a file in Code view.</p>
      {dirty && <p className="text-[11px] text-cyan-300">Applying…</p>}
    </div>
  )
}
