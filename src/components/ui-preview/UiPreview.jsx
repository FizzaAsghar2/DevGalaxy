import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Crown, Loader2, Maximize2, Monitor, Orbit, Palette, RefreshCw, Shuffle, Smartphone, Sparkles, Tablet, Wand2, X,
} from 'lucide-react'
import { UI_STYLES, UI_THEMES } from '../../services/localUi'
import PrototypeFrame from './PrototypeFrame'

const DEVICES = [
  { key: 'desktop', label: 'Desktop', icon: Monitor, width: '100%', height: '100%' },
  { key: 'tablet', label: 'Tablet', icon: Tablet, width: 820, height: 1000 },
  { key: 'mobile', label: 'Mobile', icon: Smartphone, width: 390, height: 780 },
]

function Select({ label, value, options, onChange }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className="hidden xl:inline">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="rounded-lg border border-white/10 bg-void-900/70 px-2 py-1.5 text-xs text-slate-200 focus:border-violet-400/50 focus:outline-none">
        {options.map((o) => <option key={o} value={o} className="bg-void-900">{o}</option>)}
      </select>
    </label>
  )
}

function Swatch({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-6 w-6 rounded-md border border-white/15" style={{ background: color }} />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className="font-mono text-[11px] text-slate-200">{color}</p>
      </div>
    </div>
  )
}

