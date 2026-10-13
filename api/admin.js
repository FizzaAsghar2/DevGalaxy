import { db, isManaged, requireAccount } from './_lib/account.js'
import { readBody, send } from './_lib/http.js'

/**
 * Admin API. Every request re-verifies the Clerk session and re-reads the
 * caller's role from the database; nothing from the browser (role flags,
 * localStorage, URL) is trusted. All mutations are written to admin_audit_logs.
 *
 * GET  ?resource=stats|users|galaxies|plans|audit
 * POST { resource: 'user', action, userId, planId? }   change_plan | grant_pro | revoke_pro | suspend | reactivate
 * POST { resource: 'galaxy', action: 'delete', galaxyId, reason }
 * POST { resource: 'plan', action: 'update', planId, changes }
 */

const PLAN_FIELDS = ['name', 'tagline', 'price_cents', 'currency', 'billing_interval', 'galaxy_limit', 'ui_limit', 'regeneration_limit', 'features', 'is_active']

async function audit(admin, action, targetType, targetId, details = {}) {
  await db().from('admin_audit_logs').insert({ admin_id: admin.profile.id, action, target_type: targetType, target_id: targetId, details })
}

async function stats() {
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  const count = (table, apply = (q) => q) => apply(db().from(table).select('*', { count: 'exact', head: true })).then((r) => r.count ?? 0)
  const [users, galaxies, galaxiesToday, uiPreviews, activeSubs, usageTotal] = await Promise.all([
    count('profiles'),
    count('galaxies'),
    count('galaxies', (q) => q.gte('created_at', since.toISOString())),
    count('usage_events', (q) => q.in('action_type', ['UI_GENERATION', 'UI_REGENERATION', 'DESIGN_VARIATION', 'AI_UI_CUSTOMIZATION'])),
    count('subscriptions', (q) => q.in('status', ['active', 'trialing']).neq('plan_id', 'free')),
    count('usage_events'),
  ])
  const { data: byAction } = await db().from('usage_events').select('action_type').gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString())
  const usage30d = {}
  for (const row of byAction ?? []) usage30d[row.action_type] = (usage30d[row.action_type] ?? 0) + 1
  const { data: recentUsers } = await db().from('profiles').select('id, email, full_name, role, created_at').order('created_at', { ascending: false }).limit(6)
  const { data: recentGalaxies } = await db().from('galaxies').select('id, project_name, user_id, created_at, complexity, generation_meta').order('created_at', { ascending: false }).limit(6)
  return { users, galaxies, galaxiesToday, uiPreviews, activeSubscriptions: activeSubs, paidUsers: activeSubs, freeUsers: Math.max(0, users - activeSubs), usageTotal, usage30d, recentUsers: recentUsers ?? [], recentGalaxies: recentGalaxies ?? [] }
}

async function users(query) {
  const { data, error } = await db().rpc('admin_user_overview')
  if (error) throw error
  const search = String(query.q ?? '').trim().toLowerCase()
  const filter = String(query.filter ?? 'all')
  return (data ?? []).filter((u) => {
    if (search && !`${u.email ?? ''} ${u.full_name ?? ''} ${u.id}`.toLowerCase().includes(search)) return false
    if (filter === 'free') return u.plan_id === 'free'
    if (filter === 'paid') return u.plan_id !== 'free'
    if (filter === 'admin') return u.role === 'admin'
    if (filter === 'active') return u.account_status === 'active'
    if (filter === 'suspended') return u.account_status === 'suspended'
    return true
  })
}

async function galaxies(query) {
  let q = db().from('galaxies').select('id, project_name, user_id, app_type, complexity, created_at, generation_meta, ui_data').order('created_at', { ascending: false }).limit(100)
  const search = String(query.q ?? '').trim()
  if (search) q = q.ilike('project_name', `%${search.replace(/[%_]/g, '')}%`)
  const { data, error } = await q
  if (error) throw error
  const ids = [...new Set((data ?? []).map((g) => g.user_id))]
  const { data: owners } = ids.length ? await db().from('profiles').select('id, email').in('id', ids) : { data: [] }
  const emailFor = Object.fromEntries((owners ?? []).map((o) => [o.id, o.email]))
  // Metadata only: admins can moderate without reading the private idea or architecture.
  return (data ?? []).map(({ ui_data: ui, ...g }) => ({ ...g, owner_email: emailFor[g.user_id] ?? null, has_ui: Boolean(ui) }))
}

