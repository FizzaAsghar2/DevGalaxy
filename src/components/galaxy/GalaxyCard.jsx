import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Clock, MoreHorizontal, Trash2, Pencil } from 'lucide-react'
import { CATEGORIES } from '../../lib/categories'
import { architectureStats } from '../../services/architectureSchema'

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/** CSS-only orbital preview — cheap enough to render dozens of times in a grid. */
function OrbPreview({ seed, animate }) {
  return (
    <div className="relative h-28 overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_50%_60%,rgba(139,92,246,0.22),rgba(4,6,15,0.9))]">
      <div
        className={`absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-200 via-violet-500 to-indigo-700 ${
          animate ? 'animate-pulse-glow' : ''
        }`}
      />
      {CATEGORIES.map((category, index) => {
        const angle = ((index + seed) / CATEGORIES.length) * Math.PI * 2
        const x = 50 + Math.cos(angle) * 32
        const y = 50 + Math.sin(angle) * 26
        return (
          <span
            key={category.key}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              background: category.color,
              boxShadow: `0 0 10px -1px ${category.color}`,
            }}
          />
        )
      })}
      <div className="absolute inset-[18%] rounded-full border border-white/5" />
    </div>
  )
}

export default function GalaxyCard({ galaxy, onRename, onDelete }) {
  const prefersReduced = useReducedMotion()
  const cardRef = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [menuOpen, setMenuOpen] = useState(false)

  const architecture = galaxy.architecture_data
  const stats = architectureStats(architecture)
  const stack = [architecture.frontend?.[0], architecture.backend?.[0], architecture.database?.type]
    .filter(Boolean)
    .slice(0, 3)

  const handleMove = (event) => {
    if (prefersReduced || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: -py * 6, y: px * 8 })
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      style={{ transformPerspective: 900 }}
      className="glass group relative rounded-2xl p-4 transition hover:border-white/20"
    >
      <Link to={`/galaxy/${galaxy.id}`} className="block">
        <OrbPreview seed={galaxy.id.charCodeAt(0) % 7} animate={!prefersReduced} />

        <h3 className="mt-3 truncate font-display text-lg text-white">{galaxy.project_name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
          {architecture.description || galaxy.original_idea}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {stack.map((item) => (
            <span key={item} className="chip text-[10px]">
              {item}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>{stats.nodes} nodes</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {timeAgo(galaxy.updated_at ?? galaxy.created_at)}
          </span>
        </div>
      </Link>

      {(onRename || onDelete) && (
        <div className="absolute right-3 top-3">
          <button
            type="button"
            aria-label="Galaxy actions"
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-lg border border-white/10 bg-void-900/70 p-1.5 text-slate-400 opacity-0 transition hover:text-white focus:opacity-100 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="glass-strong absolute right-0 top-9 z-20 w-36 rounded-xl p-1">
              {onRename && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onRename(galaxy)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-200 hover:bg-white/10"
                >
                  <Pencil className="h-3.5 w-3.5" /> Rename
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(galaxy)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
