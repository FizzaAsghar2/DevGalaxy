import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { USAGE_ACTIONS, tokenCostCents } from '../../src/lib/usage.js'
import { db } from './account.js'

/**
 * Personal AI cost control for Galaxy Studio: per-request, daily and monthly
 * limits from server env vars. Managed deployments record usage in Postgres;
 * local/unmanaged ones keep a ledger file (or memory where the disk is read-only).
 */

const LEDGER_FILE = resolve(process.cwd(), '.devgalaxy', 'usage-ledger.json')
let memoryLedger = null

function usd(name) {
  const raw = process.env[name]
  const value = Number(raw)
  return raw !== undefined && raw !== '' && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null
}

export function limits() {
  return { requestCents: usd('AI_MAX_REQUEST_USD'), dailyCents: usd('AI_DAILY_BUDGET_USD'), monthlyCents: usd('AI_MONTHLY_BUDGET_USD'), usdPerMillion: Number(process.env.AI_USD_PER_MILLION_TOKENS) || null }
}

/** Caps the response size so one request cannot exceed the per-request limit. */
export function maxTokensFor(defaultTokens) {
  const { requestCents, usdPerMillion } = limits()
  if (requestCents == null || !usdPerMillion) return defaultTokens
  return Math.max(256, Math.min(defaultTokens, Math.floor(((requestCents / 100) / usdPerMillion) * 1e6 * 0.6)))
}

export function costCents(action, tokens) {
  return tokenCostCents(tokens, limits().usdPerMillion) ?? USAGE_ACTIONS[action]?.estCents ?? 0
}

const dayStart = () => new Date(new Date().toISOString().slice(0, 10)).toISOString()
const monthStartIso = () => `${new Date().toISOString().slice(0, 7)}-01T00:00:00.000Z`

function readLedger() {
  if (memoryLedger) return memoryLedger
  try {
    memoryLedger = JSON.parse(readFileSync(LEDGER_FILE, 'utf8'))
  } catch {
    memoryLedger = []
  }
  if (!Array.isArray(memoryLedger)) memoryLedger = []
  return memoryLedger
}

function persistLedger() {
  try {
    mkdirSync(dirname(LEDGER_FILE), { recursive: true })
    writeFileSync(LEDGER_FILE, JSON.stringify(memoryLedger.slice(0, 2000)))
  } catch {
    // Read-only filesystem (serverless): the in-memory ledger is used for this instance.
  }
}

async function spentSince(since, managed) {
  if (managed) {
    const { data } = await db().from('usage_events').select('cost_cents').gte('created_at', since)
    return (data ?? []).reduce((sum, row) => sum + (row.cost_cents ?? 0), 0)
  }
  return readLedger().filter((e) => e.created_at >= since && e.status === 'ok').reduce((sum, e) => sum + (e.cost_cents ?? 0), 0)
}

/** @returns {Promise<{ allowed: boolean, reason?: string, spentTodayCents: number, spentMonthCents: number }>} */
export async function checkBudget(action, managed) {
  const { dailyCents, monthlyCents } = limits()
  const [spentTodayCents, spentMonthCents] = await Promise.all([spentSince(dayStart(), managed), spentSince(monthStartIso(), managed)])
  const next = USAGE_ACTIONS[action]?.estCents ?? 0
  if (dailyCents != null && spentTodayCents + next > dailyCents) return { allowed: false, reason: 'daily_budget_reached', spentTodayCents, spentMonthCents }
  if (monthlyCents != null && spentMonthCents + next > monthlyCents) return { allowed: false, reason: 'budget_reached', spentTodayCents, spentMonthCents }
  return { allowed: true, spentTodayCents, spentMonthCents }
}

/** Records one request in the local ledger (unmanaged mode). */
export function recordLocal(entry) {
  readLedger().unshift({ ...entry, created_at: new Date().toISOString() })
  persistLedger()
}

export function localLedger(limit = 200) {
  return readLedger().slice(0, limit)
}
