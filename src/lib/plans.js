/**
 * Single source of truth for plan defaults and usage actions. The database
 * `plans` table is authoritative in production (admins can edit it); these
 * defaults seed it and are shown when no backend is configured. Prices are
 * null until the owner configures them — the UI never invents a price.
 */

export const USAGE_ACTIONS = {
  GALAXY_GENERATION: { limit: 'galaxy_limit', label: 'Galaxy generations' },
  UI_GENERATION: { limit: 'ui_limit', label: 'UI previews' },
  UI_REGENERATION: { limit: 'regeneration_limit', label: 'UI regenerations' },
  DESIGN_VARIATION: { limit: 'regeneration_limit', label: 'Design variations' },
  AI_UI_CUSTOMIZATION: { limit: 'regeneration_limit', label: 'AI customisations' },
}

export const DEFAULT_PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try DevGalaxy with one complete project',
    price_cents: null,
    currency: 'usd',
    billing_interval: null,
    galaxy_limit: 1,
    ui_limit: 1,
    regeneration_limit: 0,
    features: ['1 architecture galaxy', '1 UI preview for that galaxy', 'Galaxy & presentation mode', 'Saved galaxies stay available'],
    is_active: true,
    sort_order: 0,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For builders exploring many ideas',
    price_cents: null,
    currency: 'usd',
    billing_interval: 'month',
    galaxy_limit: 50,
    ui_limit: 50,
    regeneration_limit: 200,
    features: ['50 galaxies per billing period', 'UI previews for every galaxy', 'UI regeneration & design variations', 'Natural-language UI customisation', 'Advanced complexity & future export tools'],
    is_active: true,
    sort_order: 1,
  },
]

export function formatPrice(plan) {
  if (plan?.price_cents == null) return null
  const amount = (plan.price_cents / 100).toLocaleString(undefined, { style: 'currency', currency: (plan.currency || 'usd').toUpperCase() })
  return plan.billing_interval ? `${amount} / ${plan.billing_interval}` : amount
}

/**
 * Pure entitlement decision shared by the server (authoritative) and the
 * client (display only). `usage` maps action → count in the current period.
 */
export function decideEntitlement({ role, status, plan, usage, action }) {
  const spec = USAGE_ACTIONS[action]
  if (!spec) return { allowed: false, reason: 'unknown_action' }
  if (status === 'suspended') return { allowed: false, reason: 'suspended' }
  if (role === 'admin') return { allowed: true, unlimited: true, remaining: null, limit: null }
  const limit = plan?.[spec.limit]
  if (limit == null) return { allowed: true, unlimited: true, remaining: null, limit: null }
  const used = Object.entries(usage ?? {})
    .filter(([key]) => USAGE_ACTIONS[key]?.limit === spec.limit)
    .reduce((sum, [, count]) => sum + (Number(count) || 0), 0)
  const remaining = Math.max(0, limit - used)
  return remaining > 0
    ? { allowed: true, remaining, limit, used }
    : { allowed: false, reason: 'upgrade_required', remaining: 0, limit, used }
}
