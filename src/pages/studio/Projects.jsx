import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Copy, Download, Eye, HardDrive, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { EmptyState, LoadingState } from '../../components/ui/States'
import { currentVersion, deleteProject, duplicateProject, listProjects, saveProject } from '../../studio/storage'
import { downloadProjectZip } from '../../studio/download'
import { useStudioUser } from '../../studio/hooks'
import { FONT_STACKS, RADII } from '../../studio/core/tokens'
import { CATEGORIES } from '../../studio/core/spec'

const SORTS = { updated: 'Last edited', created: 'Created', name: 'Name' }

function Thumb({ spec }) {
  const p = spec.palette
  const hero = spec.pages[0]?.sections.find((s) => s.type === 'hero')
  return (
    <div className="aspect-[16/10] overflow-hidden p-3" style={{ background: p.background, color: p.text, fontFamily: FONT_STACKS[spec.typography.body] }} aria-hidden="true">
      <div className="flex justify-between text-[8px]" style={{ color: p.muted }}><span style={{ color: p.text }}>{spec.name}</span><span>{spec.pages.slice(0, 3).map((x) => x.name).join('  ')}</span></div>
      <p className="mt-3 line-clamp-2 text-sm leading-tight" style={{ fontFamily: FONT_STACKS[spec.typography.heading] }}>{hero?.title ?? spec.name}</p>
      <span className="mt-2 inline-block h-3 w-12" style={{ background: p.primary, borderRadius: RADII[spec.layout.radius] }} />
      <div className="mt-2 grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className="h-6" style={{ background: p.surface, borderRadius: RADII[spec.layout.radius] }} />)}</div>
    </div>
  )
}

