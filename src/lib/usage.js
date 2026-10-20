/**
 * Personal AI usage and spend tracking, shared by the server (authoritative)
 * and the browser (display only). DevGalaxy is for personal use: there are no
 * plans or billing, only an optional monthly AI budget for cost control.
 *
 * `estCents` is a conservative per-call estimate used when the provider does
 * not report token usage. Offline (no AI key) generations cost nothing.
 */
export const USAGE_ACTIONS = {
  GALAXY_GENERATION: { label: 'Galaxy generations', short: 'Galaxies', estCents: 2 },
  UI_GENERATION: { label: 'UI previews', short: 'UI previews', estCents: 3 },
  UI_REGENERATION: { label: 'UI regenerations', short: 'Regenerations', estCents: 3 },
  DESIGN_VARIATION: { label: 'Design variations', short: 'Variations', estCents: 3 },
  AI_UI_CUSTOMIZATION: { label: 'AI customisations', short: 'AI edits', estCents: 2 },
  STUDIO_PLAN: { label: 'Studio website plans', short: 'Plans', estCents: 2 },
  STUDIO_VARIATIONS: { label: 'Studio design variations', short: 'Directions', estCents: 3 },
  STUDIO_EDIT: { label: 'Studio AI edits', short: 'Studio edits', estCents: 4 },
}

export function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export function estimateCents(action, ai) {
  return ai ? (USAGE_ACTIONS[action]?.estCents ?? 0) : 0
}

/** Converts token counts to cents when a per-million-token price is configured. */
export function tokenCostCents(tokens, usdPerMillion) {
  if (!tokens || !(usdPerMillion > 0)) return null
  return Math.max(1, Math.round((tokens / 1e6) * usdPerMillion * 100))
}

export function formatCents(cents) {
  return ((cents ?? 0) / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

/** Pure budget decision. `budgetCents` null = no cap. */
export function decideBudget({ status, spentCents = 0, budgetCents = null, ai = true }) {
  if (status === 'suspended') return { allowed: false, reason: 'suspended' }
  if (!ai || budgetCents == null) return { allowed: true, remainingCents: null }
  const remainingCents = Math.max(0, budgetCents - spentCents)
  return remainingCents > 0 ? { allowed: true, remainingCents } : { allowed: false, reason: 'budget_reached', remainingCents: 0 }
}

/**
 * Summarises usage events ({ action_type, cost_cents, tokens, created_at, source })
 * into this month's totals and a daily series for the last `days` days.
 */
export function summariseUsage(events, { days = 14, now = new Date() } = {}) {
  const since = monthStart(now)
  const counts = Object.fromEntries(Object.keys(USAGE_ACTIONS).map((key) => [key, 0]))
  let monthCents = 0
  let monthTokens = 0
  let monthCalls = 0
  let aiCalls = 0
  const series = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    series.push({ date: d.toISOString().slice(0, 10), calls: 0, cents: 0 })
  }
  const byDate = Object.fromEntries(series.map((s) => [s.date, s]))
  for (const e of events ?? []) {
    const at = new Date(e.created_at).toISOString()
    const day = byDate[at.slice(0, 10)]
    if (day) {
      day.calls += 1
      day.cents += e.cost_cents ?? 0
    }
    if (at < since) continue
    monthCalls += 1
    counts[e.action_type] = (counts[e.action_type] ?? 0) + 1
    monthCents += e.cost_cents ?? 0
    monthTokens += e.tokens ?? 0
    if (e.source === 'ai') aiCalls += 1
  }
  const recent = [...(events ?? [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 12)
  return { counts, monthCents, monthTokens, monthCalls, aiCalls, series, recent }
}
