/**
 * Normalises and validates architecture JSON coming from the AI (or from an
 * older saved galaxy) into the exact shape the galaxy renderer expects.
 * The AI is untrusted input: anything missing or malformed is coerced or
 * dropped rather than allowed to crash the visualisation.
 */

const MAX_ITEMS = 24
const MAX_FIELDS = 30

function str(value, fallback = '') {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return fallback
}

function arr(value) {
  return Array.isArray(value) ? value : []
}

function namedList(value, extra = () => ({})) {
  const seen = new Set()
  return arr(value)
    .map((raw) => {
      const item = typeof raw === 'string' ? { name: raw } : (raw ?? {})
      const name = str(item.name ?? item.title ?? item.label)
      if (!name) return null
      return { name, description: str(item.description ?? item.purpose), ...extra(item) }
    })
    .filter((item) => {
      if (!item) return false
      const key = item.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, MAX_ITEMS)
}

function stringList(value) {
  return arr(value)
    .map((item) => str(typeof item === 'string' ? item : (item?.name ?? '')))
    .filter(Boolean)
    .slice(0, MAX_ITEMS)
}

function normaliseTables(value) {
  return arr(value)
    .map((raw) => {
      const name = str(raw?.name)
      if (!name) return null
      const fields = arr(raw?.fields)
        .map((field) =>
          typeof field === 'string'
            ? { name: str(field), type: '' }
            : { name: str(field?.name), type: str(field?.type) },
        )
        .filter((field) => field.name)
        .slice(0, MAX_FIELDS)
      return { name, description: str(raw?.description), fields }
    })
    .filter(Boolean)
    .slice(0, MAX_ITEMS)
}

function normaliseRelationships(value, tableNames) {
  const known = new Set(tableNames.map((name) => name.toLowerCase()))
  return arr(value)
    .map((raw) => ({
      from: str(raw?.from ?? raw?.source),
      to: str(raw?.to ?? raw?.target),
      type: str(raw?.type, 'one-to-many'),
    }))
    .filter((rel) => rel.from && rel.to && known.has(rel.from.toLowerCase()) && known.has(rel.to.toLowerCase()))
    .slice(0, 40)
}

export function normaliseArchitecture(input, fallbackName = 'Untitled Project') {
  const data = input && typeof input === 'object' ? input : {}
  const tables = normaliseTables(data.database?.tables)

  return {
    projectName: str(data.projectName ?? data.name, fallbackName) || fallbackName,
    description: str(data.description),
    pages: namedList(data.pages),
    features: namedList(data.features, (item) => ({
      relatedPages: stringList(item.relatedPages),
      relatedRoles: stringList(item.relatedRoles),
    })),
    userRoles: namedList(data.userRoles ?? data.roles, (item) => ({
      permissions: stringList(item.permissions),
    })),
    frontend: stringList(data.frontend),
    backend: stringList(data.backend),
    database: {
      type: str(data.database?.type, 'PostgreSQL') || 'PostgreSQL',
      tables,
    },
    apis: namedList(data.apis, (item) => ({ purpose: str(item.purpose ?? item.description) })),
    relationships: normaliseRelationships(data.relationships ?? data.database?.relationships, tables.map((t) => t.name)),
  }
}

/** A galaxy needs a name plus at least one explorable category to be worth rendering. */
export function validateArchitecture(architecture) {
  const errors = []
  if (!architecture.projectName) errors.push('Missing project name.')

  const populated =
    architecture.pages.length +
    architecture.features.length +
    architecture.userRoles.length +
    architecture.database.tables.length +
    architecture.apis.length

  if (populated === 0) errors.push('The AI response contained no architecture items.')
  return { valid: errors.length === 0, errors }
}

export function itemsForCategory(architecture, key) {
  if (!architecture) return []
  switch (key) {
    case 'pages':
      return architecture.pages
    case 'features':
      return architecture.features
    case 'users':
      return architecture.userRoles
    case 'database':
      return architecture.database.tables
    case 'apis':
      return architecture.apis
    case 'frontend':
      return architecture.frontend.map((name) => ({ name }))
    case 'backend':
      return architecture.backend.map((name) => ({ name }))
    default:
      return []
  }
}

export function countNodes(architecture) {
  if (!architecture) return 0
  const categories = 7
  return (
    1 +
    categories +
    architecture.pages.length +
    architecture.features.length +
    architecture.userRoles.length +
    architecture.database.tables.length +
    architecture.apis.length +
    architecture.frontend.length +
    architecture.backend.length
  )
}

export function architectureStats(architecture) {
  return {
    pages: architecture?.pages.length ?? 0,
    features: architecture?.features.length ?? 0,
    roles: architecture?.userRoles.length ?? 0,
    tables: architecture?.database.tables.length ?? 0,
    apis: architecture?.apis.length ?? 0,
    nodes: countNodes(architecture),
  }
}