/** All Galaxy Studio projects for the current user, stored in this browser. */
export default function Projects() {
  const { userId } = useStudioUser()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('updated')
  const [category, setCategory] = useState('All')
  const [framework, setFramework] = useState('All')
  const [favOnly, setFavOnly] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = () => listProjects(userId).then(setProjects, (e) => setError(e.message || 'Could not open browser storage.'))
  useEffect(() => { load() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    if (!projects) return []
    const q = query.trim().toLowerCase()
    return projects
      .filter((p) => (!q || p.name.toLowerCase().includes(q) || p.prompt.toLowerCase().includes(q)) && (category === 'All' || p.category === category) && (framework === 'All' || p.framework === framework) && (!favOnly || p.favorite))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)))
  }, [projects, query, sort, category, framework, favOnly])
  const recent = projects?.slice(0, 3) ?? []

  async function update(p) {
    await saveProject(p)
    load()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-muted text-xs">Galaxy Studio</p>
          <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">Projects</h1>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-200/90"><HardDrive className="h-3.5 w-3.5" /> Stored in this browser only (IndexedDB) for {userId === 'guest' ? 'guest use' : 'your account'} — not synced to a server.</p>
        </div>
        <Link to="/studio/new" className="btn-primary"><Plus className="h-4 w-4" /> New project</Link>
      </div>

      {recent.length > 0 && !query && (
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-400">
          Recent:
          {recent.map((p) => <Link key={p.id} to={`/studio/${p.id}`} className="chip hover:bg-white/10">{p.name}</Link>)}
        </div>
      )}

      <div className="glass mt-6 flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <label className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="input py-2 pl-9" />
        </label>
        <select aria-label="Category" className="input w-auto py-2" value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select aria-label="Framework" className="input w-auto py-2" value={framework} onChange={(e) => setFramework(e.target.value)}><option value="All">All frameworks</option><option value="react-vite">React + Vite</option><option value="nextjs">Next.js</option></select>
        <select aria-label="Sort by" className="input w-auto py-2" value={sort} onChange={(e) => setSort(e.target.value)}>{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button type="button" aria-pressed={favOnly} onClick={() => setFavOnly((f) => !f)} className={`btn-ghost py-2 ${favOnly ? 'border-amber-300/40 text-amber-200' : ''}`}><Star className={`h-4 w-4 ${favOnly ? 'fill-amber-300 text-amber-300' : ''}`} /> Favourites</button>
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
      {!projects && !error && <div className="mt-16"><LoadingState label="Loading projects…" /></div>}
      {projects && !projects.length && (
        <div className="mt-12"><EmptyState title="No projects yet" message="Describe a website and Galaxy Studio will plan, design and build it." action={<Link to="/studio/new" className="btn-primary"><Plus className="h-4 w-4" /> Create your first website</Link>} /></div>
      )}
      {projects && projects.length > 0 && !shown.length && <p className="mt-12 text-center text-sm text-slate-400">No projects match these filters.</p>}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p, i) => {
          const v = currentVersion(p)
          return (
            <motion.article key={p.id} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} whileHover={reduce ? undefined : { y: -4 }}
              className="glass group overflow-hidden rounded-2xl">
              <Link to={`/studio/${p.id}`} className="relative block" aria-label={`Open ${p.name}`}>
                <Thumb spec={v.spec} />
                <span className="absolute right-2 top-2 chip bg-black/50 text-[10px]">v{p.versions.indexOf(v) + 1}</span>
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-white">{p.name}</h2>
                    <p className="text-[11px] text-slate-500">{p.category} · {p.framework === 'nextjs' ? 'Next.js' : 'React + Vite'}</p>
                  </div>
                  <button type="button" aria-label={p.favorite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={p.favorite} onClick={() => update({ ...p, favorite: !p.favorite })} className="rounded-lg p-1.5 text-slate-400 hover:text-amber-200">
                    <Star className={`h-4 w-4 ${p.favorite ? 'fill-amber-300 text-amber-300' : ''}`} />
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Created {new Date(p.createdAt).toLocaleDateString()} · Edited {new Date(p.updatedAt).toLocaleString()}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => navigate(`/studio/${p.id}`)}><Pencil className="h-3 w-3" /> Edit</button>
                  <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => navigate(`/studio/${p.id}/preview`)}><Eye className="h-3 w-3" /> Preview</button>
                  <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => update(duplicateProject(p))}><Copy className="h-3 w-3" /> Duplicate</button>
                  <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => downloadProjectZip(p.name, v.files)}><Download className="h-3 w-3" /> ZIP</button>
                  <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => setRenaming(p)}>Rename</button>
                  <button type="button" className="btn-danger px-2 py-1 text-[11px]" onClick={() => setDeleting(p)}><Trash2 className="h-3 w-3" /> Delete</button>
                </div>
              </div>
            </motion.article>
          )
        })}
      </div>

      <Modal open={Boolean(renaming)} title="Rename project" onClose={() => setRenaming(null)}
        footer={<button type="submit" form="rename-form" className="btn-primary">Save</button>}>
        {renaming && (
          <form id="rename-form" onSubmit={(e) => { e.preventDefault(); const name = new FormData(e.currentTarget).get('name').toString().trim().slice(0, 40); if (name) update({ ...renaming, name }); setRenaming(null) }}>
            <input name="name" defaultValue={renaming.name} maxLength={40} autoFocus className="input" aria-label="Project name" />
            <p className="mt-2 text-[11px] text-slate-500">Changes the project's display name. The site name inside the website can be changed in the editor.</p>
          </form>
        )}
      </Modal>
      <Modal open={Boolean(deleting)} title="Delete project?" description={deleting ? `“${deleting.name}” and all ${deleting.versions.length} versions will be removed from this browser. This cannot be undone.` : ''} onClose={() => setDeleting(null)}
        footer={<><button type="button" className="btn-ghost" onClick={() => setDeleting(null)}>Cancel</button><button type="button" className="btn-danger" onClick={async () => { await deleteProject(userId, deleting.id); setDeleting(null); load() }}>Delete</button></>} />
    </div>
  )
}
