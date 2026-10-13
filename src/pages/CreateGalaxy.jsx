import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Sparkles, Wand2 } from 'lucide-react'
import { useSession } from '../auth/AuthProvider'
import { useGalaxyService } from '../hooks/useGalaxies'
import { useDeviceProfile } from '../hooks/useDeviceProfile'
import { generateArchitecture } from '../services/aiService'
import { useAccount } from '../account/AccountProvider'
import PlanBadge from '../components/ui/PlanBadge'
import GenerationSequence from '../components/galaxy/GenerationSequence'

const APP_TYPES = ['Web app', 'Mobile app', 'SaaS platform', 'Marketplace', 'Internal tool', 'API service']
const COMPLEXITIES = [
  { key: 'simple', label: 'Simple', hint: 'MVP · core flows only' },
  { key: 'medium', label: 'Medium', hint: 'Production-ready scope' },
  { key: 'complex', label: 'Complex', hint: 'Multi-role, integrations' },
]

const EXAMPLES = [
  'An online learning platform where instructors publish courses and students track progress',
  'A food delivery app connecting restaurants, customers and riders in real time',
  'A telehealth platform for booking doctor appointments and storing medical records',
  'A B2B analytics SaaS with workspaces, dashboards and billing',
]

export default function CreateGalaxy() {
  const navigate = useNavigate()
  const service = useGalaxyService()
  const { getToken } = useSession()
  const { reducedMotion } = useDeviceProfile()
  const accountApi = useAccount()

  const [idea, setIdea] = useState('')
  const [appType, setAppType] = useState(APP_TYPES[0])
  const [complexity, setComplexity] = useState('medium')
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [ready, setReady] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = idea.trim()
    if (trimmed.length < 15) {
      setError('Describe your idea in at least 15 characters so the architecture has something to work with.')
      return
    }
    if (trimmed.length > 1000) {
      setError('Please keep the idea under 1000 characters.')
      return
    }

    if (!accountApi.ensure('GALAXY_GENERATION')) return

    setError(null)
    setGenerating(true)
    setReady(null)

    try {
      const { architecture, source, galaxy } = await generateArchitecture({ idea: trimmed, appType, complexity, getToken })
      if (source === 'demo') {
        toast('Generated offline — add an AI key to use the model.', { icon: '✦' })
      }
      // Managed mode: the server already saved the galaxy alongside its usage event.
      const saved =
        galaxy ??
        (await service.create({
          projectName: architecture.projectName,
          idea: trimmed,
          description: architecture.description,
          appType,
          complexity,
          architecture,
        }))
      if (accountApi.account?.mode === 'demo') accountApi.recordDemoUsage('GALAXY_GENERATION')
      else accountApi.refresh()
      setReady(saved.id)
    } catch (err) {
      setGenerating(false)
      if (err.code === 'upgrade_required') {
        accountApi.refresh()
        accountApi.showUpgrade('GALAXY_GENERATION')
        return
      }
      setError(err.message)
      toast.error(err.message)
    }
  }

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/15 blur-[110px]" />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="chip bg-white/[0.06]">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" /> New galaxy
          </span>
          <PlanBadge />
        </div>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl">Describe the app you want to build.</h1>
        <p className="mt-2 text-slate-400">
          DevGalaxy turns your idea into pages, features, user roles, a database schema, APIs and a recommended stack.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="glass mt-8 space-y-6 rounded-2xl p-5 sm:p-6">
        <div>
          <label htmlFor="idea" className="label-muted">
            Your idea
          </label>
          <textarea
            id="idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            rows={5}
            placeholder="I want to create an online learning platform where instructors publish courses and students track their progress…"
            className="input mt-2 resize-y"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Be specific about who uses it and what they do.</span>
            <span>{idea.trim().length}/1000</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setIdea(example)}
                className="chip text-left text-[11px] transition hover:border-white/25 hover:text-white"
              >
                {example.slice(0, 44)}…
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="app-type" className="label-muted">
              Application type
            </label>
            <select
              id="app-type"
              value={appType}
              onChange={(event) => setAppType(event.target.value)}
              className="input mt-2"
            >
              {APP_TYPES.map((type) => (
                <option key={type} value={type} className="bg-void-900">
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="label-muted">Complexity</span>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {COMPLEXITIES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setComplexity(option.key)}
                  title={option.hint}
                  className={`rounded-xl border px-2 py-2 text-xs transition ${
                    complexity === option.key
                      ? 'border-violet-400/60 bg-violet-500/15 text-white'
                      : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <button type="submit" disabled={generating} className="btn-primary w-full py-3 text-base disabled:opacity-60">
          <Wand2 className="h-4 w-4" /> Generate Galaxy
        </button>
      </form>

      <GenerationSequence
        active={generating}
        done={Boolean(ready)}
        reducedMotion={reducedMotion}
        onFinished={() => navigate(`/galaxy/${ready}`)}
      />
    </div>
  )
}
