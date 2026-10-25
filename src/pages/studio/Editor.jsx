import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Code2, Download, Expand, FileCode2, FileText, History, Image as ImageIcon, LayoutTemplate, Loader2, Monitor, MessageSquare,
  Palette, Pencil, RefreshCw, Redo2, Settings, Smartphone, Tablet, Undo2, Wand2, X, CloudOff, Check, AlertTriangle,
} from 'lucide-react'
import PreviewFrame from '../../components/studio/PreviewFrame'
import CodeInspector from '../../components/studio/CodeInspector'
import ChatPanel from '../../components/studio/ChatPanel'
import DesignPanel from '../../components/studio/DesignPanel'
import VersionsPanel from '../../components/studio/VersionsPanel'
import AssetsPanel from '../../components/studio/AssetsPanel'
import DiffView from '../../components/studio/DiffView'
import SpecEditor from '../../components/studio/SpecEditor'
import ModeBadge from '../../components/studio/ModeBadge'
import Modal from '../../components/ui/Modal'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { addVersion, currentVersion, duplicateProject, getProject, restoreVersion, saveProject, stepVersion } from '../../studio/storage'
import { editSite } from '../../studio/api'
import { composeFiles } from '../../studio/compose'
import { downloadProjectZip } from '../../studio/download'
import { useMediaQuery, useStudioStatus, useStudioUser } from '../../studio/hooks'

