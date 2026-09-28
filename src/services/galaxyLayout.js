import { CATEGORIES } from '../lib/categories'
import { itemsForCategory } from './architectureSchema'

const DEG = Math.PI / 180

export function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * Turns validated architecture data into the 3D layout: a core at the origin,
 * seven category planets on a tilted ring, and each category's items orbiting
 * their parent. Positions are deterministic so the galaxy is stable across
 * renders, reloads and presentation mode.
 */
export function buildGalaxyLayout(architecture) {
  const categories = CATEGORIES.map((category, index) => {
    const items = itemsForCategory(architecture, category.key)
    const angle = category.angle * DEG
    const radius = category.orbitRadius + 2.2
    const y = Math.sin(index * 1.7) * 1.1

    const position = [Math.cos(angle) * radius, y, Math.sin(angle) * radius]

    const childRadius = Math.min(5.2, 2.6 + items.length * 0.22)
    const children = items.map((item, childIndex) => {
      const childAngle = (childIndex / Math.max(1, items.length)) * Math.PI * 2 + index
      // Alternating height keeps labels from colliding on dense categories.
      const tilt = Math.sin(childIndex * 1.3) * 0.5 + (childIndex % 2 ? 0.75 : -0.75)
      return {
        id: `${category.key}:${slug(item.name) || childIndex}`,
        name: item.name,
        categoryKey: category.key,
        color: category.color,
        data: item,
        position: [
          position[0] + Math.cos(childAngle) * childRadius,
          position[1] + tilt,
          position[2] + Math.sin(childAngle) * childRadius,
        ],
      }
    })

    return {
      ...category,
      id: `category:${category.key}`,
      position,
      children,
      count: items.length,
    }
  })

  const relationshipEdges = (architecture?.relationships ?? [])
    .map((rel) => {
      const tables = categories.find((category) => category.key === 'database')?.children ?? []
      const from = tables.find((child) => child.name.toLowerCase() === rel.from.toLowerCase())
      const to = tables.find((child) => child.name.toLowerCase() === rel.to.toLowerCase())
      if (!from || !to) return null
      return { id: `rel:${from.id}->${to.id}`, from, to, type: rel.type }
    })
    .filter(Boolean)

  return { categories, relationshipEdges }
}

export function findNode(layout, nodeId) {
  for (const category of layout.categories) {
    if (category.id === nodeId) return { kind: 'category', node: category }
    const child = category.children.find((item) => item.id === nodeId)
    if (child) return { kind: 'child', node: child, category }
  }
  return null
}

export function searchLayout(layout, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const results = []
  for (const category of layout.categories) {
    if (category.label.toLowerCase().includes(needle)) {
      results.push({ id: category.id, label: category.label, categoryKey: category.key, kind: 'category' })
    }
    for (const child of category.children) {
      if (child.name.toLowerCase().includes(needle)) {
        results.push({ id: child.id, label: child.name, categoryKey: category.key, kind: 'child' })
      }
    }
  }
  return results.slice(0, 12)
}
