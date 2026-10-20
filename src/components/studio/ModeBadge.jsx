import { Bot, WifiOff } from 'lucide-react'
import { Link } from 'react-router-dom'

/** Shows whether Galaxy Studio is using a real AI provider or the offline (demo) planner. */
export default function ModeBadge({ status, className = '' }) {
  if (!status) return <span className={`chip animate-pulse text-slate-400 ${className}`}>Checking AI…</span>
  if (status.aiConfigured) {
    return (
      <span className={`chip border-emerald-300/30 bg-emerald-400/10 text-emerald-100 ${className}`} title={`Requests go to ${status.provider} (${status.model}) from the server`}>
        <Bot className="h-3.5 w-3.5 text-emerald-300" /> AI · {status.provider} · {status.model}
      </span>
    )
  }
  return (
    <Link to="/settings?tab=ai" className={`chip border-amber-300/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20 ${className}`} title="No AI key is configured on the server. Click to see how to connect one.">
      <WifiOff className="h-3.5 w-3.5 text-amber-300" /> Offline (Demo) planner
    </Link>
  )
}
