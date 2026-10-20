import { Check, Eye } from 'lucide-react'
import { FONT_STACKS, RADII, readableOn } from '../../studio/core/tokens'

/** Trusted mini mock-up of a design direction drawn from its spec (real palette, fonts, radius, hero layout). */
export default function VariationCard({ variation, selected, onSelect, onPreview }) {
  const { spec, summary } = variation
  const p = spec.palette
  const radius = RADII[spec.layout.radius]
  const hero = spec.pages[0].sections.find((s) => s.type === 'hero')
  const split = spec.style.heroLayout === 'split'
  return (
    <div className={`glass flex flex-col overflow-hidden rounded-2xl transition ${selected ? 'ring-2 ring-cyan-300/80' : 'hover:-translate-y-0.5'}`}>
      <div className="aspect-[4/3] overflow-hidden p-3" style={{ background: p.background, color: p.text, fontFamily: FONT_STACKS[spec.typography.body] }} aria-hidden="true">
        <div className={`flex items-center ${spec.navigation.style === 'centered' ? 'justify-center gap-3' : 'justify-between'} text-[9px]`} style={{ color: p.muted }}>
          <span style={{ color: p.text, fontFamily: FONT_STACKS[spec.typography.heading] }} className="font-semibold">{spec.name}</span>
          <span className="flex gap-2">{spec.pages.slice(0, 3).map((pg) => <span key={pg.id}>{pg.name}</span>)}</span>
        </div>
        <div className={`mt-4 ${split ? 'grid grid-cols-2 items-center gap-2' : spec.style.heroLayout === 'editorial' ? '' : 'text-center'}`}>
          <div>
            <p className="line-clamp-2 text-base leading-tight" style={{ fontFamily: FONT_STACKS[spec.typography.heading] }}>{hero?.title ?? spec.name}</p>
            <span className="mt-2 inline-block px-2 py-1 text-[8px] font-semibold" style={{ background: p.primary, color: readableOn(p.primary), borderRadius: radius }}>{spec.navigation.cta}</span>
          </div>
          {split && <div className="h-14" style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})`, borderRadius: radius }} />}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10" style={{ background: p.surface, borderRadius: radius, border: spec.style.cardStyle === 'bordered' ? `1px solid ${p.muted}55` : 'none', boxShadow: spec.style.cardStyle === 'elevated' ? '0 4px 10px rgba(0,0,0,.25)' : 'none' }} />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-white">{spec.style.direction || spec.variantName}</p>
        <p className="mt-1 flex-1 text-xs text-slate-400">{summary}</p>
        <p className="mt-2 text-[11px] text-slate-500">{spec.typography.heading} / {spec.typography.body} · {spec.layout.density} · radius {spec.layout.radius}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-ghost flex-1 px-3 py-2 text-xs" onClick={onPreview}><Eye className="h-3.5 w-3.5" /> Preview</button>
          <button type="button" className={`${selected ? 'btn-primary' : 'btn-ghost'} flex-1 px-3 py-2 text-xs`} onClick={onSelect} aria-pressed={selected}>
            <Check className="h-3.5 w-3.5" /> {selected ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>
    </div>
  )
}
