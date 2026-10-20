import { useEffect, useMemo, useRef, useState } from 'react'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import markdown from 'highlight.js/lib/languages/markdown'
import 'highlight.js/styles/github-dark.css'
import { Check, Copy, FileCode2, Pencil, Save, Search, X } from 'lucide-react'
import { isWritableByEditor } from '../../studio/core/paths'

hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('markdown', markdown)

const LANG = { ts: 'typescript', tsx: 'typescript', js: 'typescript', jsx: 'typescript', mjs: 'typescript', css: 'css', json: 'json', html: 'xml', svg: 'xml', md: 'markdown' }

/** Browse, search, copy and (optionally) hand-edit the real generated source files. */
export default function CodeInspector({ files, errors = [], selected, onSelect, onSaveFile, readOnly = false }) {
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [draft, setDraft] = useState(null)
  const codeRef = useRef(null)
  const file = files.find((f) => f.path === selected) ?? files.find((f) => f.path.endsWith('App.tsx')) ?? files[0]
  const q = query.trim().toLowerCase()
  const visible = useMemo(() => (q ? files.filter((f) => f.path.toLowerCase().includes(q) || (f.encoding !== 'base64' && f.content.toLowerCase().includes(q))) : files), [files, q])
  const fileErrors = errors.filter((e) => e.file === file?.path)

  const html = useMemo(() => {
    if (!file || file.encoding === 'base64') return ''
    const lang = LANG[file.path.split('.').pop()]
    const out = lang ? hljs.highlight(file.content, { language: lang }).value : hljs.highlightAuto(file.content).value
    return out.split('\n').map((line, i) => `<span class="gs-ln${fileErrors.some((e) => e.line === i + 1) ? ' gs-err' : ''}" data-ln="${i + 1}">${line || ' '}</span>`).join('\n')
  }, [file, fileErrors])

  useEffect(() => setDraft(null), [file?.path])
  useEffect(() => {
    if (!q || !codeRef.current) return
    const lines = file?.content.toLowerCase().split('\n') ?? []
    const hit = lines.findIndex((l) => l.includes(q))
    if (hit >= 0) codeRef.current.querySelector(`[data-ln="${hit + 1}"]`)?.scrollIntoView({ block: 'center' })
  }, [q, file])

  async function copy() {
    await navigator.clipboard.writeText(file.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!file) return <p className="p-6 text-sm text-slate-400">No files.</p>
  const writable = !readOnly && onSaveFile && isWritableByEditor(file.path) && file.encoding !== 'base64'

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 md:flex-row">
      <aside className="flex max-h-48 flex-col md:max-h-none md:w-64">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files and code" className="input py-2 pl-8 text-xs" aria-label="Search files and code" />
        </label>
        <ul className="mt-2 min-h-0 flex-1 overflow-auto text-xs">
          {visible.map((f) => (
            <li key={f.path}>
              <button type="button" onClick={() => onSelect(f.path)} className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left font-mono ${f.path === file.path ? 'bg-violet-500/20 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{f.path}</span>
                {errors.some((e) => e.file === f.path) && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-rose-400" title="Has errors" />}
              </button>
            </li>
          ))}
          {!visible.length && <li className="px-2 py-3 text-slate-500">No matches for “{query}”.</li>}
        </ul>
      </aside>
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs">
          <span className="truncate font-mono text-slate-300">{file.path}</span>
          <span className="text-slate-500">{file.encoding === 'base64' ? 'binary' : `${file.content.split('\n').length} lines`}</span>
          <div className="ml-auto flex gap-1">
            {writable && !draft && <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setDraft(file.content)}><Pencil className="h-3 w-3" /> Edit</button>}
            {draft !== null && (
              <>
                <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setDraft(null)}><X className="h-3 w-3" /> Cancel</button>
                <button type="button" className="btn-primary px-2 py-1 text-xs" onClick={() => { onSaveFile(file.path, draft); setDraft(null) }} disabled={draft === file.content}><Save className="h-3 w-3" /> Save & rebuild</button>
              </>
            )}
            {file.encoding !== 'base64' && <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={copy}>{copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied' : 'Copy'}</button>}
          </div>
        </div>
        {fileErrors.length > 0 && (
          <ul className="border-b border-rose-400/30 bg-rose-500/10 px-3 py-2 font-mono text-[11px] text-rose-200" role="alert">
            {fileErrors.map((e, i) => <li key={i}>Line {e.line}:{e.column} — {e.text}</li>)}
          </ul>
        )}
        {draft !== null ? (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} aria-label={`Edit ${file.path}`} className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[12px] leading-5 text-slate-100 outline-none" />
        ) : file.encoding === 'base64' ? (
          <p className="p-4 text-sm text-slate-400">Binary asset — see the Assets panel for a preview.</p>
        ) : (
          <pre ref={codeRef} className="gs-code min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-5"><code className="hljs !bg-transparent" dangerouslySetInnerHTML={{ __html: html }} /></pre>
        )}
      </section>
    </div>
  )
}
