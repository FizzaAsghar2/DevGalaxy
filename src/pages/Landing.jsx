import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Boxes, Compass, Layers, Orbit, Rocket, Sparkles, Wand2 } from 'lucide-react'
import { useSession } from '../auth/AuthProvider'
import { useDeviceProfile } from '../hooks/useDeviceProfile'
import { supportsWebGL } from '../lib/webgl'
import HeroFallback from '../components/landing/HeroFallback'
import { EXAMPLES } from '../studio/examples'

const HeroScene = lazy(() => import('../components/landing/HeroScene'))

const FEATURES = [
  { icon: Wand2, title: 'Prompt to plan', body: 'Describe a website in plain words. Galaxy Studio writes a structured plan — pages, sections, palette, typography — that you can edit before anything is built.' },
  { icon: Layers, title: 'Design variations', body: 'Compare Minimal, Modern SaaS and Bold directions side by side, remix them, or combine colours from one with the layout of another.' },
  { icon: Compass, title: 'Live, sandboxed preview', body: 'Real React + Tailwind code is compiled and run in an isolated frame. Click through pages, try forms and switch desktop, tablet and mobile.' },
  { icon: Sparkles, title: 'Edit by chatting', body: '“Make the navbar sticky.” “Add testimonials below the pricing.” Every change becomes a version you can compare, restore or undo.' },
  { icon: Boxes, title: 'Real source code', body: 'Inspect every generated file with syntax highlighting, edit by hand, and download a clean React/Vite or Next.js project as a ZIP.' },
  { icon: Orbit, title: 'Architecture galaxy', body: 'Still here: map an app idea as an interactive 3D universe of pages, features, users, APIs and data.' },
]

const STEPS = [
  { icon: Wand2, title: 'Describe it', body: '“A premium perfume website with a black and gold theme.” One prompt is enough; everything else is optional.' },
  { icon: Layers, title: 'Pick a direction', body: 'Review the plan, then choose between design variations — or mix them.' },
  { icon: Rocket, title: 'Refine and export', body: 'Edit with chat or design controls, keep every version, and download the source code.' },
]

function useInViewOnce(margin = '-80px') {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || inView) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setInView(true),
      { rootMargin: margin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [inView, margin])

  return [ref, inView]
}

export default function Landing() {
  const navigate = useNavigate()
  const { isSignedIn, signUp } = useSession()
  const { tier, isMobile, reducedMotion } = useDeviceProfile()
  const prefersReduced = useReducedMotion()
  const [heroRef, heroInView] = useInViewOnce('0px')

  const use3D = supportsWebGL() && !reducedMotion && !isMobile
  const startCreating = () => (isSignedIn ? navigate('/studio/new') : signUp('/studio/new'))

  return (
    <div className="relative">
      {/* ---------------------------------------------------------------- hero */}
      <section ref={heroRef} className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden">
        {/* The galaxy owns the right half on wide screens, clipped so orbit labels never reach the copy. */}
        <div className="absolute inset-0 overflow-hidden lg:left-1/2">
          {use3D && heroInView ? (
            <Suspense fallback={<HeroFallback animate={!prefersReduced} />}>
              <HeroScene tier={tier} reducedMotion={Boolean(prefersReduced)} />
            </Suspense>
          ) : (
            <HeroFallback animate={!prefersReduced} />
          )}
        </div>
        <div className="grid-overlay pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void-900 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-void-900 via-void-900/70 to-transparent lg:w-1/2" />

        <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl lg:max-w-xl"
          >
            <span className="chip bg-white/[0.06]">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" /> Galaxy Studio · AI website design
            </span>

            <h1 className="mt-5 font-display text-4xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Your Ideas.
              <br />
              <span className="gradient-text">Beautiful Websites.</span>
              <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl">Powered by AI.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Describe a website and Galaxy Studio plans it, designs variations, builds real React code and lets you refine it in a live preview.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={startCreating} className="btn-primary px-6 py-3 text-base">
                Get Started <ArrowRight className="h-4 w-4" />
              </button>
              <a href="#examples" className="btn-ghost px-6 py-3 text-base">
                Explore Examples
              </a>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Mapping an app instead? <Link to="/galaxy/demo" className="text-cyan-300 hover:underline">Explore the architecture galaxy demo</Link>.
            </p>

            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-400">
              {[
                ['3', 'design directions'],
                ['2', 'export frameworks'],
                ['1', 'prompt to start'],
              ].map(([value, label]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <dt className="font-display text-xl text-white">{value}</dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ features */}
      <section id="features" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <p className="label-muted">Why DevGalaxy</p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl sm:text-4xl">
          A developer tool that thinks in <span className="gradient-text">systems</span>, not documents.
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={prefersReduced ? undefined : { y: -4 }}
              className="glass group rounded-2xl p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/25 to-cyan-400/10">
                <feature.icon className="h-5 w-5 text-violet-200" />
              </div>
              <h3 className="mt-4 font-display text-lg">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{feature.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- how it works */}
      {/* ------------------------------------------------------------- examples */}
      <section id="examples" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <p className="label-muted">Examples</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">Start from a prompt that works.</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">Each example is generated live by the offline demo planner — open the preview to click through it, or use the prompt as a starting point.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((example, index) => (
            <motion.article key={example.slug} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.45, delay: index * 0.05 }} className="glass flex flex-col rounded-2xl p-5">
              <span className="chip w-fit text-[11px]">{example.category}</span>
              <h3 className="mt-3 font-display text-lg text-white">{example.title}</h3>
              <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-400">{example.prompt}</p>
              <div className="mt-4 flex gap-2">
                <Link to={`/studio/examples/${example.slug}`} className="btn-ghost flex-1 px-3 py-2 text-xs">Preview</Link>
                <button type="button" onClick={() => (isSignedIn ? navigate(`/studio/new?example=${example.slug}`) : signUp(`/studio/new?example=${example.slug}`))} className="btn-primary flex-1 px-3 py-2 text-xs">Use prompt</button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="relative scroll-mt-20 border-y border-white/5 bg-void-800/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="label-muted">How it works</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">From one prompt to a working website.</h2>

          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="glass relative rounded-2xl p-6"
              >
                <span className="absolute right-5 top-4 font-display text-4xl text-white/5">0{index + 1}</span>
                <step.icon className="h-6 w-6 text-cyan-200" />
                <h3 className="mt-4 font-display text-lg">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{step.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------- closing */}
      <section className="relative mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[100px]" />
        <h2 className="relative font-display text-3xl sm:text-5xl">
          Ready to design your <span className="gradient-text">next website</span>?
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-slate-400">
          Describe it. Galaxy Studio plans, designs and builds it — then keeps every version while you refine it.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={startCreating} className="btn-primary px-6 py-3 text-base">
            Get Started <ArrowRight className="h-4 w-4" />
          </button>
          <Link to="/settings" className="btn-ghost px-6 py-3 text-base">
            Settings
          </Link>
          <a href="https://github.com/FizzaAsghar2/DevGalaxy/tree/main/docs" target="_blank" rel="noreferrer" className="btn-ghost px-6 py-3 text-base">
            Documentation
          </a>
        </div>
      </section>
    </div>
  )
}
