import { createClerkClient, verifyToken } from '@clerk/backend'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_PLANS, USAGE_ACTIONS, decideEntitlement } from '../../src/lib/plans.js'

/**
 * Server-side identity, plan and usage. Nothing here trusts the browser: the
 * user id comes from a verified Clerk token, role/status from `profiles`, and
 * the plan from `subscriptions` — all read with the server-only service key.
 */

let adminDb = null

export function isManaged() {
  return Boolean(process.env.CLERK_SECRET_KEY && supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
}

export function db() {
  if (!adminDb) {
    adminDb = createClient(supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return adminDb
}

/** @returns {Promise<{ userId: string } | null>} null when the token is missing or invalid. */
export async function authenticate(req) {
  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) return { userId: 'anonymous', enforced: false }
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  try {
    const payload = await verifyToken(token, { secretKey })
    return payload.sub ? { userId: payload.sub, enforced: true } : null
  } catch {
    return null
  }
}

async function ensureProfile(userId) {
  const { data: existing, error } = await db().from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  if (existing) {
    db().from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId).then(() => {})
    return existing
  }

  let email = null
  let fullName = null
  let avatar = null
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const user = await clerk.users.getUser(userId)
    const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0]
    // Only a verified address is stored, so nobody can claim someone else's email.
    email = primary?.verification?.status === 'verified' ? primary.emailAddress.toLowerCase() : null
    fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || null
    avatar = user.imageUrl ?? null
  } catch (error) {
    console.error('Clerk user lookup failed', error?.message)
  }

  // New profiles are always plain users. Admin is granted only via SQL by the owner.
  const { data, error: insertError } = await db()
    .from('profiles')
    .upsert({ id: userId, email, full_name: fullName, avatar_url: avatar, role: 'user', account_status: 'active', last_seen_at: new Date().toISOString() }, { onConflict: 'id', ignoreDuplicates: true })
    .select('*')
    .maybeSingle()
  if (insertError) throw insertError
  if (data) return data
  const { data: again } = await db().from('profiles').select('*').eq('id', userId).single()
  return again
}

export async function loadPlans() {
  const { data, error } = await db().from('plans').select('*').order('sort_order')
  if (error || !data?.length) return DEFAULT_PLANS
  return data
}

export async function loadAccount(userId) {
  const profile = await ensureProfile(userId)
  const plans = await loadPlans()
  const nowIso = new Date().toISOString()
  const { data: subscription } = await db()
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .or(`current_period_end.is.null,current_period_end.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const planId = subscription?.plan_id ?? 'free'
  const plan = plans.find((p) => p.id === planId) ?? plans.find((p) => p.id === 'free') ?? DEFAULT_PLANS[0]
  // Free allowances are lifetime; paid allowances reset each billing period.
  const periodStart = subscription && planId !== 'free' ? subscription.current_period_start : null

  let query = db().from('usage_events').select('action_type').eq('user_id', userId)
  if (periodStart) query = query.gte('created_at', periodStart)
  const { data: events } = await query
  const usage = Object.fromEntries(Object.keys(USAGE_ACTIONS).map((key) => [key, 0]))
  for (const event of events ?? []) usage[event.action_type] = (usage[event.action_type] ?? 0) + 1

  return { profile, plan, plans, subscription: subscription ?? null, usage, periodStart }
}

export function entitlementFor(account, action) {
  return decideEntitlement({ role: account.profile.role, status: account.profile.account_status, plan: account.plan, usage: account.usage, action })
}

/**
 * Atomically reserves one unit of usage in Postgres (advisory-locked per user).
 * Returns the usage event id, or throws { code: 'upgrade_required' }.
 */
export async function reserveUsage(account, action, galaxyId = null) {
  const decision = entitlementFor(account, action)
  if (!decision.allowed) {
    const error = new Error(decision.reason)
    error.code = decision.reason
    throw error
  }
  const limitKey = USAGE_ACTIONS[action].limit
  const pool = Object.entries(USAGE_ACTIONS).filter(([, spec]) => spec.limit === limitKey).map(([key]) => key)
  const { data, error } = await db().rpc('reserve_usage', {
    p_user_id: account.profile.id,
    p_action: action,
    p_pool: pool,
    p_limit: decision.unlimited ? null : decision.limit,
    p_since: account.periodStart,
    p_galaxy_id: galaxyId,
  })
  if (error) {
    const limitError = new Error(/usage_limit_reached/.test(error.message) ? 'upgrade_required' : 'usage_error')
    limitError.code = limitError.message
    throw limitError
  }
  return data
}

export async function releaseUsage(eventId) {
  if (eventId) await db().from('usage_events').delete().eq('id', eventId)
}

export async function attachUsage(eventId, galaxyId, metadata = {}) {
  if (eventId) await db().from('usage_events').update({ galaxy_id: galaxyId, metadata }).eq('id', eventId)
}

export function summariseAccount(account) {
  const entitlements = Object.fromEntries(Object.keys(USAGE_ACTIONS).map((action) => [action, entitlementFor(account, action)]))
  return {
    mode: 'managed',
    user: {
      id: account.profile.id,
      email: account.profile.email,
      name: account.profile.full_name,
      role: account.profile.role,
      status: account.profile.account_status,
    },
    plan: account.plan,
    plans: account.plans.filter((p) => p.is_active !== false),
    subscription: account.subscription
      ? { status: account.subscription.status, provider: account.subscription.provider, current_period_end: account.subscription.current_period_end }
      : null,
    usage: account.usage,
    entitlements,
    billingConfigured: Boolean(process.env.BILLING_PROVIDER && process.env.BILLING_WEBHOOK_SECRET),
  }
}

/** Shared guard: returns the managed account, or writes the error response and returns null. */
export async function requireAccount(req, res) {
  const auth = await authenticate(req)
  if (!auth) {
    res.status(401).json({ error: 'Sign in to continue.', code: 'unauthenticated' })
    return null
  }
  const account = await loadAccount(auth.userId)
  if (account.profile.account_status === 'suspended') {
    res.status(403).json({ error: 'This account is suspended. Contact support.', code: 'suspended' })
    return null
  }
  return account
}