const LEFT_TABS = [
  { key: 'pages', label: 'Pages', icon: LayoutTemplate },
  { key: 'files', label: 'Files', icon: FileCode2, advanced: true },
  { key: 'assets', label: 'Assets', icon: ImageIcon },
  { key: 'history', label: 'History', icon: History },
]
const RIGHT_TABS = [
  { key: 'chat', label: 'AI chat', icon: MessageSquare },
  { key: 'design', label: 'Design', icon: Palette },
  { key: 'status', label: 'Status', icon: FileText },
]
const MOBILE_TABS = [{ key: 'preview', label: 'Preview', icon: Monitor }, ...RIGHT_TABS.slice(0, 2), ...LEFT_TABS.filter((t) => !t.advanced)]

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userId, getToken } = useStudioUser()
  const { status: ai } = useStudioStatus()
  const [project, setProject] = useState(undefined)
  const [save, setSave] = useState('saved')
  const [view, setView] = useState('preview')
  const [viewport, setViewport] = useState('desktop')
  const [left, setLeft] = useState('pages')
  const [right, setRight] = useState('chat')
  const [mobile, setMobile] = useState('preview')
  const [simple, setSimple] = useState(() => localStorage.getItem('gs:simple') === '1')
  const [build, setBuild] = useState({ phase: 'building', errors: [] })
  const [buildKey, setBuildKey] = useState(0)
  const [route, setRoute] = useState('/')
  const [selectedFile, setSelectedFile] = useState(null)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)
  const [compare, setCompare] = useState(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [planDraft, setPlanDraft] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const frameRef = useRef(null)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const stageRef = useRef(null)
  const projectRef = useRef(project)
  useEffect(() => { projectRef.current = project }, [project])

  useEffect(() => {
    getProject(userId, id).then((p) => setProject(p ?? null), () => setProject(null))
  }, [id, userId])
  useEffect(() => localStorage.setItem('gs:simple', simple ? '1' : '0'), [simple])
  useEffect(() => {
    if (!notice) return undefined
    const t = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(t)
  }, [notice])

  const version = project ? currentVersion(project) : null
  const files = version?.files
  const fonts = useMemo(() => (version ? [version.spec.typography.heading, version.spec.typography.body] : []), [version])
  const index = project ? project.versions.findIndex((v) => v.id === project.currentVersionId) : 0

  const persist = useCallback((next) => {
    projectRef.current = next
    setProject(next)
    setSave('saving')
    saveProject(next).then(() => setSave('saved'), () => setSave('error'))
  }, [])

  /** Every meaningful change becomes a new version; older ones stay in history. */
  const commit = useCallback((input, extra = {}) => {
    const p = projectRef.current
    const v = currentVersion(p)
    const customFiles = input.customFiles ?? v.customFiles ?? []
    const assets = input.assets ?? p.assets
    const spec = input.spec ?? v.spec
    const next = addVersion({ ...p, ...extra, assets }, { summary: input.summary, spec, files: composeFiles(spec, customFiles, assets), customFiles, buildStatus: 'unknown', source: input.source })
    persist(next)
    return next
  }, [persist])

  const onStatus = useCallback((s) => {
    setBuild(s)
    const status = s.phase === 'ready' ? 'ok' : s.phase === 'failed' || s.phase === 'runtime-error' ? 'failed' : null
    const p = projectRef.current
    if (!status || !p) return
    const v = currentVersion(p)
    if (v.buildStatus === status) return
    persist({ ...p, versions: p.versions.map((x) => (x.id === v.id ? { ...x, buildStatus: status, errors: s.errors.map((e) => e.text) } : x)) })
  }, [persist])

  const undo = useCallback(() => projectRef.current && persist(stepVersion(projectRef.current, -1)), [persist])
  const redo = useCallback(() => projectRef.current && persist(stepVersion(projectRef.current, 1)), [persist])
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.target.closest?.('input,textarea,select')) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  async function sendChat(text) {
    const p = projectRef.current
    const v = currentVersion(p)
    const chat = [...(p.chat ?? []), { role: 'user', text, at: new Date().toISOString() }]
    setProject({ ...p, chat })
    setBusy(ai?.aiConfigured ? 'AI is editing the website…' : 'Applying the change…')
    try {
      const r = await editSite(v.spec, v.files, text, getToken)
      if (r.unsupported || (!r.spec && !r.files.length)) {
        persist({ ...projectRef.current, chat: [...chat, { role: 'assistant', text: r.unsupported ?? 'No changes were needed.', at: new Date().toISOString() }] })
        return
      }
      const custom = new Map((v.customFiles ?? []).map((f) => [f.path, f]))
      for (const f of r.files) custom.set(f.path, f)
      const lines = [`Done${r.source === 'offline' ? ' (offline editor)' : ''}:`, ...r.summary.map((s) => `• ${s}`)]
      if (r.rejected.length) lines.push(`Skipped ${r.rejected.length} unsafe or invalid file change(s): ${r.rejected.join(', ')}`)
      lines.push('The previous version is in History; use Undo to go back.')
      commit({ spec: r.spec ?? v.spec, customFiles: [...custom.values()], summary: r.summary[0] ?? text.slice(0, 80), source: r.source }, { chat: [...chat, { role: 'assistant', text: lines.join('\n'), at: new Date().toISOString() }] })
    } catch (err) {
      persist({ ...projectRef.current, chat: [...chat, { role: 'assistant', error: true, text: `The edit failed: ${err.message} Nothing was changed.`, at: new Date().toISOString() }] })
    } finally {
      setBusy('')
    }
  }

  function download(versionId) {
    const p = projectRef.current
    const v = versionId ? p.versions.find((x) => x.id === versionId) : currentVersion(p)
    const r = downloadProjectZip(`${p.name}${versionId ? `-v${p.versions.indexOf(v) + 1}` : ''}`, v.files)
    setNotice({ text: `Downloaded ${r.included.length} files${r.skipped.length ? `; skipped ${r.skipped.length} unsafe file(s)` : ''}.` })
  }

  async function duplicate(versionId) {
    const copy = duplicateProject(projectRef.current, versionId)
    await saveProject(copy)
    setNotice({ text: `Created “${copy.name}”.`, link: `/studio/${copy.id}` })
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else stageRef.current?.requestFullscreen?.()
  }

  if (project === undefined) return <div className="pt-24"><LoadingState label="Opening project…" /></div>
  if (project === null) return <div className="mx-auto max-w-lg pt-24"><ErrorState title="Project not found" message="It may have been deleted, or it was created in another browser or account." action={<Link className="btn-primary" to="/projects">Back to projects</Link>} /></div>

  const uploaded = project.assets ?? []
  const leftPanel = (tab) => {
    if (tab === 'pages') return (
      <div className="space-y-2 text-xs">
        {version.spec.pages.map((pg) => (
          <button key={pg.id} type="button" onClick={() => { setView('preview'); setMobile('preview'); frameRef.current?.navigate(pg.path) }}
            className={`w-full rounded-xl border px-3 py-2 text-left ${route === pg.path ? 'border-cyan-300/40 bg-cyan-400/5' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
            <span className="text-slate-200">{pg.name}</span> <span className="font-mono text-slate-500">{pg.path}</span>
            <span className="mt-1 block text-[10px] text-slate-500">{pg.sections.map((s) => s.type).join(' · ')}</span>
          </button>
        ))}
        <button type="button" className="btn-ghost w-full py-2 text-xs" onClick={() => { setPlanDraft(version.spec); setPlanOpen(true) }}><Pencil className="h-3.5 w-3.5" /> Edit pages & plan</button>
        <div className="pt-2">
          <p className="label-muted text-[10px]">Components</p>
          <ul className="mt-1 flex flex-wrap gap-1">{version.spec.components.map((c) => <li key={c} className="chip text-[10px]">{c}</li>)}</ul>
        </div>
      </div>
    )
    if (tab === 'files') return (
      <ul className="space-y-0.5 text-xs">
        {files.map((f) => (
          <li key={f.path}><button type="button" onClick={() => { setSelectedFile(f.path); setView('code') }} className={`flex w-full items-center gap-1.5 truncate rounded px-2 py-1 text-left font-mono ${selectedFile === f.path && view === 'code' ? 'bg-violet-500/20 text-white' : 'text-slate-400 hover:bg-white/5'}`}><FileCode2 className="h-3 w-3 shrink-0" />{f.path}</button></li>
        ))}
      </ul>
    )
    if (tab === 'assets') return (
      <AssetsPanel files={files} uploaded={uploaded}
        onAdd={(a) => commit({ assets: [...uploaded, a], summary: `Uploaded ${a.path.split('/').pop()}`, source: 'manual' })}
        onReplace={(old, a) => commit({ assets: uploaded.map((x) => (x.path === old ? a : x)), summary: `Replaced ${old.split('/').pop()}`, source: 'manual' })}
        onRemove={(path) => commit({ assets: uploaded.filter((x) => x.path !== path), summary: `Removed ${path.split('/').pop()}`, source: 'manual' })} />
    )
    return (
      <VersionsPanel project={project}
        onView={(vid) => persist({ ...project, currentVersionId: vid })}
        onCompare={(vid) => setCompare(vid)}
        onRestore={(vid) => persist(restoreVersion(project, vid))}
        onDuplicate={duplicate}
        onDownload={download} />
    )
  }
  const rightPanel = (tab) => {
    if (tab === 'chat') return <ChatPanel messages={project.chat ?? []} busy={busy} onSend={sendChat} offline={!ai?.aiConfigured} />
    if (tab === 'design') return <DesignPanel spec={version.spec} onCommit={(spec) => commit({ spec, summary: 'Adjusted design controls', source: 'manual' })} />
    return (
      <div className="space-y-3 text-xs text-slate-300">
        <p className="flex items-center gap-2">
          {build.phase === 'ready' ? <Check className="h-4 w-4 text-emerald-400" /> : build.phase === 'failed' || build.phase === 'runtime-error' ? <AlertTriangle className="h-4 w-4 text-rose-400" /> : <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />}
          Preview: {{ building: 'compiling', starting: 'starting', ready: 'running', failed: 'build failed', 'runtime-error': 'runtime error' }[build.phase]}{build.ms ? ` (compiled in ${build.ms} ms)` : ''}
        </p>
        {build.errors.length > 0 && <ul className="space-y-1 rounded-lg bg-rose-500/10 p-2 font-mono text-[11px] text-rose-200">{build.errors.map((e, i) => <li key={i}>{e.file ? `${e.file}:${e.line ?? ''} ` : ''}{e.text}</li>)}</ul>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-400">
          <dt>Version</dt><dd>v{index + 1} of {project.versions.length}</dd>
          <dt>Framework</dt><dd>{version.spec.framework === 'nextjs' ? 'Next.js' : 'React + Vite'} · TypeScript · Tailwind</dd>
          <dt>Files</dt><dd>{files.length}{version.customFiles?.length ? ` (${version.customFiles.length} hand/AI-edited)` : ''}</dd>
          <dt>Storage</dt><dd>This browser (IndexedDB)</dd>
        </dl>
        <p className="rounded-lg bg-white/[0.03] p-2 text-[11px] leading-relaxed text-slate-500">The preview is compiled on the server (esbuild + Tailwind, in memory) with an import allow-list, then run in a sandboxed iframe with no access to Galaxy Studio, your session or the network. Packages are pre-resolved, not installed per build.</p>
      </div>
    )
  }

  const tabButton = (t, active, onClick, stacked = false) => (
    <button key={t.key} type="button" onClick={onClick} aria-pressed={active} className={`flex min-w-0 flex-1 items-center justify-center rounded-lg px-1.5 py-1.5 text-[11px] ${stacked ? 'flex-col gap-0.5' : 'gap-1'} ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
      <t.icon className="h-3.5 w-3.5 shrink-0" /> <span className="max-w-full truncate">{t.label}</span>
    </button>
  )
  const leftTabs = LEFT_TABS.filter((t) => !(simple && t.advanced))

  const stage = (
    <div ref={stageRef} className="flex h-full min-h-0 flex-col bg-void-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-3 py-2">
        <div className="flex rounded-lg bg-white/[0.04] p-0.5">
          {[['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]].map(([k, Icon]) => (
            <button key={k} type="button" aria-label={`${k} viewport`} aria-pressed={viewport === k} onClick={() => setViewport(k)} className={`rounded-md p-1.5 ${viewport === k ? 'bg-violet-500/40 text-white' : 'text-slate-400 hover:text-white'}`}><Icon className="h-4 w-4" /></button>
          ))}
        </div>
        <select aria-label="Go to page" className="input w-auto max-w-[45%] py-1.5 font-mono text-xs" value={version.spec.pages.some((p) => p.path === route) ? route : ''} onChange={(e) => frameRef.current?.navigate(e.target.value)}>
          {!version.spec.pages.some((p) => p.path === route) && <option value="">{route}</option>}
          {version.spec.pages.map((p) => <option key={p.id} value={p.path}>{p.path}</option>)}
        </select>
        <div className="ml-auto flex gap-1">
          <button type="button" className="btn-ghost p-2" aria-label="Refresh preview" title="Rebuild and reload" onClick={() => setBuildKey((k) => k + 1)}><RefreshCw className="h-4 w-4" /></button>
          <button type="button" className="btn-ghost p-2" aria-label="Full-screen preview" onClick={toggleFullscreen}><Expand className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <PreviewFrame ref={frameRef} files={files} fonts={fonts} viewport={viewport} buildKey={buildKey} route={route} getToken={getToken} onStatus={onStatus} onRoute={setRoute} />
      </div>
    </div>
  )
  const code = <div className="h-full min-h-0 p-2"><CodeInspector files={files} errors={build.errors} selected={selectedFile} onSelect={setSelectedFile}
    onSaveFile={(path, content) => { const custom = new Map((version.customFiles ?? []).map((f) => [f.path, f])); custom.set(path, { path, content }); commit({ customFiles: [...custom.values()], summary: `Edited ${path}`, source: 'manual' }) }} /></div>

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-void-800/70 px-3 py-2 backdrop-blur">
        <Link to="/projects" className="btn-ghost p-2" aria-label="Back to projects"><ArrowLeft className="h-4 w-4" /></Link>
        {renaming ? (
          <form onSubmit={(e) => { e.preventDefault(); const name = new FormData(e.currentTarget).get('name').toString().trim().slice(0, 40); setRenaming(false); if (name && name !== project.name) commit({ spec: { ...version.spec, name }, summary: `Renamed to ${name}`, source: 'manual' }) }}>
            <input name="name" autoFocus defaultValue={project.name} maxLength={40} className="input w-48 py-1.5 text-sm" aria-label="Project name" onBlur={(e) => e.currentTarget.form.requestSubmit()} />
          </form>
        ) : (
          <button type="button" onClick={() => setRenaming(true)} className="group flex items-center gap-1.5 font-display text-white" title="Rename">{project.name}<Pencil className="h-3 w-3 text-slate-500 group-hover:text-white" /></button>
        )}
        <span className={`hidden text-[11px] sm:inline ${save === 'error' ? 'text-rose-300' : 'text-slate-500'}`} aria-live="polite">
          {save === 'saving' ? 'Saving…' : save === 'error' ? 'Could not save' : <span className="inline-flex items-center gap-1"><CloudOff className="h-3 w-3" /> Saved in this browser</span>}
        </span>
        <div className="flex gap-1">
          <button type="button" className="btn-ghost p-2" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={index <= 0} onClick={undo}><Undo2 className="h-4 w-4" /></button>
          <button type="button" className="btn-ghost p-2" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={index >= project.versions.length - 1} onClick={redo}><Redo2 className="h-4 w-4" /></button>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <ModeBadge status={ai} className="hidden md:inline-flex" />
          <label className="chip cursor-pointer text-[11px]" title="Simple mode hides code and files"><input type="checkbox" checked={simple} onChange={(e) => { setSimple(e.target.checked); if (e.target.checked) setView('preview') }} /> Simple</label>
          {!simple && (
            <div className="hidden rounded-lg bg-white/[0.04] p-0.5 lg:flex">
              {[['preview', Monitor, 'Preview'], ['code', Code2, 'Code']].map(([k, Icon, l]) => (
                <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${view === k ? 'bg-violet-500/40 text-white' : 'text-slate-400'}`}><Icon className="h-3.5 w-3.5" /> {l}</button>
              ))}
            </div>
          )}
          <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={() => download()}><Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Download ZIP</span></button>
          <Link to="/settings?tab=ai" className="btn-ghost p-2" aria-label="Settings"><Settings className="h-4 w-4" /></Link>
        </div>
      </header>

      {notice && (
        <div className="fixed left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-white/10 bg-void-800/95 px-4 py-2 text-sm text-slate-100 shadow-xl" role="status">
          {notice.text}
          {notice.link && <button type="button" className="text-cyan-300 underline" onClick={() => navigate(notice.link)}>Open</button>}
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Desktop: three columns */}
      {desktop ? (
      <div className="grid min-h-0 flex-1 grid-cols-[250px_minmax(0,1fr)_340px]">
        <aside className="flex min-h-0 flex-col border-r border-white/10 bg-void-800/40">
          <div className="flex gap-0.5 p-2">{leftTabs.map((t) => tabButton(t, left === t.key, () => setLeft(t.key)))}</div>
          <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">{leftPanel(leftTabs.some((t) => t.key === left) ? left : 'pages')}</div>
        </aside>
        <main className="min-h-0 min-w-0">
          {view === 'code' && !simple && code}
          <div className={view === 'code' && !simple ? 'hidden' : 'h-full min-h-0'}>{stage}</div>
        </main>
        <aside className="flex min-h-0 flex-col border-l border-white/10 bg-void-800/40">
          <div className="flex gap-0.5 p-2">{RIGHT_TABS.map((t) => tabButton(t, right === t.key, () => setRight(t.key)))}</div>
          <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">{rightPanel(right)}</div>
        </aside>
      </div>
      ) : (
      /* Tablet & mobile: one panel at a time */
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={`min-h-0 flex-1 ${mobile === 'preview' ? '' : 'hidden'}`}>{stage}</div>
        {mobile !== 'preview' && <div className="min-h-0 flex-1 overflow-auto p-3">{mobile === 'chat' || mobile === 'design' ? rightPanel(mobile) : leftPanel(mobile)}</div>}
        <nav className="flex gap-0.5 border-t border-white/10 bg-void-800/90 p-1.5" aria-label="Editor panels">
          {MOBILE_TABS.map((t) => tabButton(t, mobile === t.key, () => setMobile(t.key), true))}
        </nav>
      </div>
      )}

      <Modal wide open={Boolean(compare)} title="Compare versions" description="Selected version (−) against the current version (+)." onClose={() => setCompare(null)}>
        {compare && <DiffView before={project.versions.find((v) => v.id === compare)?.files ?? []} after={files} />}
      </Modal>
      <Modal wide open={planOpen} title="Edit pages & plan" description="Changes regenerate the site as a new version. Files edited by hand or AI keep your edits." onClose={() => setPlanOpen(false)}
        footer={<button type="button" className="btn-primary" onClick={() => { commit({ spec: planDraft, summary: 'Edited the website plan', source: 'manual' }); setPlanOpen(false) }}><Wand2 className="h-4 w-4" /> Apply & rebuild</button>}>
        {planDraft && <div className="max-h-[65vh] overflow-auto pr-1"><SpecEditor spec={planDraft} onChange={setPlanDraft} compact /></div>}
      </Modal>
    </div>
  )
}
