import { Loader2, OctagonAlert, Sparkles } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, action }) {
  return (
    <div className="glass mx-auto max-w-lg rounded-2xl p-6 text-center">
      <OctagonAlert className="mx-auto h-7 w-7 text-rose-300" />
      <h3 className="mt-3 font-display text-lg text-white">{title}</h3>
      {message && <p className="mt-1 text-sm text-slate-400">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="glass mx-auto max-w-lg rounded-2xl p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Sparkles className="h-5 w-5 text-violet-300" />
      </div>
      <h3 className="mt-4 font-display text-lg text-white">{title}</h3>
      {message && <p className="mt-1 text-sm text-slate-400">{message}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="glass h-56 animate-pulse rounded-2xl">
      <div className="h-full w-full rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent" />
    </div>
  )
}
