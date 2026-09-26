import { CATEGORIES } from '../../lib/categories'

/** Pure-CSS galaxy: shown on reduced-motion, low-end devices and without WebGL. */
export default function HeroFallback({ animate = false }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
      <div className="relative h-[min(78vw,430px)] w-[min(78vw,430px)]">
        <div className="absolute inset-[12%] rounded-full border border-violet-400/15" />
        <div className="absolute inset-[26%] rounded-full border border-cyan-300/10" />

        <div
          className={`absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-200 via-violet-500 to-indigo-700 shadow-glow ${
            animate ? 'animate-pulse-glow' : ''
          }`}
        />
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/25 blur-3xl" />

        {CATEGORIES.map((category, index) => {
          const angle = (index / CATEGORIES.length) * Math.PI * 2
          const radius = 42
          const x = 50 + Math.cos(angle) * radius
          const y = 50 + Math.sin(angle) * radius * 0.82
          return (
            <div
              key={category.key}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div
                className="mx-auto h-9 w-9 rounded-full"
                style={{
                  background: `radial-gradient(circle at 32% 28%, ${category.color}, ${category.color}22 70%)`,
                  boxShadow: `0 0 22px -4px ${category.color}`,
                }}
              />
              <span className="mt-1 block whitespace-nowrap text-[10px] text-slate-300">
                {category.glyph} {category.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
