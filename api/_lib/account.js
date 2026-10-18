import { createClerkClient, verifyToken } from '@clerk/backend'
import { createClient } from '@supabase/supabase-js'
import { decideBudget, estimateCents, monthStart, tokenCostCents } from '../../src/lib/usage.js'
import { isAiConfigured } from './ai.js'

/**
 * Server-side identity, role and AI usage. Nothing here trusts the browser: the
 * user id comes from a verified Clerk token and role/status from `profiles`,
 * both read with the server-only service key.
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

export function monthlyBudgetCents() {
  const usd = Number(process.env.AI_MONTHLY_BUDGET_USD)
  return Number.isFinite(usd) && usd >= 0 && process.env.AI_MONTHLY_BUDGET_USD !== '' ? Math.round(usd * 100) : null
}

async function spentThisMonthCents() {
  const { data } = await db().from('usage_events').select('cost_cents').gte('created_at', monthStart())
  return (data ?? []).reduce((sum, row) => sum + (row.cost_cents ?? 0), 0)
}

export async function loadAccount(userId) {
  const profile = await ensureProfile(userId)
  const since = new Date(Date.now() - 31 * 864e5).toISOString()
  const [{ data: events }, spentCents] = await Promise.all([
    db().from('usage_events').select('action_type, cost_cents, tokens, created_at, metadata').eq('user_id', userId).gte('created_at', since).order('created_at', { ascending: false }).limit(500),
    spentThisMonthCents(),
  ])
  return { profile, events: (events ?? []).map(({ metadata, ...e }) => ({ ...e, source: metadata?.source ?? null })), spentCents }
}

export function budgetFor(account) {
  return decideBudget({ status: account.profile.account_status, spentCents: account.spentCents, budgetCents: monthlyBudgetCents(), ai: isAiConfigured() })
}

/**
 * Atomically records one usage event in Postgres (advisory-locked) with its
 * estimated cost, refusing when the monthly AI budget is already spent.
 * Returns the event id, or throws { code: 'budget_reached' | 'suspended' }.
 */
export async function reserveUsage(account, action, galaxyId = null) {
  const decision = budgetFor(account)
  if (!decision.allowed) {
    const error = new Error(decision.reason)
    error.code = decision.reason
    throw error
  }
  const ai = isAiConfigured()
  const { data, error } = await db().rpc('reserve_usage', {
    p_user_id: account.profile.id,
    p_action: action,
    p_cost_cents: estimateCents(action, ai),
    p_budget_cents: ai ? monthlyBudgetCents() : null,
    p_since: monthStart(),
    p_galaxy_id: galaxyId,
  })
  if (error) {
    const budgetError = new Error(/budget_reached/.test(error.message) ? 'budget_reached' : 'usage_error')
    budgetError.code = budgetError.message
    throw budgetError
  }
  return data
}

export async function releaseUsage(eventId) {
  if (eventId) await db().from('usage_events').delete().eq('id', eventId)
}

/** Stores metadata and, when the provider reported tokens, the measured token count and cost. */
export async function attachUsage(eventId, galaxyId, metadata = {}, tokens = null) {
  if (!eventId) return
  const changes = { galaxy_id: galaxyId, metadata }
  if (tokens) {
    changes.tokens = tokens
    const measured = tokenCostCents(tokens, Number(process.env.AI_USD_PER_MILLION_TOKENS))
    if (measured != null) changes.cost_cents = measured
  }
  await db().from('usage_events').update(changes).eq('id', eventId)
}

export function summariseAccount(account) {
  const isAdmin = account.profile.role === 'admin'
  return {
    mode: 'managed',
    user: {
      id: account.profile.id,
      email: account.profile.email,
      name: account.profile.full_name,
      role: account.profile.role,
      status: account.profile.account_status,
    },
    events: account.events,
    aiConfigured: isAiConfigured(),
    budget: {
      ...budgetFor(account),
      budgetCents: monthlyBudgetCents(),
      // Total AI spend across the workspace is shown to the owner only.
      spentCents: isAdmin ? account.spentCents : null,
    },
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
