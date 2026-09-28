import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Database, Layers, Orbit, Plus, Sparkles } from 'lucide-react'
import { useSession } from '../auth/AuthProvider'
import { useGalaxies } from '../hooks/useGalaxies'
import { architectureStats } from '../services/architectureSchema'
import GalaxyCard from '../components/galaxy/GalaxyCard'
import { EmptyState, ErrorState, SkeletonCard } from '../components/ui/States'
import UsagePanel from '../components/ui/UsagePanel'

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="glass rounded-2xl px-4 py-4">
      <Icon className="h-4 w-4 text-violet-300" />
      <p className="mt-3 font-display text-2xl text-white">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useSession()
  const { galaxies, loading, error, refresh } = useGalaxies()

  const totals = galaxies.reduce(
    (acc, galaxy) => {
      const stats = architectureStats(galaxy.architecture_data)
      acc.nodes += stats.nodes
      acc.tables += stats.tables
      acc.features += stats.features
      return acc
    },
    { nodes: 0, tables: 0, features: 0 },
  )

  const firstName = (user?.firstName || user?.fullName || user?.name || user?.email || 'explorer').split(' ')[0]

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-600/12 blur-[110px]" />

      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="label-muted">Mission control</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">
            Welcome back, <span className="gradient-text">{firstName}</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {galaxies.length === 0
              ? 'Your universe is empty. Generate your first architecture.'
              : `You have ${galaxies.length} ${galaxies.length === 1 ? 'galaxy' : 'galaxies'} in orbit.`}
          </p>
        </div>
        <Link to="/create" className="btn-primary px-5 py-2.5">
          <Plus className="h-4 w-4" /> New Galaxy
        </Link>
      </motion.header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Orbit} label="Galaxies" value={galaxies.length} />
        <StatTile icon={Sparkles} label="Total nodes" value={totals.nodes} />
        <StatTile icon={Database} label="Tables designed" value={totals.tables} />
        <StatTile icon={Layers} label="Features mapped" value={totals.features} />
      </div>

      <UsagePanel />

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Recent galaxies</h2>
          {galaxies.length > 0 && (
            <Link to="/galaxies" className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : error ? (
            <ErrorState
              message={error}
              action={
                <button type="button" className="btn-ghost" onClick={refresh}>
                  Try again
                </button>
              }
            />
          ) : galaxies.length === 0 ? (
            <EmptyState
              title="No galaxies yet"
              message="Describe an app idea and DevGalaxy will map its entire architecture."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link to="/create" className="btn-primary">
                    <Plus className="h-4 w-4" /> Create Your Galaxy
                  </Link>
                  <Link to="/galaxy/demo" className="btn-ghost">
                    Explore Demo
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galaxies.slice(0, 6).map((galaxy) => (
                <GalaxyCard key={galaxy.id} galaxy={galaxy} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
