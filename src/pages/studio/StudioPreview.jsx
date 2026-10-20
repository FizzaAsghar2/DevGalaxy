import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Monitor, Pencil, Smartphone, Sparkles, Tablet } from 'lucide-react'
import PreviewFrame from '../../components/studio/PreviewFrame'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { currentVersion, getProject } from '../../studio/storage'
import { composeFiles } from '../../studio/compose'
import { applyDirection, planOffline } from '../../studio/core/spec'
import { EXAMPLES } from '../../studio/examples'
import { useStudioUser } from '../../studio/hooks'

/** Full-screen preview of a saved project (/studio/:id/preview) or a built-in example (/studio/examples/:slug). */
export default function StudioPreview() {
  const { id, slug } = useParams()
  const { userId, getToken } = useStudioUser()
  const [viewport, setViewport] = useState('desktop')
  const [route, setRoute] = useState('/')
  const [state, setState] = useState(undefined)
  const frame = useRef(null)
  const example = slug ? EXAMPLES.find((e) => e.slug === slug) : null

  useEffect(() => {
    if (slug) {
      if (!example) return setState(null)
      const spec = applyDirection(planOffline(example.prompt, { category: example.category, name: example.title }), example.direction)
      setState({ name: example.title, spec, files: composeFiles(spec) })
      return undefined
    }
    getProject(userId, id).then((p) => {
      if (!p) return setState(null)
      const v = currentVersion(p)
      setState({ name: p.name, spec: v.spec, files: v.files })
    }, () => setState(null))
    return undefined
  }, [example, id, slug, userId])

  const fonts = useMemo(() => (state ? [state.spec.typography.heading, state.spec.typography.body] : []), [state])
  if (state === undefined) return <div className="pt-24"><LoadingState label="Loading preview…" /></div>
  if (state === null) return <div className="mx-auto max-w-lg pt-24"><ErrorState title={slug ? 'Example not found' : 'Project not found'} message="Check the link, or open it from your projects." action={<Link className="btn-primary" to={slug ? '/#examples' : '/projects'}>Go back</Link>} /></div>

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-void-800/70 px-3 py-2">
        <Link to={slug ? '/#examples' : '/projects'} className="btn-ghost p-2" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
        <span className="font-display text-white">{state.name}</span>
        {slug && <span className="chip border-amber-300/30 bg-amber-400/10 text-[11px] text-amber-100">Example · Demo (generated offline, not saved)</span>}
        <div className="flex rounded-lg bg-white/[0.04] p-0.5">
          {[['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]].map(([k, Icon]) => (
            <button key={k} type="button" aria-label={`${k} viewport`} aria-pressed={viewport === k} onClick={() => setViewport(k)} className={`rounded-md p-1.5 ${viewport === k ? 'bg-violet-500/40 text-white' : 'text-slate-400'}`}><Icon className="h-4 w-4" /></button>
          ))}
        </div>
        <select aria-label="Go to page" className="input w-auto py-1.5 font-mono text-xs" value={state.spec.pages.some((p) => p.path === route) ? route : state.spec.pages[0].path} onChange={(e) => frame.current?.navigate(e.target.value)}>
          {state.spec.pages.map((p) => <option key={p.id} value={p.path}>{p.name}</option>)}
        </select>
        <div className="ml-auto">
          {slug
            ? <Link to={`/studio/new?example=${slug}`} className="btn-primary px-3 py-2 text-xs"><Sparkles className="h-3.5 w-3.5" /> Use this prompt</Link>
            : <Link to={`/studio/${id}`} className="btn-primary px-3 py-2 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</Link>}
        </div>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <PreviewFrame ref={frame} files={state.files} fonts={fonts} viewport={viewport} getToken={getToken} onRoute={setRoute} />
      </div>
    </div>
  )
}