function DesignPanel({ spec, onClose }) {
  const d = spec.uiDesign
  return (
    <motion.aside initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} className="glass-strong absolute bottom-3 right-3 top-3 z-20 flex w-[min(320px,calc(100%-1.5rem))] flex-col rounded-2xl">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="label-muted text-violet-300">Design direction</p>
          <h3 className="font-display text-base text-white">{d.style}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close design panel" className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm">
        {d.designReasoning && <p className="leading-relaxed text-slate-300">{d.designReasoning}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Swatch color={d.primaryColor} label="Primary" />
          <Swatch color={d.secondaryColor} label="Secondary" />
          <Swatch color={d.accentColor} label="Accent" />
          <Swatch color={d.backgroundColor} label="Background" />
          <Swatch color={d.surfaceColor} label="Surface" />
          <Swatch color={d.textColor} label="Text" />
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          {[['Theme', d.theme], ['Typography', d.fontStyle], ['Corners', d.borderRadius], ['Navigation', d.navigation], ['Density', d.density], ['Pages', spec.uiPages.length]].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wider text-slate-500">{k}</dt>
              <dd className="capitalize text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] text-slate-500">Generated {new Date(spec.generatedAt).toLocaleString()} · {spec.source === 'ai' ? 'AI model' : 'offline generator'} · variation {spec.variant + 1}</p>
      </div>
    </motion.aside>
  )
}

/**
 * The UI Preview workspace: page navigator, device frames, design system,
 * regenerate / variation / natural-language edits, and full-screen demo.
 */
export default function UiPreview({ galaxy, spec, busy, pageId, onPageChange, onRun, onViewArchitecture, locked, projectName }) {
  const [device, setDevice] = useState('desktop')
  const [style, setStyle] = useState('Auto')
  const [theme, setTheme] = useState('Auto')
  const [instruction, setInstruction] = useState('')
  const [designOpen, setDesignOpen] = useState(false)
  const [demo, setDemo] = useState(false)
  const current = spec?.uiPages.find((p) => p.id === pageId) ?? spec?.uiPages[0]

  useEffect(() => {
    if (!demo) return undefined
    const onKey = (e) => e.key === 'Escape' && setDemo(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [demo])

  if (!spec) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-4 pt-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong w-full max-w-lg rounded-3xl p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-400/20">
            <Wand2 className="h-6 w-6 text-violet-200" />
          </div>
          <h2 className="mt-4 font-display text-2xl text-white">Turn this galaxy into an app</h2>
          <p className="mt-2 text-sm text-slate-400">
            DevGalaxy designs a clickable prototype from {projectName}&rsquo;s {galaxy.architecture_data.pages.length} pages, {galaxy.architecture_data.database.tables.length} tables and {galaxy.architecture_data.userRoles.length} roles — with a design system chosen for your audience.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Select label="Style" value={style} options={UI_STYLES} onChange={setStyle} />
            <Select label="Theme" value={theme} options={UI_THEMES} onChange={setTheme} />
          </div>
          <button type="button" disabled={busy} onClick={() => onRun('generate', { style, theme })} className="btn-primary mt-6 w-full py-3 text-base disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? 'Designing your interface…' : 'Generate UI Preview'}
          </button>
          {locked.UI_GENERATION && <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-200/90"><Crown className="h-3.5 w-3.5" /> You&rsquo;ve used your free UI preview — upgrade to generate more.</p>}
        </motion.div>
      </div>
    )
  }

  const deviceSpec = DEVICES.find((x) => x.key === device)

  return (
    <div className="absolute inset-0 flex flex-col pt-[68px]">
      <div className="glass-strong pointer-events-auto mx-3 flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2 sm:mx-4">
        <div className="flex items-center rounded-lg border border-white/10 p-0.5" role="group" aria-label="Device preview">
          {DEVICES.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setDevice(key)} aria-pressed={device === key} title={label} className={`rounded-md px-2 py-1 text-xs transition ${device === key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <Select label="Style" value={style} options={UI_STYLES} onChange={setStyle} />
        <Select label="Theme" value={theme} options={UI_THEMES} onChange={setTheme} />
        <button type="button" disabled={busy} onClick={() => onRun('regenerate', { style, theme })} className="btn-ghost px-2.5 py-1.5 text-xs" title="Regenerate UI (keeps the architecture)">
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> <span className="hidden md:inline">Regenerate</span>{locked.UI_REGENERATION && <Crown className="h-3 w-3 text-amber-300" />}
        </button>
        <button type="button" disabled={busy} onClick={() => onRun('variation', { style, theme })} className="btn-ghost px-2.5 py-1.5 text-xs" title="Try a different design direction">
          <Shuffle className="h-3.5 w-3.5" /> <span className="hidden md:inline">Variation</span>{locked.DESIGN_VARIATION && <Crown className="h-3 w-3 text-amber-300" />}
        </button>
        <form className="flex min-w-[200px] flex-1 items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); if (instruction.trim()) onRun('customize', { instruction, pageId: current?.id }).then((ok) => ok && setInstruction('')) }}>
          <input value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={500} placeholder={`Describe a change — e.g. “make it dark and purple”, “use a table on ${current?.name ?? 'this page'}”`} aria-label="Customise UI" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-void-900/60 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none" />
          <button type="submit" disabled={busy || !instruction.trim()} className="btn-primary px-2.5 py-1.5 text-xs disabled:opacity-50"><Wand2 className="h-3.5 w-3.5" />{locked.AI_UI_CUSTOMIZATION && <Crown className="h-3 w-3 text-amber-200" />}</button>
        </form>
        <button type="button" onClick={() => setDesignOpen((v) => !v)} className="btn-ghost px-2.5 py-1.5 text-xs" aria-pressed={designOpen}><Palette className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Design</span></button>
        <button type="button" onClick={() => setDemo(true)} className="btn-primary px-3 py-1.5 text-xs"><Maximize2 className="h-3.5 w-3.5" /> Open Demo</button>
      </div>

      <div className="relative flex min-h-0 flex-1 gap-3 p-3 sm:p-4">
        <nav aria-label="Prototype pages" className="glass hidden w-52 shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl p-2 md:flex">
          <p className="label-muted px-2 pb-1 pt-1">Pages · {spec.uiPages.length}</p>
          {spec.uiPages.map((p) => (
            <button key={p.id} type="button" onClick={() => onPageChange(p.id)} className={`rounded-xl px-2.5 py-2 text-left transition ${p.id === current?.id ? 'bg-violet-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <p className="truncate text-xs font-medium">{p.name}</p>
              <p className="truncate font-mono text-[10px] text-slate-500">{p.route} · {p.layout}</p>
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 md:hidden">
            <select value={current?.id} onChange={(e) => onPageChange(e.target.value)} aria-label="Prototype page" className="flex-1 rounded-lg border border-white/10 bg-void-900/70 px-2 py-1.5 text-xs text-slate-200">
              {spec.uiPages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
            <p className="truncate"><span className="text-slate-200">{current?.name}</span> — {current?.purpose}</p>
            <button type="button" onClick={() => onViewArchitecture(current)} className="flex shrink-0 items-center gap-1 text-violet-300 hover:text-violet-200"><Orbit className="h-3.5 w-3.5" /> View in Architecture</button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-2xl border border-white/10 bg-black/30 p-2">
            <div className={`relative overflow-hidden shadow-2xl transition-all duration-300 ${device === 'desktop' ? 'h-full w-full rounded-xl' : 'rounded-[28px] border-[6px] border-slate-800'}`} style={device === 'desktop' ? undefined : { width: deviceSpec.width, height: deviceSpec.height, maxHeight: '100%', maxWidth: '100%' }}>
              <PrototypeFrame spec={spec} pageId={current?.id} onNavigate={onPageChange} device={device} />
              {busy && <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>}
            </div>
          </div>
        </div>
        <AnimatePresence>{designOpen && <DesignPanel spec={spec} onClose={() => setDesignOpen(false)} />}</AnimatePresence>
      </div>

      <AnimatePresence>
        {demo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black">
            <PrototypeFrame spec={spec} pageId={current?.id} onNavigate={onPageChange} device={typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'} />
            <button type="button" onClick={() => setDemo(false)} className="glass-strong fixed bottom-4 left-4 z-[61] flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs text-white shadow-lg hover:bg-white/10">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to DevGalaxy
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
