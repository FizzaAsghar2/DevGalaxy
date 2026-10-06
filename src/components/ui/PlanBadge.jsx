import { Link } from 'react-router-dom'
import { Crown, ShieldCheck, Sparkles } from 'lucide-react'
import { useAccount } from '../../account/AccountProvider'

/** Display-only plan indicator. Limits are enforced by the server, not by this badge. */
export default function PlanBadge({ compact = false }) {
  const { account, isAdmin } = useAccount()
  if (!account) return null
  if (isAdmin) {
    return (
      <span className="chip border-amber-300/30 bg-amber-400/10 text-amber-100" title="Administrator · unlimited">
        <ShieldCheck className="h-3.5 w-3.5 text-amber-300" /> Admin
      </span>
    )
  }
  const galaxy = account.entitlements?.GALAXY_GENERATION
  const ui = account.entitlements?.UI_GENERATION
  const paid = account.plan?.id !== 'free'
  const text = (e) => (e?.unlimited ? '∞' : `${e?.remaining ?? 0}/${e?.limit ?? 0}`)
  return (
    <Link to="/pricing" className={`chip transition hover:border-white/25 ${paid ? 'border-violet-300/30 bg-violet-500/10 text-violet-100' : ''}`} title={`${account.plan?.name} plan${account.mode === 'demo' ? ' (demo simulation)' : ''}`}>
      {paid ? <Crown className="h-3.5 w-3.5 text-amber-300" /> : <Sparkles className="h-3.5 w-3.5 text-violet-300" />}
      {account.plan?.name}
      {!compact && (
        <span className="text-slate-400">
          · {text(galaxy)} galaxies · {text(ui)} UI
        </span>
      )}
    </Link>
  )
}
