import { Boxes, Cloud, Database, Layers, Plug, Sparkles, Users } from 'lucide-react'

/**
 * Single source of truth for the seven architecture categories: colour, icon,
 * orbit geometry and the accessor that pulls its items out of architecture data.
 */
export const CATEGORIES = [
  {
    key: 'pages',
    label: 'Pages',
    icon: Layers,
    color: '#a78bfa',
    glyph: '▤',
    orbitRadius: 6.2,
    angle: -90,
    describe: (item) => item.description,
  },
  {
    key: 'features',
    label: 'Features',
    icon: Sparkles,
    color: '#60a5fa',
    glyph: '✦',
    orbitRadius: 6.8,
    angle: -25,
    describe: (item) => item.description,
  },
  {
    key: 'database',
    label: 'Database',
    icon: Database,
    color: '#34d399',
    glyph: '▦',
    orbitRadius: 7.4,
    angle: 35,
    describe: (item) => `${item.fields?.length ?? 0} fields`,
  },
  {
    key: 'apis',
    label: 'APIs',
    icon: Plug,
    color: '#fb923c',
    glyph: '⚡',
    orbitRadius: 6.5,
    angle: 95,
    describe: (item) => item.purpose,
  },
  {
    key: 'users',
    label: 'Users',
    icon: Users,
    color: '#f87171',
    glyph: '◍',
    orbitRadius: 7.1,
    angle: 155,
    describe: (item) => `${item.permissions?.length ?? 0} permissions`,
  },
  {
    key: 'frontend',
    label: 'Frontend',
    icon: Boxes,
    color: '#fbbf24',
    glyph: '◈',
    orbitRadius: 5.9,
    angle: 205,
    describe: () => 'Client technology',
  },
  {
    key: 'backend',
    label: 'Backend',
    icon: Cloud,
    color: '#38bdf8',
    glyph: '◉',
    orbitRadius: 6.6,
    angle: 250,
    describe: () => 'Server technology',
  },
]

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

export function categoryColor(key) {
  return CATEGORY_BY_KEY[key]?.color ?? '#8b5cf6'
}
