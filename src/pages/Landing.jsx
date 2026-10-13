import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Boxes, Compass, Database, Layers, Orbit, Rocket, ShieldCheck, Sparkles, Wand2 } from 'lucide-react'
import { useSession } from '../auth/AuthProvider'
import { useDeviceProfile } from '../hooks/useDeviceProfile'
import { supportsWebGL } from '../lib/webgl'
import HeroFallback from '../components/landing/HeroFallback'

const HeroScene = lazy(() => import('../components/landing/HeroScene'))

const FEATURES = [
  {
    icon: Orbit,
    title: 'Architecture as a galaxy',
    body: 'Your project sits at the core with pages, features, users, APIs and data orbiting around it — one glance, whole system.',
  },
  {
    icon: Database,
    title: 'Real schema, not a sketch',
    body: 'Tables, fields and relationships are generated as structured JSON you can actually build against.',
  },
  {
    icon: Layers,
    title: 'Three zoom levels',
    body: 'Fly from the full galaxy, into a category, down to a single table — and back out with one click.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by construction',
    body: 'AI keys stay on the server, and every galaxy is owned by its creator through row level security.',
  },
  {
    icon: Boxes,
    title: 'Stack recommendations',
    body: 'Frontend, backend, database and integrations picked to match the idea you described.',
  },
  {
    icon: Compass,
    title: 'Presentation mode',
    body: 'Hide the UI, orbit the camera and walk an audience through your architecture at a meetup.',
  },
]

const STEPS = [
  {
    icon: Wand2,
    title: 'Describe your idea',
    body: '“I want to create an online learning platform.” One sentence is enough.',
  },
  {
    icon: Sparkles,
    title: 'AI designs the architecture',
    body: 'Pages, features, roles, database tables, APIs, frontend and backend — returned as validated JSON.',
  },
  {
    icon: Rocket,
    title: 'Explore your galaxy',
    body: 'The architecture becomes an interactive universe you can fly through, expand and present.',
  },
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
  const startCreating = () => (isSignedIn ? navigate('/create') : signUp('/create'))

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
              <Sparkles className="h-3.5 w-3.5 text-violet-300" /> AI software architecture, visualised
            </span>

            <h1 className="mt-5 font-display text-4xl leading-[1.05] sm:text-6xl lg:text-7xl">
              See Your App
              <br />
              <span className="gradient-text">Before You Build It.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Transform an idea into an interactive universe of pages, features, users, APIs and data.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={startCreating} className="btn-primary px-6 py-3 text-base">
                Create Your Galaxy <ArrowRight className="h-4 w-4" />
              </button>
              <Link to="/galaxy/demo" className="btn-ghost px-6 py-3 text-base">
                Explore Demo
              </Link>
            </div>

            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-400">
              {[
                ['7', 'architecture categories'],
                ['3', 'zoom levels'],
                ['1', 'sentence to start'],
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
      <section id="how-it-works" className="relative scroll-mt-20 border-y border-white/5 bg-void-800/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="label-muted">How it works</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">From one sentence to a whole universe.</h2>

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
          Ready to map your <span className="gradient-text">next product</span>?
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-slate-400">
          Describe the idea. DevGalaxy designs the architecture, saves it to your account and lets you explore it in
          three dimensions.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={startCreating} className="btn-primary px-6 py-3 text-base">
            Create Your Galaxy <ArrowRight className="h-4 w-4" />
          </button>
          <Link to="/galaxy/demo" className="btn-ghost px-6 py-3 text-base">
            Explore Demo
          </Link>
        </div>
      </section>
    </div>
  )
}
