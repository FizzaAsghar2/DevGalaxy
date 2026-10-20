// @ts-check
import { COLOR_WORDS, buildPalette, isHex } from './tokens.js'
import { SECTION_TYPES, makeSection, normaliseSpec, hash, titleCase } from './spec.js'

/**
 * Offline editor: understands common editing requests and applies them to the
 * specification. Anything it cannot do is reported as unsupported rather than
 * silently ignored.
 * @param {import('./spec.js').SiteSpec} spec
 * @param {string} instruction
 * @returns {{ spec: import('./spec.js').SiteSpec, summary: string[], unsupported?: string }}
 */
export function applyOfflineEdit(spec, instruction) {
  const s = structuredClone(spec)
  const t = instruction.toLowerCase()
  /** @type {string[]} */
  const summary = []

  const hex = /#[0-9a-f]{6}\b/i.exec(instruction)?.[0]
  const colorWord = Object.keys(COLOR_WORDS).find((w) => new RegExp(`\\b${w}\\b`).test(t))
  if (/(colou?r|theme|palette|accent|primary|make it|switch to|change to)/.test(t) && (hex || colorWord) && !/section/.test(t.replace(/colou?r/g, ''))) {
    const color = hex ?? COLOR_WORDS[/** @type {string} */ (colorWord)]
    if (/background/.test(t)) s.palette = buildPalette({ primary: s.palette.primary, background: color })
    else s.palette = buildPalette({ primary: color, background: s.palette.background })
    summary.push(`Changed the ${/background/.test(t) ? 'background' : 'primary'} colour to ${hex ?? colorWord}.`)
  }
  if (/\b(dark mode|dark theme|make it dark|darker)\b/.test(t)) {
    s.palette = buildPalette({ primary: s.palette.primary, background: '#0c0c10' })
    summary.push('Switched to a dark theme.')
  } else if (/\b(light mode|light theme|make it light|lighter|brighter)\b/.test(t)) {
    s.palette = buildPalette({ primary: s.palette.primary, background: '#fbfaf7' })
    summary.push('Switched to a light theme.')
  }
  if (/font|typograph|typeface/.test(t)) {
    const choice = /serif|elegant|classic|luxur/.test(t) ? { heading: 'Playfair Display', body: 'Inter' }
      : /playful|friendly|round/.test(t) ? { heading: 'Poppins', body: 'DM Sans' }
        : /bold|creative|display/.test(t) ? { heading: 'Bricolage Grotesque', body: 'Space Grotesk' }
          : { heading: 'Space Grotesk', body: 'Inter' }
    s.typography = choice
    summary.push(`Changed fonts to ${choice.heading} (headings) and ${choice.body} (body).`)
  }
  if (/(nav|menu|header)/.test(t) && /(sticky|fixed|stick)/.test(t)) {
    s.navigation.sticky = !/not sticky|unstick|remove sticky/.test(t)
    summary.push(s.navigation.sticky ? 'Made the navigation bar sticky.' : 'Made the navigation bar scroll with the page.')
  }
  if (/(nav|menu)/.test(t) && /center|centre/.test(t)) {
    s.navigation.style = 'centered'
    summary.push('Centred the navigation links.')
  }
  if (/animation|motion/.test(t)) {
    if (/(no|disable|remove|turn off|stop)\s+(the\s+)?animation/.test(t)) s.animation = { level: 'none', speed: 1 }
    else if (/(reduce|slow|less|calmer|subtle)/.test(t)) s.animation = { level: 'subtle', speed: Math.max(0.25, +(s.animation.speed * 0.6).toFixed(2)) }
    else if (/(more|faster|speed up|livel|add)/.test(t)) s.animation = { level: 'rich', speed: Math.min(3, +(s.animation.speed * 1.4).toFixed(2)) }
    summary.push(`Animation set to ${s.animation.level}${s.animation.level !== 'none' ? ` at ${s.animation.speed}× speed` : ''}.`)
  }
  if (/card/.test(t) && /(smaller|compact|tiny)/.test(t)) {
    s.style.cardSize = 'sm'
    summary.push('Made the cards smaller (four per row on desktop).')
  } else if (/card/.test(t) && /(bigger|larger)/.test(t)) {
    s.style.cardSize = 'lg'
    summary.push('Made the cards larger (two per row on desktop).')
  }
  if (/(more|extra) (space|spacing|whitespace|breathing)|airier|spacious/.test(t)) {
    s.layout.density = 'spacious'
    summary.push('Increased section spacing.')
  } else if (/(less|tighter|reduce) (space|spacing|whitespace)|compact/.test(t) && !/card/.test(t)) {
    s.layout.density = 'compact'
    summary.push('Reduced section spacing.')
  }
  if (/(more )?rounded|softer corners/.test(t)) {
    s.layout.radius = 'lg'
    summary.push('Rounded the corners.')
  } else if (/sharp|square corners/.test(t)) {
    s.layout.radius = 'none'
    summary.push('Made the corners sharp.')
  }
  if (/premium|luxur|high-end|elegant/.test(t) && !/font/.test(t)) {
    s.typography = { heading: 'Playfair Display', body: 'Inter' }
    s.layout.density = 'spacious'
    s.layout.radius = 'sm'
    s.style.heroLayout = 'editorial'
    s.style.cardStyle = 'flat'
    s.style.mood = 'Premium and refined'
    s.animation = { level: 'subtle', speed: 0.8 }
    summary.push('Made the design more premium: editorial hero, serif headlines, more whitespace, finer corners and slower motion.')
  }
  const headline = /(headline|heading|hero title|title)\s+(?:to|as|=)\s+["“']?([^"”']{3,90})["”']?/i.exec(instruction)
  if (headline) {
    const hero = s.pages[0].sections.find((x) => x.type === 'hero')
    if (hero) {
      hero.title = headline[2].trim()
      summary.push(`Changed the hero headline to “${hero.title}”.`)
    }
  }

  const add = /\badd\s+(?:a\s+|an\s+|some\s+)?(\w+)(?:\s+section)?/.exec(t)
  if (add) {
    const type = sectionTypeFor(add[1])
    if (type) {
      const page = pageFor(s, t)
      const ref = /(below|after|under|above|before)\s+the\s+(\w+)/.exec(t)
      const refType = ref ? sectionTypeFor(ref[2]) : null
      let index = page.sections.length
      if (refType) {
        const at = page.sections.findIndex((x) => x.type === refType)
        if (at !== -1) index = /below|after|under/.test(/** @type {RegExpExecArray} */ (ref)[1]) ? at + 1 : at
      } else if (type !== 'contact' && page.sections.at(-1)?.type === 'contact') index -= 1
      page.sections.splice(index, 0, makeSection(type, { subject: s.subject, name: s.name, cards: 'Highlights', category: s.category, seed: hash(`${s.name}${type}${Date.now()}`) }))
      summary.push(`Added a ${type} section to ${page.name}${refType ? ` ${/** @type {RegExpExecArray} */ (ref)[1]} the ${refType} section` : ''}.`)
    }
  }
  const remove = /\b(?:remove|delete|hide)\s+(?:the\s+)?(\w+)(?:\s+section)?/.exec(t)
  if (remove) {
    const type = sectionTypeFor(remove[1])
    const page = pageFor(s, t)
    const at = type ? page.sections.findIndex((x) => x.type === type) : -1
    if (at !== -1 && type !== 'hero') {
      page.sections.splice(at, 1)
      summary.push(`Removed the ${type} section from ${page.name}.`)
    }
  }
  const addPage = /\badd\s+(?:a|an)\s+([\w ]{2,24}?)\s+page\b/.exec(t)
  if (addPage && s.pages.length < 8) {
    const name = titleCase(addPage[1].trim())
    s.pages.push({ id: name.toLowerCase().replace(/\W+/g, '-'), name, path: '', sections: [makeSection('about', { subject: s.subject, name: s.name, cards: 'Highlights', category: s.category, seed: hash(name) }), makeSection('cta', { subject: s.subject, name: s.name, cards: 'Highlights', category: s.category, seed: 1 })] })
    summary.push(`Added a ${name} page to the navigation.`)
  }

  const next = normaliseSpec(s)
  if (!summary.length) {
    return {
      spec,
      summary,
      unsupported: 'The offline editor could not understand that request. Try something like “make the navbar sticky”, “add testimonials below the cards”, “change the theme to emerald” or “use a more modern font” — or connect an AI provider in Settings for free-form edits.',
    }
  }
  return { spec: next, summary }
}

