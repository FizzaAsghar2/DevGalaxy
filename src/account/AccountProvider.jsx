import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useSession } from '../auth/AuthProvider'
import { isDemoMode } from '../lib/config'
import { summariseUsage } from '../lib/usage'

const AccountContext = createContext(null)
const DEMO_USAGE_KEY = 'devgalaxy:demo-usage-log'

/**
 * Role, AI usage and budget status for the signed-in user.
 *
 * Managed mode (Clerk + Supabase configured): everything comes from /api/me,
 * which reads the database with a verified session. This state only drives the
 * UI; the budget is re-checked on the server before every AI call.
 *
 * Demo mode (no keys): generations run offline and cost nothing; a local log
 * in this browser lets the usage dashboard be explored.
 */
export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount must be used inside <AccountProvider>')
  return context
}

function readDemoLog(userId) {
  try {
    const log = JSON.parse(localStorage.getItem(`${DEMO_USAGE_KEY}:${userId}`) ?? '[]')
    return Array.isArray(log) ? log : []
  } catch {
    return []
  }
}

function demoAccount(userId, aiConfigured = false) {
  return {
    mode: 'demo',
    user: { id: userId, role: 'user', status: 'active' },
    events: readDemoLog(userId),
    aiConfigured,
    budget: { allowed: true, remainingCents: null, budgetCents: null, spentCents: null },
  }
}

export function AccountProvider({ children }) {
  const { isSignedIn, isLoaded, user, getToken } = useSession()
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!isSignedIn || !user) {
      setAccount(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const token = isDemoMode ? null : await getToken()
      const response = await fetch('/api/me', { headers: token ? { authorization: `Bearer ${token}` } : {} })
      const payload = await response.json().catch(() => ({}))
      if (isDemoMode) {
        setAccount(demoAccount(user.id, Boolean(payload.aiConfigured)))
        setError(null)
        return
      }
      if (!response.ok) throw new Error(payload.error ?? 'Could not load your account.')
      setAccount(payload.mode === 'managed' ? payload : null)
      setError(payload.mode === 'managed' ? null : 'The secure account backend is not configured.')
    } catch (err) {
      if (isDemoMode) {
        setAccount(demoAccount(user.id))
        setError(null)
      } else {
        setAccount(null)
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn, user])

  useEffect(() => {
    if (isLoaded) refresh()
  }, [isLoaded, refresh])

  const recordDemoUsage = useCallback(
    (action, source = 'demo') => {
      if (!isDemoMode || !user) return
      const log = [{ action_type: action, cost_cents: 0, tokens: null, source, created_at: new Date().toISOString() }, ...readDemoLog(user.id)].slice(0, 500)
      localStorage.setItem(`${DEMO_USAGE_KEY}:${user.id}`, JSON.stringify(log))
      setAccount((current) => ({ ...(current ?? demoAccount(user.id)), events: log }))
    },
    [user],
  )

  const clearDemoUsage = useCallback(() => {
    if (!isDemoMode || !user) return
    localStorage.removeItem(`${DEMO_USAGE_KEY}:${user.id}`)
    setAccount((current) => ({ ...(current ?? demoAccount(user.id)), events: [] }))
  }, [user])

  const value = useMemo(
    () => ({
      account,
      loading,
      error,
      refresh,
      isAdmin: account?.mode === 'managed' && account.user.role === 'admin',
      usage: summariseUsage(account?.events ?? []),
      /** Client-side pre-check; the server enforces the real budget. */
      ensure: () => {
        const budget = account?.budget
        if (!budget || budget.allowed) return true
        toast.error(budget.reason === 'suspended' ? 'This account is suspended.' : 'This month’s AI budget is used up.')
        return false
      },
      recordDemoUsage,
      clearDemoUsage,
    }),
    [account, clearDemoUsage, error, loading, recordDemoUsage, refresh],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
