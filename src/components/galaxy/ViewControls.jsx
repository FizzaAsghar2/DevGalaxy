import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react'

function Button({ label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export default function ViewControls({ onZoomIn, onZoomOut, onFit, onReset, hint }) {
  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
      <div className="glass-strong flex items-center gap-0.5 rounded-xl px-1 py-1">
        <Button label="Zoom in" icon={Plus} onClick={onZoomIn} />
        <Button label="Zoom out" icon={Minus} onClick={onZoomOut} />
        <Button label="Fit galaxy" icon={Maximize2} onClick={onFit} />
        <Button label="Reset layout" icon={RotateCcw} onClick={onReset} />
      </div>
      {hint && <span className="glass hidden rounded-xl px-3 py-2 text-[11px] text-slate-400 lg:block">{hint}</span>}
    </div>
  )
}
