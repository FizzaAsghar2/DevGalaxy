import { useEffect, useRef, useState } from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'

const SUGGESTIONS = ['Make the hero section more premium', 'Make the navbar sticky', 'Add testimonials below the cards', 'Change the theme to emerald', 'Use a more modern font', 'Reduce the animation speed', 'Add a contact section', 'Make the product cards smaller']

/** Conversational editing. Each request becomes a new version; failures are reported in the thread. */
export default function ChatPanel({ messages, busy, onSend, offline }) {
  const [text, setText] = useState('')
  const end = useRef(null)
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [messages.length, busy])

  function submit(value) {
    const v = value.trim()
    if (!v || busy) return
    onSend(v)
    setText('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {offline && <p className="mb-2 rounded-lg bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100">Offline (Demo) editor: understands common design requests. Connect an AI provider in Settings for free-form edits.</p>}
      <ol className="min-h-0 flex-1 space-y-2 overflow-auto pr-1" aria-live="polite">
        {messages.map((m, i) => (
          <li key={i} className={`max-w-[92%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-violet-500/25 text-white' : m.error ? 'border border-rose-400/30 bg-rose-500/10 text-rose-100' : 'bg-white/[0.06] text-slate-200'}`}>
            {m.text}
          </li>
        ))}
        {busy && <li className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {busy}</li>}
        <li ref={end} />
      </ol>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.slice(0, 4).map((s) => (
          <button key={s} type="button" disabled={Boolean(busy)} onClick={() => submit(s)} className="chip text-[11px] hover:bg-white/10"><Sparkles className="h-3 w-3 text-violet-300" /> {s}</button>
        ))}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(text) }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder="Describe a change…" aria-label="Describe a change" className="input py-2" disabled={Boolean(busy)} />
        <button type="submit" className="btn-primary px-3" disabled={Boolean(busy) || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  )
}
