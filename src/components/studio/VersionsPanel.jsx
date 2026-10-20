import { CircleCheck, CircleX, Copy, Download, Eye, GitCompare, History, RotateCcw } from 'lucide-react'

const SOURCE = { ai: 'AI', offline: 'Offline', manual: 'Manual', restore: 'Restore' }

/** Version history: view (non-destructive), compare with the current version, restore, duplicate, download. */
export default function VersionsPanel({ project, onView, onCompare, onRestore, onDuplicate, onDownload }) {
  const list = [...project.versions].reverse()
  return (
    <ol className="space-y-2">
      {list.map((v, i) => {
        const current = v.id === project.currentVersionId
        return (
          <li key={v.id} className={`rounded-xl border p-2.5 text-xs ${current ? 'border-cyan-300/40 bg-cyan-400/5' : 'border-white/10 bg-white/[0.02]'}`}>
            <div className="flex items-start gap-2">
              <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-slate-200">{v.summary}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                  v{project.versions.length - i} · {new Date(v.createdAt).toLocaleString()} · {SOURCE[v.source]}
                  {v.buildStatus === 'ok' && <CircleCheck className="h-3 w-3 text-emerald-400" aria-label="Built" />}
                  {v.buildStatus === 'failed' && <CircleX className="h-3 w-3 text-rose-400" aria-label="Build failed" />}
                  {current && <span className="text-cyan-300">current</span>}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {!current && <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => onView(v.id)} title="Show this version (newer versions are kept)"><Eye className="h-3 w-3" /> View</button>}
              {!current && <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => onCompare(v.id)}><GitCompare className="h-3 w-3" /> Compare</button>}
              {!current && <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => onRestore(v.id)} title="Copy this version to the top of history"><RotateCcw className="h-3 w-3" /> Restore</button>}
              <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => onDuplicate(v.id)}><Copy className="h-3 w-3" /> Duplicate</button>
              <button type="button" className="btn-ghost px-2 py-1 text-[11px]" onClick={() => onDownload(v.id)}><Download className="h-3 w-3" /> ZIP</button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
