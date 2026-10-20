import { useMemo, useState } from 'react'
import { changedFiles, lineDiff } from '../../studio/core/diff'

/** Side-by-side list of changed files and a unified line diff between two snapshots. */
export default function DiffView({ before, after }) {
  const changes = useMemo(() => changedFiles(before, after), [before, after])
  const [path, setPath] = useState(changes[0]?.path ?? null)
  const active = changes.find((c) => c.path === path) ? path : changes[0]?.path
  const lines = useMemo(() => {
    if (!active) return []
    const a = before.find((f) => f.path === active)
    const b = after.find((f) => f.path === active)
    if ((a?.encoding ?? b?.encoding) === 'base64') return [{ type: 'same', text: '(binary file)' }]
    return lineDiff(a?.content ?? '', b?.content ?? '')
  }, [active, before, after])
  if (!changes.length) return <p className="p-4 text-sm text-slate-400">No differences between these versions.</p>
  return (
    <div className="grid min-h-0 gap-3 md:grid-cols-[220px_1fr]">
      <ul className="max-h-64 space-y-1 overflow-auto text-xs md:max-h-[60vh]">
        {changes.map((c) => (
          <li key={c.path}>
            <button type="button" onClick={() => setPath(c.path)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono ${c.path === active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              <span className={c.status === 'added' ? 'text-emerald-300' : c.status === 'removed' ? 'text-rose-300' : 'text-amber-300'}>{c.status[0].toUpperCase()}</span>
              <span className="truncate">{c.path}</span>
            </button>
          </li>
        ))}
      </ul>
      <pre className="max-h-[60vh] overflow-auto rounded-xl bg-black/40 p-3 font-mono text-[11px] leading-5">
        {lines.map((l, i) => (
          <div key={i} className={l.type === 'add' ? 'bg-emerald-500/15 text-emerald-200' : l.type === 'del' ? 'bg-rose-500/15 text-rose-200' : 'text-slate-400'}>
            {l.type === 'add' ? '+ ' : l.type === 'del' ? '- ' : '  '}{l.text}
          </div>
        ))}
      </pre>
    </div>
  )
}
