/**
 * Shape of a generated UI prototype. The AI (or the offline generator) returns
 * a design system plus one spec per architecture page; every section is a
 * typed block rendered by the UI Preview. AI output is untrusted, so anything
 * unknown is coerced into a safe section rather than rendered as-is.
 */

export const SECTION_TYPES = [
  'hero', 'search', 'filters', 'cards', 'list', 'table', 'stats', 'chart', 'calendar', 'chat', 'timeline',
  'kanban', 'gallery', 'profile', 'form', 'stepper', 'summary', 'feed', 'progress', 'tabs', 'leaderboard',
  'map', 'upload', 'notifications', 'cta', 'session', 'auth', 'pricing', 'faq',
]

const SECTION_SET = new Set(SECTION_TYPES)
const HEX = /^#[0-9a-f]{6}$/i

export function pageSlug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function str(value, fallback = '', max = 280) {
  if (typeof value === 'string') return value.trim().slice(0, max)
  if (typeof value === 'number') return String(value)
  return fallback
}

function arr(value, max = 24) {
  return Array.isArray(value) ? value.slice(0, max) : []
}

function color(value, fallback) {
  return typeof value === 'string' && HEX.test(value.trim()) ? value.trim() : fallback
}

function scalar(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return value
  return str(value, '', 160)
}

function record(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { title: str(raw) }
  const out = {}
  for (const [key, value] of Object.entries(raw).slice(0, 14)) {
    if (Array.isArray(value)) out[key] = value.slice(0, 8).map(scalar)
    else if (value && typeof value === 'object') continue
    else out[key] = scalar(value)
  }
  return out
}

function normaliseSection(raw, index) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const requested = str(data.type).toLowerCase()
  const type = SECTION_SET.has(requested) ? requested : 'list'
  return {
    id: str(data.id) || `${type}-${index}`,
    type,
    title: str(data.title, '', 120),
    subtitle: str(data.subtitle ?? data.description, '', 240),
    variant: str(data.variant, '', 40),
    items: arr(data.items, 16).map(record),
    columns: arr(data.columns, 8).map((c) => str(c, '', 40)).filter(Boolean),
    fields: arr(data.fields, 10).map((f) =>
      typeof f === 'string' ? { label: f, type: 'text' } : { label: str(f?.label ?? f?.name, 'Field', 60), type: str(f?.type, 'text', 20), options: arr(f?.options, 8).map((o) => str(o, '', 40)) },
    ),
    actions: arr(data.actions, 4).map((a) => str(typeof a === 'string' ? a : a?.label, '', 40)).filter(Boolean),
    tabs: arr(data.tabs, 6).map((t) => str(t, '', 40)).filter(Boolean),
    placeholder: str(data.placeholder, '', 80),
    value: scalar(data.value ?? ''),
  }
}

export function normaliseUiSpec(input, architecture) {
  const data = input && typeof input === 'object' ? input : {}
  const d = data.uiDesign && typeof data.uiDesign === 'object' ? data.uiDesign : {}
  const theme = d.theme === 'light' ? 'light' : 'dark'
  const uiDesign = {
    appName: str(d.appName, architecture?.projectName ?? 'App', 60),
    style: str(d.style, 'Modern', 60),
    theme,
    primaryColor: color(d.primaryColor, '#6366f1'),
    secondaryColor: color(d.secondaryColor, '#0ea5e9'),
    accentColor: color(d.accentColor, '#f59e0b'),
    backgroundColor: color(d.backgroundColor, theme === 'light' ? '#f8fafc' : '#0b1020'),
    surfaceColor: color(d.surfaceColor, theme === 'light' ? '#ffffff' : '#131a2e'),
    textColor: color(d.textColor, theme === 'light' ? '#0f172a' : '#e2e8f0'),
    mutedColor: color(d.mutedColor, theme === 'light' ? '#64748b' : '#94a3b8'),
    fontStyle: str(d.fontStyle, 'sans', 30),
    borderRadius: ['none', 'small', 'medium', 'large', 'pill'].includes(d.borderRadius) ? d.borderRadius : 'medium',
    navigation: ['topbar', 'sidebar'].includes(d.navigation) ? d.navigation : 'topbar',
    density: ['compact', 'comfortable', 'spacious'].includes(d.density) ? d.density : 'comfortable',
    iconStyle: str(d.iconStyle, 'outline', 30),
    designReasoning: str(d.designReasoning, '', 400),
  }

  const seen = new Set()
  const uiPages = arr(data.uiPages, 16)
    .map((raw, index) => {
      const name = str(raw?.name, `Page ${index + 1}`, 60)
      let id = pageSlug(raw?.id || name) || `page-${index}`
      if (seen.has(id)) id = `${id}-${index}`
      seen.add(id)
      return {
        id,
        name,
        route: str(raw?.route, `/${id}`, 80),
        purpose: str(raw?.purpose, '', 240),
        layout: str(raw?.layout, 'stack', 30),
        architecturePage: str(raw?.architecturePage ?? name, name, 60),
        sections: arr(raw?.sections, 10).map(normaliseSection),
      }
    })
    .filter((page) => page.sections.length > 0)

  return {
    version: 1,
    variant: Number.isFinite(data.variant) ? data.variant : 0,
    uiDesign,
    uiPages,
    generatedAt: str(data.generatedAt) || new Date().toISOString(),
    source: str(data.source, 'ai', 20),
  }
}

export function validateUiSpec(spec) {
  return spec.uiPages.length > 0
}
