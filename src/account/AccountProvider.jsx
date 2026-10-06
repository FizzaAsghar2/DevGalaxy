import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useSession } from '../auth/AuthProvider'
import { isDemoMode } from '../lib/config'
import { DEFAULT_PLANS, USAGE_ACTIONS, decideEntitlement } from '../lib/plans'
import UpgradeModal from '../components/ui/UpgradeModal'

const AccountContext = createContext(null)
const DEMO_USAGE_KEY = 'devgalaxy:demo-usage'

/**
 * Role, plan and usage for the signed-in user.
 *
 * Managed mode (Clerk + Supabase configured): everything comes from /api/me,
 * which reads the database with a verified session. This state only drives the
 * UI; every restricted action is re-checked on the server.
 *
 * Demo mode (no keys): a local simulation of the Free plan so the upgrade flow
 * can be explored. It grants nothing — there is no Pro or admin in demo mode.
 */
export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount must be used inside <AccountProvider>')
  return context
}

function emptyUsage() {
  return Object.fromEntries(Object.keys(USAGE_ACTIONS).map((key) => [key, 0]))
}

function readDemoUsage(userId) {
  try {
    return { ...emptyUsage(), ...(JSON.parse(localStorage.getItem(`${DEMO_USAGE_KEY}:${userId}`) ?? '{}')) }
  } catch {
    return emptyUsage()
  }
}

function demoAccount(userId) {
  const plan = DEFAULT_PLANS[0]
  const usage = readDemoUsage(userId)
  const entitlements = Object.fromEntries(
    Object.keys(USAGE_ACTIONS).map((action) => [action, decideEntitlement({ role: 'user', status: 'active', plan, usage, action })]),
  )
  return { mode: 'demo', user: { id: userId, role: 'user', status: 'active' }, plan, plans: DEFAULT_PLANS, usage, entitlements, subscription: null, billingConfigured: false }
}

export function AccountProvider({ children }) {
  const { isSignedIn, isLoaded, user, getToken } = useSession()
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [upgrade, setUpgrade] = useState(null)

  const refresh = useCallback(async () => {
    if (!isSignedIn || !user) {
      setAccount(null)
      setLoading(false)
      return
    }
    if (isDemoMode) {
      setAccount(demoAccount(user.id))
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const token = await getToken()
      const response = await fetch('/api/me', { headers: token ? { authorization: `Bearer ${token}` } : {} })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error ?? 'Could not load your account.')
      setAccount(payload.mode === 'managed' ? payload : null)
      setError(payload.mode === 'managed' ? null : 'The secure account backend is not configured.')
    } catch (err) {
      setAccount(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn, user])

  useEffect(() => {
    if (isLoaded) refresh()
  }, [isLoaded, refresh])

  const recordDemoUsage = useCallback(
    (action) => {
      if (!isDemoMode || !user) return
      const usage = readDemoUsage(user.id)
      usage[action] = (usage[action] ?? 0) + 1
      localStorage.setItem(`${DEMO_USAGE_KEY}:${user.id}`, JSON.stringify(usage))
      setAccount(demoAccount(user.id))
    },
    [user],
  )

  const resetDemoUsage = useCallback(() => {
    if (!isDemoMode || !user) return
    localStorage.removeItem(`${DEMO_USAGE_KEY}:${user.id}`)
    setAccount(demoAccount(user.id))
  }, [user])

  const value = useMemo(() => {
    const entitlement = (action) => account?.entitlements?.[action] ?? { allowed: false, reason: 'unknown' }
    return {
      account,
      loading,
      error,
      refresh,
      isAdmin: account?.mode === 'managed' && account.user.role === 'admin',
      entitlement,
      /** Client-side pre-check that opens the upgrade modal. The server enforces the real limit. */
      ensure: (action) => {
        const decision = entitlement(action)
        if (decision.allowed) return true
        setUpgrade({ action, reason: decision.reason })
        return false
      },
      showUpgrade: (action, reason = 'upgrade_required') => setUpgrade({ action, reason }),
      recordDemoUsage,
      resetDemoUsage,
    }
  }, [account, error, loading, recordDemoUsage, refresh, resetDemoUsage])

  return (
    <AccountContext.Provider value={value}>
      {children}
      <UpgradeModal state={upgrade} account={account} onClose={() => setUpgrade(null)} onResetDemo={resetDemoUsage} />
    </AccountContext.Provider>
  )
}
