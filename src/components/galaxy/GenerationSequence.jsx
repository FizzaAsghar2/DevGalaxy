import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

export const GENERATION_STAGES = [
  'Analyzing your idea',
  'Discovering features',
  'Mapping users',
  'Designing database',
  'Connecting APIs',
  'Creating your universe',
]

/** 2D particle swarm that collapses into a core — cheap everywhere, no WebGL needed. */
function ParticleForge({ reducedMotion }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (reducedMotion) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = 260
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const particles = Array.from({ length: 90 }, () => {
      const angle = Math.random() * Math.PI * 2
      const radius = 60 + Math.random() * 60
      return {
        angle,
        radius,
        baseRadius: radius,
        speed: 0.004 + Math.random() * 0.01,
        hue: 250 + Math.random() * 60,
        size: 0.8 + Math.random() * 1.6,
      }
    })

    let frame
    let t = 0
    const render = () => {
      t += 1
      ctx.clearRect(0, 0, size, size)
      const pull = Math.min(1, t / 420)

      for (const particle of particles) {
        particle.angle += particle.speed
        const radius = particle.baseRadius * (1 - pull * 0.55) + Math.sin(t * 0.02 + particle.angle) * 3
        const x = size / 2 + Math.cos(particle.angle) * radius
        const y = size / 2 + Math.sin(particle.angle) * radius * 0.62

        ctx.beginPath()
        ctx.fillStyle = `hsla(${particle.hue}, 90%, 72%, ${0.25 + pull * 0.5})`
        ctx.arc(x, y, particle.size, 0, Math.PI * 2)
        ctx.fill()
      }

      const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, 60 + pull * 24)
      glow.addColorStop(0, `rgba(196,181,253,${0.35 + pull * 0.45})`)
      glow.addColorStop(0.5, 'rgba(139,92,246,0.22)')
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, size, size)

      frame = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion])

  if (reducedMotion) {
    return <div className="h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/60 to-cyan-400/30 blur-xl" />
  }

  return <canvas ref={canvasRef} style={{ width: 260, height: 260 }} aria-hidden="true" />
}

/**
 * Cinematic generation overlay. Stages advance on a timer but the final stage
 * stays active until the real request resolves, so it never lies about progress.
 */
export default function GenerationSequence({ active, done, reducedMotion = false, onFinished }) {
  const [stage, setStage] = useState(0)
  const startedAt = useRef(0)
  const stageMs = reducedMotion ? 200 : 620

  useEffect(() => {
    if (!active) {
      setStage(0)
      return undefined
    }
    startedAt.current = Date.now()
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, GENERATION_STAGES.length - 1))
    }, stageMs)
    return () => clearInterval(timer)
  }, [active, stageMs])

  useEffect(() => {
    if (!active || !done) return undefined
    // Offline generation resolves instantly; hold the overlay long enough for
    // every stage to actually be read before flying into the galaxy.
    const minimum = stageMs * GENERATION_STAGES.length
    const elapsed = Date.now() - startedAt.current
    const settle = reducedMotion ? 120 : 700
    const timer = setTimeout(() => {
      setStage(GENERATION_STAGES.length - 1)
      onFinished?.()
    }, Math.max(settle, minimum - elapsed))
    return () => clearTimeout(timer)
  }, [active, done, onFinished, reducedMotion, stageMs])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void-900/95 px-6 backdrop-blur-xl"
          role="status"
          aria-live="polite"
        >
          <div className="grid-overlay pointer-events-none absolute inset-0 opacity-60" />
          <ParticleForge reducedMotion={reducedMotion} />

          <h2 className="mt-6 font-display text-2xl text-white sm:text-3xl">Assembling your universe</h2>

          <ul className="mt-6 w-full max-w-sm space-y-2">
            {GENERATION_STAGES.map((label, index) => {
              const state = index < stage ? 'done' : index === stage ? 'active' : 'pending'
              return (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: state === 'pending' ? 0.35 : 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                >
                  {state === 'done' ? (
                    <Check className="h-4 w-4 text-emerald-300" />
                  ) : state === 'active' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                  ) : (
                    <span className="h-4 w-4 text-center text-xs text-slate-600">✦</span>
                  )}
                  <span className={state === 'active' ? 'text-white' : 'text-slate-300'}>✦ {label}...</span>
                </motion.li>
              )
            })}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
