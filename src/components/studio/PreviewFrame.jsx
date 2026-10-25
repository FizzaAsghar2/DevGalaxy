import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { buildPreview } from '../../studio/api'
import { previewDocument } from '../../studio/preview'

export const VIEWPORTS = { desktop: '100%', tablet: '820px', mobile: '390px' }

/**
 * Compiles the project on the server and runs it in a sandboxed iframe
 * (allow-scripts allow-forms, no same-origin): generated code never runs in the
 * Galaxy Studio page itself. Reports status/errors through onStatus.
 */
const PreviewFrame = forwardRef(function PreviewFrame({ files, fonts, viewport = 'desktop', route = '/', buildKey, getToken, onStatus, onRoute, className = '' }, ref) {
  const frame = useRef(null)
  const [doc, setDoc] = useState('')
  const [state, setState] = useState({ phase: 'building', errors: [] })
  const latest = useRef(0)
  const routeRef = useRef(route)
  routeRef.current = route

  useImperativeHandle(ref, () => ({ navigate: (to) => frame.current?.contentWindow?.postMessage({ type: 'gs:navigate', route: to }, '*') }), [])

  useEffect(() => {
    if (!files?.length) return undefined
    const run = ++latest.current
    setState({ phase: 'building', errors: [] })
    onStatus?.({ phase: 'building', errors: [] })
    const timer = setTimeout(async () => {
      const result = await buildPreview(files, getToken)
      if (run !== latest.current) return
      if (!result.ok) {
        const next = { phase: 'failed', errors: result.errors, stage: result.stage }
        setState(next)
        onStatus?.(next)
        return
      }
      setDoc(previewDocument({ js: result.js, css: result.css, fonts, route: routeRef.current }))
      setState({ phase: 'starting', errors: [], ms: result.ms })
      onStatus?.({ phase: 'starting', errors: [], ms: result.ms })
    }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, buildKey])

  // The load event is a fallback for a missed gs:ready (e.g. the frame finished loading while hidden).
  const markLoaded = () => {
    setState((s) => {
      if (s.phase !== 'starting') return s
      onStatus?.({ phase: 'ready', errors: [] })
      return { ...s, phase: 'ready' }
    })
  }

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== frame.current?.contentWindow) return
      const data = event.data ?? {}
      if (data.type === 'gs:ready') {
        setState((s) => ({ ...s, phase: 'ready' }))
        onStatus?.({ phase: 'ready', errors: [] })
      } else if (data.type === 'gs:error') {
        const next = { phase: 'runtime-error', errors: [{ file: null, line: null, column: null, text: String(data.message).slice(0, 300) }] }
        setState(next)
        onStatus?.(next)
      } else if (data.type === 'gs:route') onRoute?.(String(data.route).slice(0, 80))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onRoute, onStatus])

  return (
    <div className={`relative flex h-full w-full justify-center overflow-auto ${className}`}>
      <div className="relative h-full transition-[width] duration-300" style={{ width: VIEWPORTS[viewport], maxWidth: '100%' }}>
        {doc && (
          <iframe
            ref={frame}
            title="Website preview"
            sandbox="allow-scripts allow-forms"
            srcDoc={doc}
            onLoad={markLoaded}
            className={`h-full w-full rounded-xl border border-white/10 bg-white ${state.phase === 'failed' ? 'opacity-30' : ''}`}
          />
        )}
        {(state.phase === 'building' || state.phase === 'starting') && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-void-900/60 backdrop-blur-sm">
            <span className="chip bg-void-800/90 text-slate-200"><Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> {state.phase === 'building' ? 'Compiling project…' : 'Starting preview…'}</span>
          </div>
        )}
        {(state.phase === 'failed' || state.phase === 'runtime-error') && (
          <div className="absolute inset-x-3 top-3 rounded-xl border border-rose-400/30 bg-rose-950/90 p-4 text-sm text-rose-100 shadow-xl" role="alert">
            <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> {state.phase === 'failed' ? `Build failed (${state.stage})` : 'The website crashed while running'}</p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto font-mono text-xs">
              {state.errors.map((e, i) => (
                <li key={i}>{e.file ? `${e.file}${e.line ? `:${e.line}:${e.column ?? 0}` : ''} — ` : ''}{e.text}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
})

export default PreviewFrame