async function setPlan(userId, planId) {
  const { data: plan } = await db().from('plans').select('id').eq('id', planId).maybeSingle()
  if (!plan) throw Object.assign(new Error('Unknown plan'), { status: 400 })
  await db().from('subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('user_id', userId).in('status', ['active', 'trialing'])
  if (planId !== 'free') {
    const { error } = await db().from('subscriptions').insert({ user_id: userId, plan_id: planId, status: 'active', provider: 'admin_grant', current_period_start: new Date().toISOString() })
    if (error) throw error
  }
}

function validInt(value) {
  return value === null || (Number.isInteger(value) && value >= 0 && value < 1e7)
}

export default async function handler(req, res) {
  if (!isManaged()) return send(res, 403, { error: 'The admin console requires the secure backend (Clerk + Supabase service role).', code: 'not_configured' })

  let admin
  try {
    admin = await requireAccount(req, res)
  } catch (error) {
    console.error('admin auth failed', error)
    return send(res, 500, { error: 'Could not verify your account.' })
  }
  if (!admin) return undefined
  if (admin.profile.role !== 'admin') return send(res, 403, { error: 'You do not have access to the admin console.', code: 'forbidden' })

  try {
    if (req.method === 'GET') {
      const query = req.query ?? Object.fromEntries(new URL(req.url, 'http://x').searchParams)
      switch (query.resource) {
        case 'stats': return send(res, 200, await stats())
        case 'users': return send(res, 200, { users: await users(query) })
        case 'galaxies': return send(res, 200, { galaxies: await galaxies(query) })
        case 'plans': return send(res, 200, { plans: (await db().from('plans').select('*').order('sort_order')).data ?? [] })
        case 'audit': return send(res, 200, { logs: (await db().from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(100)).data ?? [] })
        default: return send(res, 400, { error: 'Unknown resource.' })
      }
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return send(res, 405, { error: 'Method not allowed' })
    }

    const body = await readBody(req)
    if (body.resource === 'user') {
      const userId = typeof body.userId === 'string' ? body.userId : ''
      const { data: target } = await db().from('profiles').select('id, role, account_status').eq('id', userId).maybeSingle()
      if (!target) return send(res, 404, { error: 'User not found.' })
      switch (body.action) {
        case 'change_plan':
        case 'grant_pro':
        case 'revoke_pro': {
          const planId = body.action === 'grant_pro' ? 'pro' : body.action === 'revoke_pro' ? 'free' : String(body.planId ?? '')
          await setPlan(userId, planId)
          await audit(admin, body.action, 'user', userId, { planId })
          return send(res, 200, { ok: true })
        }
        case 'suspend':
        case 'reactivate': {
          if (userId === admin.profile.id) return send(res, 400, { error: 'You cannot suspend your own account.' })
          if (target.role === 'admin' && body.action === 'suspend') return send(res, 400, { error: 'Demote an admin in SQL before suspending them.' })
          const status = body.action === 'suspend' ? 'suspended' : 'active'
          await db().from('profiles').update({ account_status: status }).eq('id', userId)
          await audit(admin, body.action, 'user', userId, { status })
          return send(res, 200, { ok: true })
        }
        default:
          return send(res, 400, { error: 'Unknown action.' })
      }
    }

    if (body.resource === 'galaxy' && body.action === 'delete') {
      const galaxyId = typeof body.galaxyId === 'string' ? body.galaxyId : ''
      const { data: galaxy } = await db().from('galaxies').select('id, user_id, project_name').eq('id', galaxyId).maybeSingle()
      if (!galaxy) return send(res, 404, { error: 'Galaxy not found.' })
      await db().from('galaxies').delete().eq('id', galaxyId)
      await audit(admin, 'delete_galaxy', 'galaxy', galaxyId, { owner: galaxy.user_id, project_name: galaxy.project_name, reason: String(body.reason ?? '').slice(0, 300) })
      return send(res, 200, { ok: true })
    }

    if (body.resource === 'plan' && body.action === 'update') {
      const planId = typeof body.planId === 'string' ? body.planId : ''
      const changes = {}
      for (const [key, value] of Object.entries(body.changes ?? {})) {
        if (!PLAN_FIELDS.includes(key)) continue
        if (['price_cents', 'galaxy_limit', 'ui_limit', 'regeneration_limit'].includes(key) && !validInt(value)) return send(res, 400, { error: `${key} must be a whole number or empty.` })
        if (key === 'features' && (!Array.isArray(value) || value.some((f) => typeof f !== 'string'))) return send(res, 400, { error: 'features must be a list of text.' })
        if (key === 'billing_interval' && ![null, 'month', 'year'].includes(value)) return send(res, 400, { error: 'billing_interval must be month, year or empty.' })
        changes[key] = typeof value === 'string' ? value.slice(0, 200) : value
      }
      if (!Object.keys(changes).length) return send(res, 400, { error: 'Nothing to update.' })
      const { error } = await db().from('plans').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', planId)
      if (error) return send(res, 400, { error: 'Could not update the plan.' })
      await audit(admin, 'update_plan', 'plan', planId, changes)
      return send(res, 200, { ok: true })
    }

    return send(res, 400, { error: 'Unknown request.' })
  } catch (error) {
    console.error('admin request failed', error)
    return send(res, error.status ?? 500, { error: error.status ? error.message : 'Admin request failed.' })
  }
}
