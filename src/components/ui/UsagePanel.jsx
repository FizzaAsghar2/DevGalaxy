import { Link } from 'react-router-dom'
import { Crown, ShieldCheck } from 'lucide-react'
import { useAccount } from '../../account/AccountProvider'
import { USAGE_ACTIONS } from '../../lib/plans'

const SHOWN = ['GALAXY_GENERATION', 'UI_GENERATION', 'UI_REGENERATION']

export default function UsagePanel() {
  const { account, isAdmin, error } = useAccount()
  if (error && !account) {
    return <p className="mt-6 rounded-xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-100">{error}</p>
  }
  if (!account) return null
  return (
    <section className="glass mt-6 flex flex-wrap items-center gap-5 rounded-2xl px-5 py-4">
      <div className="min-w-[140px]">
        <p className="label-muted">Your plan</p>
        <p className="mt-1 flex items-center gap-1.5 font-display text-lg text-white">
          {isAdmin ? <ShieldCheck className="h-4 w-4 text-amber-300" /> : account.plan.id !== 'free' && <Crown className="h-4 w-4 text-amber-300" />}
          {isAdmin ? 'Administrator' : account.plan.name}
        </p>
        {account.mode === 'demo' && <p className="text-[10px] text-slate-500">Demo mode · simulated locally</p>}
      </div>
      <div className="grid flex-1 gap-3 sm:grid-cols-3">
        {SHOWN.map((action) => {
          const e = account.entitlements[action]
          const pct = e.unlimited ? 100 : e.limit ? Math.round(((e.limit - e.remaining) / e.limit) * 100) : 100
          return (
            <div key={action}>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{USAGE_ACTIONS[action].label}</span>
                <span className="text-slate-200">{e.unlimited ? 'Unlimited' : e.limit === 0 ? 'Pro only' : `${e.remaining} of ${e.limit} left`}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${e.unlimited ? 'bg-emerald-400/70' : 'bg-gradient-to-r from-violet-500 to-cyan-400'}`} style={{ width: `${e.unlimited ? 100 : pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      {!isAdmin && account.plan.id === 'free' && (
        <Link to="/pricing" className="btn-primary px-4 py-2 text-xs"><Crown className="h-3.5 w-3.5" /> Upgrade</Link>
      )}
    </section>
  )
}