/** @param {string} word */
function sectionTypeFor(word) {
  const w = word.toLowerCase()
  const map = /** @type {Record<string, string>} */ ({
    testimonial: 'testimonials', testimonials: 'testimonials', reviews: 'testimonials', review: 'testimonials', pricing: 'pricing', prices: 'pricing', plans: 'pricing',
    faq: 'faq', faqs: 'faq', questions: 'faq', contact: 'contact', form: 'contact', team: 'team', speakers: 'team', stats: 'stats', numbers: 'stats',
    gallery: 'gallery', photos: 'gallery', about: 'about', story: 'about', features: 'features', benefits: 'features', steps: 'steps', process: 'steps',
    newsletter: 'cta', cta: 'cta', subscribe: 'cta', products: 'cards', product: 'cards', cards: 'cards', menu: 'cards', courses: 'cards', services: 'cards', hero: 'hero',
  })
  return map[w] ?? (SECTION_TYPES.includes(w) ? w : null)
}

/** @param {import('./spec.js').SiteSpec} s @param {string} t */
function pageFor(s, t) {
  return s.pages.find((p, i) => i > 0 && new RegExp(`\\b(on|to) the ${p.name.toLowerCase()}( page)?\\b`).test(t)) ?? s.pages[0]
}

/** Updates palette/typography/layout values coming from the design controls. @param {import('./spec.js').SiteSpec} spec @param {any} patch */
export function applyDesignPatch(spec, patch) {
  const s = structuredClone(spec)
  if (patch.palette) for (const [k, v] of Object.entries(patch.palette)) if (isHex(v)) /** @type {any} */ (s.palette)[k] = v
  if (patch.typography) s.typography = { ...s.typography, ...patch.typography }
  if (patch.layout) s.layout = { ...s.layout, ...patch.layout }
  if (patch.animation) s.animation = { ...s.animation, ...patch.animation }
  if (patch.navigation) s.navigation = { ...s.navigation, ...patch.navigation }
  if (patch.style) s.style = { ...s.style, ...patch.style }
  return normaliseSpec(s)
}
