import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ImagePlus, Layers, Loader2, Shuffle, Sparkles, Wand2, X } from 'lucide-react'
import ModeBadge from '../../components/studio/ModeBadge'
import SpecEditor from '../../components/studio/SpecEditor'
import VariationCard from '../../components/studio/VariationCard'
import PreviewFrame from '../../components/studio/PreviewFrame'
import Modal from '../../components/ui/Modal'
import { CATEGORIES, FRAMEWORKS, applyDirection, clarifyingQuestions, combineVariations, validatePrompt } from '../../studio/core/spec'
import { MAX_ASSET_BYTES } from '../../studio/core/paths'
import { designVariations, planSite } from '../../studio/api'
import { composeFiles, readFileBase64, loadFontsInPage } from '../../studio/compose'
import { createProject, saveProject } from '../../studio/storage'
import { useStudioStatus, useStudioUser } from '../../studio/hooks'
import { EXAMPLES } from '../../studio/examples'

const STEPS = ['Describe', 'Review plan', 'Choose design']
const PLAN_STAGES = ['Reading your description…', 'Planning pages and sections…', 'Choosing colours and typography…', 'Writing the content…']

export default function NewProject() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { userId, getToken } = useStudioUser()
  const { status } = useStudioStatus()
  const example = EXAMPLES.find((e) => e.slug === params.get('example'))
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ prompt: example?.prompt ?? '', name: '', category: example?.category ?? 'Auto-detect', references: '', framework: 'react-vite', styling: 'tailwind', colors: '', fonts: '' })
  const [refs, setRefs] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [stage, setStage] = useState(0)
  const [spec, setSpec] = useState(null)
  const [source, setSource] = useState(null)
  const [variations, setVariations] = useState([])
  const [selected, setSelected] = useState(0)
  const [remixes, setRemixes] = useState(0)
  const [combine, setCombine] = useState({ open: false, colors: 0, type: 1, layout: 2 })
  const [preview, setPreview] = useState(null)
  const questions = useMemo(() => (form.prompt.length > 12 ? clarifyingQuestions(form.prompt) : []), [form.prompt])

  useEffect(() => {
    if (!busy) return undefined
    setStage(0)
    const t = setInterval(() => setStage((s) => Math.min(s + 1, PLAN_STAGES.length - 1)), 700)
    return () => clearInterval(t)
  }, [busy])
  useEffect(() => {
    if (variations.length) loadFontsInPage([...new Set(variations.flatMap((v) => [v.spec.typography.heading, v.spec.typography.body]))])
  }, [variations])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onRefs(e) {
    const picked = [...e.target.files].slice(0, 4 - refs.length)
    e.target.value = ''
    for (const file of picked) {
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { setError(`${file.name}: only PNG, JPG, WebP or GIF images.`); continue }
      if (file.size > MAX_ASSET_BYTES) { setError(`${file.name}: images must be under 2 MB.`); continue }
      const content = await readFileBase64(file)
      const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
      setRefs((r) => [...r, { path: `src/assets/reference-${r.length + 1}.${ext}`, content, encoding: 'base64', name: file.name, url: URL.createObjectURL(file) }])
    }
  }

  async function generatePlan() {
    const problem = validatePrompt(form.prompt)
    if (problem) return setError(problem)
    setError('')
    setBusy('plan')
    try {
      const options = { ...form, category: form.category === 'Auto-detect' ? undefined : form.category, name: form.name.trim() || undefined }
      const [r] = await Promise.all([planSite(form.prompt, options, getToken), new Promise((res) => setTimeout(res, 1400))])
      setSpec(r.spec)
      setSource(r)
      setStep(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function generateVariations() {
    setError('')
    setBusy('variations')
    try {
      const r = await designVariations(spec, getToken)
      setVariations(r.variations)
      setSelected(0)
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  function remix() {
    const n = remixes + 1
    setRemixes(n)
    const v = { summary: 'A fresh remix: new palette, type pairing and layout.', spec: applyDirection(spec, `remix-${n}`) }
    setVariations((list) => [...list, v])
    setSelected(variations.length)
  }

  function applyCombine() {
    const v = { summary: `Colours from ${label(combine.colors)}, typography from ${label(combine.type)}, layout from ${label(combine.layout)}.`, spec: combineVariations({ colors: variations[combine.colors].spec, type: variations[combine.type].spec, layout: variations[combine.layout].spec }) }
    setVariations((list) => [...list, v])
    setSelected(variations.length)
    setCombine((c) => ({ ...c, open: false }))
  }
  const label = (i) => variations[i]?.spec.style.direction || `Option ${i + 1}`

  async function createAndOpen() {
    const chosen = variations[selected]?.spec ?? spec
    const assets = refs.map(({ path, content, encoding }) => ({ path, content, encoding }))
    const project = createProject({ userId, spec: chosen, files: composeFiles(chosen, [], assets), summary: `Generated “${chosen.style.direction || 'initial'}” design`, source: source?.source === 'ai' ? 'ai' : 'offline', assets })
    project.versions[0].customFiles = []
    project.chat = [{ role: 'assistant', text: `I created ${chosen.name} with ${chosen.pages.length} pages (${chosen.pages.map((p) => p.name).join(', ')}). Ask me for changes, e.g. “make the navbar sticky” or “add testimonials below the cards”.`, at: new Date().toISOString() }]
    await saveProject(project)
    navigate(`/studio/${project.id}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-muted text-xs">Galaxy Studio · New project</p>
          <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">{['Describe your website', 'Review the plan', 'Pick a design direction'][step]}</h1>
        </div>
        <ModeBadge status={status} />
      </div>

      <ol className="mt-6 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex-1 rounded-full px-3 py-1.5 text-center text-xs transition ${i === step ? 'bg-violet-500/30 text-white' : i < step ? 'bg-cyan-400/15 text-cyan-100' : 'bg-white/[0.04] text-slate-500'}`} aria-current={i === step ? 'step' : undefined}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {error && (
        <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
          <button type="button" aria-label="Dismiss" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="describe" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="glass-strong rounded-2xl p-5">
              <label htmlFor="prompt" className="label-muted text-xs">What should we build?</label>
              <textarea id="prompt" value={form.prompt} onChange={set('prompt')} rows={8} maxLength={2000}
                placeholder="e.g. Build a premium perfume website with a black and gold theme, elegant typography, product cards, testimonials and a responsive navigation bar."
                className="input mt-2 w-full resize-y text-base leading-relaxed" />
              <div className="mt-1 flex justify-between text-xs text-slate-500"><span>Only the description is required.</span><span>{form.prompt.length}/2000</span></div>
              {questions.length > 0 && (
                <div className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-400/5 p-3 text-xs text-cyan-100">
                  <p className="font-medium">Optional — the result improves if you mention:</p>
                  <ul className="mt-1 list-disc pl-4">{questions.map((q) => <li key={q}>{q}</li>)}</ul>
                </div>
              )}
              <p className="mt-4 text-xs text-slate-400">Or start from an example:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLES.map((e) => (
                  <button key={e.slug} type="button" className="chip hover:bg-white/10" onClick={() => setForm((f) => ({ ...f, prompt: e.prompt, category: e.category }))}>{e.title}</button>
                ))}
              </div>
              <button type="button" onClick={generatePlan} disabled={Boolean(busy)} className="btn-primary mt-6 w-full justify-center py-3 text-base">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {PLAN_STAGES[stage]}</> : <><Sparkles className="h-4 w-4" /> Generate plan</>}
              </button>
            </div>
            <div className="glass space-y-3 rounded-2xl p-5">
              <label className="block text-xs"><span className="label-muted">Project name (optional)</span><input className="input mt-1 w-full" value={form.name} onChange={set('name')} maxLength={40} placeholder="Detected from the description" /></label>
              <label className="block text-xs"><span className="label-muted">Category</span>
                <select className="input mt-1 w-full" value={form.category} onChange={set('category')}><option>Auto-detect</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs"><span className="label-muted">Framework</span>
                  <select className="input mt-1 w-full" value={form.framework} onChange={set('framework')}>{Object.entries(FRAMEWORKS).map(([k, v]) => <option key={k} value={k}>{v.split(' (')[0].replace(' + TypeScript', '')}</option>)}</select>
                </label>
                <label className="block text-xs"><span className="label-muted">Styling</span>
                  <select className="input mt-1 w-full" value={form.styling} onChange={set('styling')}><option value="tailwind">Tailwind CSS</option></select>
                </label>
              </div>
              <label className="block text-xs"><span className="label-muted">Colours</span><input className="input mt-1 w-full" value={form.colors} onChange={set('colors')} placeholder="e.g. emerald and cream, #0f766e" /></label>
              <label className="block text-xs"><span className="label-muted">Fonts</span><input className="input mt-1 w-full" value={form.fonts} onChange={set('fonts')} placeholder="e.g. elegant serif, modern sans" /></label>
              <label className="block text-xs"><span className="label-muted">Design references</span><textarea className="input mt-1 w-full" rows={2} value={form.references} onChange={set('references')} maxLength={400} placeholder="Sites or styles you like" /></label>
              <div>
                <span className="label-muted text-xs">Reference images</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {refs.map((r, i) => (
                    <div key={r.path} className="relative">
                      <img src={r.url} alt={r.name} className="h-14 w-14 rounded-lg object-cover" />
                      <button type="button" aria-label={`Remove ${r.name}`} className="absolute -right-1 -top-1 rounded-full bg-void-900 p-0.5" onClick={() => setRefs((list) => list.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {refs.length < 4 && (
                    <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/20 text-slate-400 hover:text-white">
                      <ImagePlus className="h-5 w-5" /><span className="sr-only">Upload reference image</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={onRefs} />
                    </label>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Saved with the project as assets. The planner does not analyse images yet.</p>
              </div>
            </div>
          </motion.div>
        )}

        {step === 1 && spec && (
          <motion.div key="plan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-6">
            {source?.source === 'offline' && (
              <p className="mb-4 rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-2 text-xs text-amber-100">Planned offline (demo planner): {source.reason} Content is generated from your description by built-in rules, not by an AI model.</p>
            )}
            <div className="glass-strong rounded-2xl p-5"><SpecEditor spec={spec} onChange={setSpec} /></div>
            <div className="mt-5 flex flex-wrap justify-between gap-3">
              <button type="button" className="btn-ghost" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4" /> Back</button>
              <button type="button" className="btn-primary" disabled={Boolean(busy)} onClick={generateVariations}>
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Designing directions…</> : <><Layers className="h-4 w-4" /> Create design variations</>}
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="vars" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {variations.map((v, i) => (
                <VariationCard key={i} variation={v} selected={i === selected} onSelect={() => setSelected(i)} onPreview={() => setPreview(v)} />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back</button>
                <button type="button" className="btn-ghost" onClick={remix} disabled={variations.length >= 9}><Shuffle className="h-4 w-4" /> Another variation</button>
                <button type="button" className="btn-ghost" onClick={() => setCombine((c) => ({ ...c, open: true }))} disabled={variations.length < 2}><Wand2 className="h-4 w-4" /> Combine ideas</button>
              </div>
              <button type="button" className="btn-primary" onClick={createAndOpen}>Generate website <ArrowRight className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={combine.open} title="Combine ideas" description="Mix parts of different directions into a new one." onClose={() => setCombine((c) => ({ ...c, open: false }))}
        footer={<button type="button" className="btn-primary" onClick={applyCombine}>Create combined direction</button>}>
        <div className="space-y-3">
          {[['colors', 'Colours from'], ['type', 'Typography from'], ['layout', 'Layout & components from']].map(([k, l]) => (
            <label key={k} className="block text-xs"><span className="label-muted">{l}</span>
              <select className="input mt-1 w-full" value={combine[k]} onChange={(e) => setCombine((c) => ({ ...c, [k]: Number(e.target.value) }))}>
                {variations.map((_, i) => <option key={i} value={i}>{label(i)}</option>)}
              </select>
            </label>
          ))}
        </div>
      </Modal>

      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-void-900/95 p-3 backdrop-blur" role="dialog" aria-modal="true" aria-label="Design preview">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-white">{preview.spec.style.direction} — live preview</p>
            <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setPreview(null)}><X className="h-4 w-4" /> Close</button>
          </div>
          <div className="min-h-0 flex-1">
            <PreviewFrame files={composeFiles(preview.spec)} fonts={[preview.spec.typography.heading, preview.spec.typography.body]} getToken={getToken} />
          </div>
        </div>
      )}
    </div>
  )
}
