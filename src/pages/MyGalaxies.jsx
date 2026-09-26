import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search } from 'lucide-react'
import { useGalaxies } from '../hooks/useGalaxies'
import GalaxyCard from '../components/galaxy/GalaxyCard'
import Modal from '../components/ui/Modal'
import { EmptyState, ErrorState, SkeletonCard } from '../components/ui/States'

export default function MyGalaxies() {
  const { galaxies, loading, error, refresh, service } = useGalaxies()
  const [query, setQuery] = useState('')
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return galaxies
    return galaxies.filter(
      (galaxy) =>
        galaxy.project_name.toLowerCase().includes(needle) ||
        (galaxy.original_idea ?? '').toLowerCase().includes(needle),
    )
  }, [galaxies, query])

  async function confirmRename() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await service.rename(renaming.id, name.trim())
      toast.success('Galaxy renamed')
      setRenaming(null)
      await refresh()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await service.remove(deleting.id)
      toast.success('Galaxy deleted')
      setDeleting(null)
      await refresh()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-muted">Your universe</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">My Galaxies</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search galaxies…"
              aria-label="Search galaxies"
              className="input w-44 py-2 pl-9 text-sm sm:w-60"
            />
          </div>
          <Link to="/create" className="btn-primary px-4 py-2">
            <Plus className="h-4 w-4" /> New
          </Link>
        </div>
      </header>

      <div className="mt-8">
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
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? 'No matching galaxies' : 'Nothing in orbit yet'}
            message={query ? 'Try a different search term.' : 'Generate your first architecture to fill this space.'}
            action={
              !query && (
                <Link to="/create" className="btn-primary">
                  <Plus className="h-4 w-4" /> Create Your Galaxy
                </Link>
              )
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((galaxy) => (
              <GalaxyCard
                key={galaxy.id}
                galaxy={galaxy}
                onRename={(item) => {
                  setName(item.project_name)
                  setRenaming(item)
                }}
                onDelete={setDeleting}
              />
            ))}
          </div>
        )}
      </div>

      <Modal open={Boolean(renaming)} onClose={() => setRenaming(null)} title="Rename galaxy">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Galaxy name"
          className="input"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setRenaming(null)}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={confirmRename}>
            Save
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete galaxy">
        <p className="text-sm text-slate-400">
          “{deleting?.project_name}” and its architecture will be permanently removed.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setDeleting(null)}>
            Cancel
          </button>
          <button type="button" className="btn-danger" disabled={busy} onClick={confirmDelete}>
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}
