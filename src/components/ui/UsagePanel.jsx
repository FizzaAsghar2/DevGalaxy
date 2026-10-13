import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, ArrowRight, Coins, Cpu } from 'lucide-react'
import { useAccount } from '../../account/AccountProvider'
import { formatCents } from '../../lib/usage'

/** Compact "AI usage this month" strip for the dashboard; details live in Settings → Usage. */
export default function UsagePanel() {
  const { account, usage, error } = useAccount()
  if (error && !account) {
    return <p className="mt-6 rounded-xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-100">{error}</p>
  }
  if (!account) return null
  const max = Math.max(1, ...usage.series.map((d) => d.calls))
  const budget = account.budget ?? {}
  return (
    <section className="glass mt-6 flex flex-wrap items-center gap-5 rounded-2xl px-5 py-4">
      <div className="min-w-[150px]">
        <p className="label-muted">AI usage · this month</p>
        <p className="mt-1 flex items-center gap-1.5 font-display text-lg text-white"><Activity className="h-4 w-4 text-violet-300" /> {usage.monthCalls} generations</p>
        <p className="text-[10px] text-slate-500">{account.aiConfigured ? `${usage.aiCalls} used the AI provider` : 'Offline generator · no AI provider connected'}</p>
      </div>
      <div className="min-w-[130px]">
        <p className="label-muted">Estimated spend</p>
        <p className="mt-1 flex items-center gap-1.5 font-display text-lg text-white"><Coins className="h-4 w-4 text-amber-300" /> {formatCents(usage.monthCents)}</p>
        <p className="text-[10px] text-slate-500">{budget.budgetCents != null ? `Budget ${formatCents(budget.budgetCents)} / month` : 'No monthly budget set'}</p>
      </div>
      <div className="flex h-12 flex-1 items-end gap-1" aria-label="Generations over the last 14 days">
        {usage.series.map((d, i) => (
          <motion.div
            key={d.date}
            title={`${d.date}: ${d.calls}`}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(6, (d.calls / max) * 100)}%` }}
            transition={{ delay: i * 0.02 }}
            className={`flex-1 rounded-sm ${d.calls ? 'bg-gradient-to-t from-violet-600 to-cyan-400' : 'bg-white/10'}`}
          />
        ))}
      </div>
      <Link to="/settings?tab=usage" className="btn-ghost px-3 py-2 text-xs"><Cpu className="h-3.5 w-3.5" /> Usage details <ArrowRight className="h-3.5 w-3.5" /></Link>
    </section>
  )
}
