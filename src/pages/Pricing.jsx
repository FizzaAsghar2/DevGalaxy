import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Check, Crown, Sparkles } from 'lucide-react'
import { useSession } from '../auth/AuthProvider'
import { useAccount } from '../account/AccountProvider'
import { DEFAULT_PLANS, formatPrice } from '../lib/plans'

export default function Pricing() {
  const { isSignedIn, signUp } = useSession()
  const { account } = useAccount()
  const plans = account?.plans?.length ? account.plans : DEFAULT_PLANS
  const currentId = account?.plan?.id

  const choose = (plan) => {
    if (!isSignedIn) return signUp('/pricing')
    if (plan.id === 'free') return undefined
    // Paid access is granted only by a verified payment-provider webhook on the server.
    if (!account?.billingConfigured) {
      toast('Checkout is not connected yet. Pro can be granted by an administrator in the meantime.', { icon: '🛰️', duration: 5000 })
      return undefined
    }
    toast('Redirecting to secure checkout…')
    return undefined
  }

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
      <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <span className="chip bg-white/[0.06]"><Sparkles className="h-3.5 w-3.5 text-violet-300" /> Plans</span>
        <h1 className="mt-4 font-display text-4xl">Explore more universes</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-400">Start with one complete galaxy and UI preview for free. Upgrade when you&rsquo;re ready to design every idea.</p>
      </motion.header>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {plans.map((plan, i) => {
          const pro = plan.id !== 'free'
          const current = currentId === plan.id
          return (
            <motion.article
              key={plan.id}
              id={plan.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
              className={`relative overflow-hidden rounded-3xl p-6 ${pro ? 'glass-strong border-violet-400/30' : 'glass'}`}
            >
              {pro && <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl" />}
              <div className="relative">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-xl text-white">{pro && <Crown className="h-5 w-5 text-amber-300" />}{plan.name}</h2>
                  {current && <span className="chip border-emerald-300/30 text-emerald-200">Current plan</span>}
                </div>
                <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>
                <p className="mt-5 font-display text-3xl text-white">{formatPrice(plan) ?? (pro ? 'Price set at launch' : '$0')}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-300">
                  {(plan.features ?? []).map((f) => (
                    <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{f}</li>
                  ))}
                </ul>
                <button type="button" onClick={() => choose(plan)} disabled={current} className={`mt-6 w-full py-2.5 ${pro ? 'btn-primary' : 'btn-ghost'} disabled:opacity-60`}>
                  {current ? 'Your plan' : pro ? 'Upgrade to Pro' : isSignedIn ? 'Included' : 'Start free'}
                </button>
              </div>
            </motion.article>
          )
        })}
      </div>
      <p className="mt-8 text-center text-xs text-slate-500">Limits are checked on the server before any AI request. Saved galaxies and previews always stay available.</p>
    </div>
  )
}
