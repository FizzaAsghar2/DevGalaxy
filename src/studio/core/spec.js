// @ts-check
import { COLOR_WORDS, FONT_NAMES, RADII, DENSITY, buildPalette, isHex, shiftHue, mix } from './tokens.js'

/**
 * Website specification: the structured plan produced from a prompt (offline or
 * by the AI planner), edited by the user, and turned into code by codegen.js.
 */

export const CATEGORIES = ['Business', 'Portfolio', 'SaaS landing page', 'E-commerce frontend', 'Agency', 'Restaurant', 'Education', 'Blog or magazine', 'Dashboard UI', 'Personal brand', 'Event website', 'Custom']
export const FRAMEWORKS = /** @type {const} */ ({ 'react-vite': 'React + Vite + TypeScript', nextjs: 'Next.js (App Router) + TypeScript' })
export const SECTION_TYPES = ['hero', 'features', 'cards', 'gallery', 'testimonials', 'pricing', 'about', 'stats', 'team', 'faq', 'contact', 'cta', 'steps']
export const HERO_LAYOUTS = ['centered', 'split', 'editorial']
export const CARD_STYLES = ['bordered', 'elevated', 'flat']

/**
 * @typedef {{ title: string, text?: string, meta?: string, price?: string, tag?: string }} SectionItem
 * @typedef {{ id: string, type: string, title: string, subtitle?: string, items?: SectionItem[] }} Section
 * @typedef {{ id: string, name: string, path: string, sections: Section[] }} Page
 * @typedef {{
 *   name: string, category: string, prompt: string, purpose: string, audience: string, subject: string,
 *   pages: Page[], navigation: { sticky: boolean, style: 'left' | 'centered', cta: string },
 *   style: { direction: string, mood: string, heroLayout: string, cardStyle: string, cardSize: 'sm' | 'md' | 'lg' },
 *   palette: import('./tokens.js').Palette, typography: { heading: string, body: string },
 *   layout: { radius: keyof typeof RADII, density: keyof typeof DENSITY, maxWidth: string },
 *   responsive: string[], components: string[], interactions: string[],
 *   animation: { level: 'none' | 'subtle' | 'rich', speed: number },
 *   accessibility: string[], assets: string[], framework: keyof typeof FRAMEWORKS, styling: 'tailwind', language: 'typescript',
 *   dependencies: string[], references?: string, variantName?: string
 * }} SiteSpec
 */

/** @type {Array<[string, RegExp]>} */
const CATEGORY_RULES = [
  ['E-commerce frontend', /\b(shop|store|e-?commerce|product|perfume|fashion|jewel|cosmetic|boutique|sneaker|clothing|merch)\w*/],
  ['Restaurant', /\b(restaurant|cafe|café|coffee|bakery|bistro|menu|food|pizza|sushi|bar)\b/],
  ['Portfolio', /\b(portfolio|photograph|designer|artist|illustrat)\w*/],
  ['SaaS landing page', /\b(saas|software|app|startup|platform|tool|api)\b/],
  ['Agency', /\bagenc(y|ies)|studio\b/],
  ['Education', /\b(course|school|academy|learn|tutor|education|class)\w*/],
  ['Blog or magazine', /\b(blog|magazine|journal|news|articles?)\b/],
  ['Dashboard UI', /\b(dashboard|admin|analytics|crm)\b/],
  ['Event website', /\b(event|conference|wedding|festival|summit|meetup|concert)\w*/],
  ['Personal brand', /\b(personal|coach|speaker|author|influencer|consultant)\b/],
  ['Business', /\b(business|company|firm|clinic|law|dental|salon|spa|gym|fitness|real estate)\b/],
]

const CATEGORY_DEFAULTS = /** @type {Record<string, { subject: string, cards: string, pages: string[], sections: string[], audience: string }>} */ ({
  'E-commerce frontend': { subject: 'product', cards: 'Products', pages: ['Home', 'Shop', 'About', 'Contact'], sections: ['hero', 'cards', 'features', 'testimonials', 'cta'], audience: 'Shoppers looking for quality products' },
  Restaurant: { subject: 'dish', cards: 'Menu', pages: ['Home', 'Menu', 'About', 'Reservations'], sections: ['hero', 'cards', 'about', 'testimonials', 'contact'], audience: 'Local diners and visitors' },
  Portfolio: { subject: 'project', cards: 'Selected work', pages: ['Home', 'Work', 'About', 'Contact'], sections: ['hero', 'gallery', 'about', 'testimonials', 'contact'], audience: 'Clients and collaborators' },
  'SaaS landing page': { subject: 'feature', cards: 'Use cases', pages: ['Home', 'Features', 'Pricing', 'Contact'], sections: ['hero', 'features', 'stats', 'steps', 'pricing', 'faq', 'cta'], audience: 'Teams evaluating software' },
  Agency: { subject: 'service', cards: 'Services', pages: ['Home', 'Services', 'Work', 'Contact'], sections: ['hero', 'cards', 'gallery', 'stats', 'testimonials', 'contact'], audience: 'Brands looking for a partner' },
  Education: { subject: 'course', cards: 'Courses', pages: ['Home', 'Courses', 'About', 'Contact'], sections: ['hero', 'cards', 'steps', 'testimonials', 'faq', 'cta'], audience: 'Students and lifelong learners' },
  'Blog or magazine': { subject: 'story', cards: 'Latest stories', pages: ['Home', 'Stories', 'About', 'Subscribe'], sections: ['hero', 'cards', 'cta'], audience: 'Curious readers' },
  'Dashboard UI': { subject: 'metric', cards: 'Reports', pages: ['Overview', 'Reports', 'Settings'], sections: ['hero', 'stats', 'cards', 'faq'], audience: 'Operators who need clarity' },
  'Event website': { subject: 'session', cards: 'Schedule', pages: ['Home', 'Schedule', 'Speakers', 'Tickets'], sections: ['hero', 'stats', 'cards', 'team', 'pricing', 'faq'], audience: 'Attendees and sponsors' },
  'Personal brand': { subject: 'offer', cards: 'Offers', pages: ['Home', 'About', 'Work With Me', 'Contact'], sections: ['hero', 'about', 'cards', 'testimonials', 'contact'], audience: 'Followers and potential clients' },
  Business: { subject: 'service', cards: 'Services', pages: ['Home', 'Services', 'About', 'Contact'], sections: ['hero', 'features', 'cards', 'testimonials', 'faq', 'contact'], audience: 'Customers looking for a trusted provider' },
  Custom: { subject: 'offering', cards: 'Highlights', pages: ['Home', 'About', 'Contact'], sections: ['hero', 'features', 'cards', 'testimonials', 'contact'], audience: 'Visitors interested in the offering' },
})

const SECTION_KEYWORDS = /** @type {[string, RegExp][]} */ ([
  ['testimonials', /testimonial|review|quote/],
  ['pricing', /pricing|price plan|plans|tiers|tickets/],
  ['gallery', /gallery|lookbook|portfolio grid|photos/],
  ['faq', /\bfaqs?\b|questions/],
  ['contact', /contact|enquir|inquir|booking form|reservation/],
  ['team', /team|staff|speakers|founders/],
  ['stats', /stats|numbers|metrics|counter/],
  ['about', /about|story|mission/],
  ['features', /features|benefits|why us/],
  ['steps', /how it works|process|steps/],
  ['cards', /product card|cards|catalog|menu|courses|listing|products/],
  ['cta', /newsletter|subscribe|call to action|cta/],
])

const ADJ = ['Midnight', 'Amber', 'Velvet', 'Solstice', 'Ember', 'Aurora', 'Saffron', 'Nocturne', 'Cedar', 'Lumen', 'Harbor', 'Atlas']
const PEOPLE = ['Amelia Hart', 'Daniel Okafor', 'Sofia Marquez', 'Kenji Watanabe', 'Leila Haddad', 'Noah Bennett', 'Priya Raman', 'Lucas Moreau']

/** Stable 32-bit hash. @param {string} s */
export function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** @param {string} s */
export function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** @param {string} s */
export function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page'
}

/** @param {string} text */
export function detectCategory(text) {
  const t = text.toLowerCase()
  return CATEGORY_RULES.find(([, re]) => re.test(t))?.[0] ?? 'Custom'
}

/** @param {string} text @param {string} fallback */
function detectSubject(text, fallback) {
  const m = /\b(?:an?|the|my)\s+(?:(?:premium|modern|elegant|luxury|minimal|simple|beautiful|bold|clean|small|local|new|online|creative|professional|personal)\s+)*([a-z][a-z-]{2,20}(?:\s[a-z][a-z-]{2,20})?)\s+(?:website|site|landing page|store|shop|brand|page|portfolio|blog)/i.exec(text)
  const word = m?.[1]?.toLowerCase()
  return word && !/^(web|website|landing)$/.test(word) ? word : fallback
}

/** @param {string} text */
function detectColors(text) {
  const t = text.toLowerCase()
  const hexes = [...t.matchAll(/#[0-9a-f]{6}\b/g)].map((m) => m[0])
  const words = Object.keys(COLOR_WORDS).filter((w) => new RegExp(`\\b${w}\\b`).test(t)).sort((a, b) => t.indexOf(a) - t.indexOf(b)).map((w) => COLOR_WORDS[w])
  return [...hexes, ...words]
}

/** @param {string} text */
function detectFonts(text) {
  const t = text.toLowerCase()
  const named = FONT_NAMES.find((f) => t.includes(f.toLowerCase()))
  if (named) return { heading: named, body: /serif|garamond|playfair|lora/i.test(named) ? 'Inter' : named }
  if (/elegant|luxury|premium|editorial|classic|serif/.test(t)) return { heading: 'Playfair Display', body: 'Inter' }
  if (/playful|friendly|fun|kids|rounded/.test(t)) return { heading: 'Poppins', body: 'DM Sans' }
  if (/bold|creative|brutal|futur|tech/.test(t)) return { heading: 'Space Grotesk', body: 'Inter' }
  return { heading: 'Manrope', body: 'Inter' }
}

/** Content for one section, specific to the subject. @param {string} type @param {{ subject: string, name: string, cards: string, category: string, seed: number }} ctx @returns {Section} */
export function makeSection(type, ctx) {
  const S = titleCase(ctx.subject)
  const pick = (/** @type {number} */ i) => ADJ[(ctx.seed + i) % ADJ.length]
  const id = `${type}-${(ctx.seed % 997).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
  switch (type) {
    case 'hero':
      return { id, type, title: `${ctx.name} — ${S} crafted with intent`, subtitle: `Discover a considered ${ctx.subject} experience designed for people who notice the details.`, items: [{ title: `Explore ${ctx.cards.toLowerCase()}` }, { title: 'Learn more' }] }
    case 'features':
      return { id, type, title: `Why choose ${ctx.name}`, subtitle: 'Everything is designed around quality, clarity and care.', items: [
        { title: 'Thoughtfully made', text: `Every ${ctx.subject} is selected and refined by people who care.`, tag: 'sparkles' },
        { title: 'Fast and reliable', text: 'Clear information, quick responses and no surprises.', tag: 'zap' },
        { title: 'Trusted by many', text: 'A growing community that keeps coming back.', tag: 'shield' },
      ] }
    case 'cards':
      return { id, type, title: ctx.cards, subtitle: `A curated selection from ${ctx.name}.`, items: Array.from({ length: 6 }, (_, i) => ({
        title: `${pick(i)} ${S}`, text: `A signature ${ctx.subject} with a distinctive character and a refined finish.`,
        price: ctx.category === 'Blog or magazine' ? undefined : `$${(39 + ((ctx.seed >> i) % 9) * 12).toFixed(0)}`,
        meta: ['New', 'Bestseller', 'Limited', 'Classic', 'Popular', 'Seasonal'][i], tag: ['New', 'Bestseller', 'Limited'][i % 3],
      })) }
    case 'gallery':
      return { id, type, title: 'Gallery', subtitle: `Moments and details from ${ctx.name}.`, items: Array.from({ length: 6 }, (_, i) => ({ title: `${pick(i + 3)} study`, meta: ['Detail', 'Atmosphere', 'Process'][i % 3] })) }
    case 'testimonials':
      return { id, type, title: 'What people say', subtitle: 'Kind words from our community.', items: PEOPLE.slice(ctx.seed % 4, (ctx.seed % 4) + 3).map((p, i) => ({ title: p, text: [`The best ${ctx.subject} experience I have had — beautifully presented and easy to choose.`, `${ctx.name} feels premium from the first click. I recommended it to all my friends.`, 'Thoughtful, quick and genuinely helpful. I will be back.'][i], meta: ['Verified customer', 'Returning client', 'Member since 2023'][i] })) }
    case 'pricing':
      return { id, type, title: ctx.category === 'Event website' ? 'Tickets' : 'Simple pricing', subtitle: 'Choose the option that suits you.', items: [
        { title: 'Essential', price: '$19', text: 'The core experience', meta: 'Great to start' },
        { title: 'Signature', price: '$49', text: 'Our most popular choice', meta: 'Most popular', tag: 'featured' },
        { title: 'Private', price: '$99', text: 'Personal and tailored', meta: 'For the dedicated' },
      ] }
    case 'about':
      return { id, type, title: `The story of ${ctx.name}`, subtitle: `${ctx.name} began with a simple idea: ${ctx.subject}s should feel personal. Today we combine craft and care to create something worth returning to.`, items: [{ title: 'Founded', meta: '2016' }, { title: 'Based in', meta: 'Lisbon' }] }
    case 'stats':
      return { id, type, title: 'By the numbers', items: [{ title: '12k+', text: 'Happy customers' }, { title: '4.9/5', text: 'Average rating' }, { title: '48h', text: 'Typical turnaround' }, { title: '30+', text: 'Countries served' }] }
    case 'team':
      return { id, type, title: ctx.category === 'Event website' ? 'Speakers' : 'Meet the team', subtitle: 'The people behind the work.', items: PEOPLE.slice(2, 6).map((p, i) => ({ title: p, meta: ['Founder', 'Creative lead', 'Head of experience', 'Partnerships'][i] })) }
    case 'faq':
      return { id, type, title: 'Frequently asked questions', items: [
        { title: 'How long does delivery take?', text: 'Most orders arrive within 2–5 working days.' },
        { title: 'Can I change my mind?', text: 'Yes — you can return or exchange within 30 days.' },
        { title: 'Do you offer gifts or custom requests?', text: 'Absolutely. Contact us and we will tailor it for you.' },
      ] }
    case 'contact':
      return { id, type, title: 'Get in touch', subtitle: 'Send a message and we will reply within one working day.', items: [{ title: 'Email', meta: `hello@${slug(ctx.name)}.com` }, { title: 'Studio', meta: '24 Rua Augusta, Lisbon' }] }
    case 'steps':
      return { id, type, title: 'How it works', items: [{ title: 'Discover', text: `Browse the ${ctx.cards.toLowerCase()} and find what suits you.` }, { title: 'Choose', text: 'Compare details and pick your favourite.' }, { title: 'Enjoy', text: 'We take care of the rest, quickly and carefully.' }] }
    default:
      return { id, type: 'cta', title: `Join the ${ctx.name} circle`, subtitle: 'News, early access and quiet updates — no spam.', items: [{ title: 'Subscribe' }] }
  }
}

/**
 * Offline planner: turns any prompt into a complete specification without an AI
 * provider. Deterministic for the same prompt/options so results are reproducible.
 * @param {string} prompt
 * @param {{ name?: string, category?: string, framework?: string, colors?: string, fonts?: string, references?: string }} [options]
 * @returns {SiteSpec}
 */
export function planOffline(prompt, options = {}) {
  const text = `${prompt} ${options.colors ?? ''} ${options.fonts ?? ''}`
  const category = CATEGORIES.includes(options.category ?? '') && options.category !== 'Custom' ? /** @type {string} */ (options.category) : detectCategory(prompt)
  const def = CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS.Custom
  const subject = detectSubject(prompt, def.subject)
  const seed = hash(prompt.trim().toLowerCase())
  const name = (options.name ?? '').trim().slice(0, 40) || `${ADJ[seed % ADJ.length]} ${titleCase(subject.split(' ')[0])}`
  const colors = detectColors(text)
  const darkWords = /\b(dark|black|night|noir|moody)\b/i.test(text)
  const background = colors.find((c) => c === COLOR_WORDS.black || c === COLOR_WORDS.navy || c === COLOR_WORDS.charcoal) ?? (darkWords ? '#0d0d12' : '#fbfaf7')
  const primary = colors.find((c) => c !== background) ?? shiftHue('#6d4aff', seed % 360)
  const palette = buildPalette({ primary, background, accent: colors.find((c) => c !== background && c !== primary) })
  const ctx = { subject, name, cards: subject === def.subject ? def.cards : `${titleCase(subject)} collection`, category, seed }
  const lower = prompt.toLowerCase()
  const requested = SECTION_KEYWORDS.filter(([, re]) => re.test(lower)).map(([t]) => t)
  const homeTypes = [...new Set(['hero', ...def.sections.filter((t) => t !== 'hero'), ...requested])]
  if (homeTypes.includes('contact')) homeTypes.push(homeTypes.splice(homeTypes.indexOf('contact'), 1)[0])
  const pages = def.pages.map((pageName, i) => {
    const sections = i === 0 ? homeTypes : pageTypes(pageName)
    return { id: slug(pageName), name: pageName, path: i === 0 ? '/' : `/${slug(pageName)}`, sections: sections.map((t) => makeSection(t, ctx)) }
  })
  const fonts = detectFonts(text)
  return normaliseSpec({
    name, category, prompt: prompt.trim(), subject, references: options.references ?? '',
    purpose: `Present ${name} and turn visitors into ${category === 'E-commerce frontend' ? 'customers' : 'enquiries'} with a clear, ${/premium|luxury|elegant/.test(lower) ? 'premium' : 'modern'} experience.`,
    audience: def.audience,
    pages,
    navigation: { sticky: /sticky|fixed nav/.test(lower), style: 'left', cta: category === 'Restaurant' ? 'Book a table' : category === 'E-commerce frontend' ? 'Shop now' : 'Get in touch' },
    style: { direction: 'Custom', mood: /premium|luxury|elegant/.test(lower) ? 'Premium and refined' : 'Clean and modern', heroLayout: 'split', cardStyle: 'elevated', cardSize: 'md' },
    palette,
    typography: fonts,
    layout: { radius: /sharp|brutal/.test(lower) ? 'none' : /rounded|soft|friendly/.test(lower) ? 'lg' : 'md', density: 'comfortable', maxWidth: '1200px' },
    animation: { level: /no animation|static/.test(lower) ? 'none' : /animation|animated|motion/.test(lower) ? 'rich' : 'subtle', speed: 1 },
    framework: options.framework === 'nextjs' ? 'nextjs' : 'react-vite',
  })
}

/** @param {string} pageName */
function pageTypes(pageName) {
  const n = pageName.toLowerCase()
  if (/contact|reservation|subscribe|tickets/.test(n)) return n.includes('tickets') ? ['pricing', 'faq', 'contact'] : ['contact', 'faq']
  if (/about|story/.test(n)) return ['about', 'stats', 'team']
  if (/pricing/.test(n)) return ['pricing', 'faq']
  if (/work|gallery|portfolio/.test(n)) return ['gallery', 'testimonials']
  if (/speakers|team/.test(n)) return ['team', 'cta']
  if (/feature/.test(n)) return ['features', 'steps', 'cta']
  if (/settings/.test(n)) return ['faq', 'contact']
  return ['cards', 'cta']
}

/** @template T @param {unknown} v @param {readonly T[]} allowed @param {T} fallback @returns {T} */
function oneOf(v, allowed, fallback) {
  return allowed.includes(/** @type {T} */ (v)) ? /** @type {T} */ (v) : fallback
}

/** @param {unknown} v @param {number} max */
function str(v, max = 200) {
  return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max) : ''
}

/** @param {unknown} v @param {number} maxItems */
function strList(v, maxItems = 12) {
  return Array.isArray(v) ? v.map((x) => str(x, 80)).filter(Boolean).slice(0, maxItems) : []
}

/**
 * Validates and completes a specification from any source (AI output is untrusted).
 * @param {any} raw
 * @returns {SiteSpec}
 */
export function normaliseSpec(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const name = str(r.name, 40) || 'Untitled Site'
  const usedIds = new Set()
  /** @param {string} base */
  const uniqueId = (base) => {
    let id = slug(base).slice(0, 40)
    let n = 2
    while (usedIds.has(id)) id = `${slug(base).slice(0, 36)}-${n++}`
    usedIds.add(id)
    return id
  }
  /** @type {Page[]} */
  const pages = (Array.isArray(r.pages) ? r.pages : []).slice(0, 8).map((/** @type {any} */ p, /** @type {number} */ i) => {
    const pageName = str(p?.name, 30) || `Page ${i + 1}`
    const id = uniqueId(p?.id || pageName)
    return {
      id,
      name: pageName,
      path: i === 0 ? '/' : `/${id}`,
      sections: (Array.isArray(p?.sections) ? p.sections : []).slice(0, 12).map((/** @type {any} */ s, /** @type {number} */ j) => ({
        id: str(s?.id, 60) || `${s?.type ?? 'section'}-${i}-${j}`,
        type: oneOf(s?.type, SECTION_TYPES, 'features'),
        title: str(s?.title, 120) || titleCase(String(s?.type ?? 'Section')),
        subtitle: str(s?.subtitle, 400) || undefined,
        items: (Array.isArray(s?.items) ? s.items : []).slice(0, 12).map((/** @type {any} */ it) => ({
          title: str(it?.title, 90) || 'Item', text: str(it?.text, 300) || undefined, meta: str(it?.meta, 60) || undefined,
          price: str(it?.price, 20) || undefined, tag: str(it?.tag, 30) || undefined,
        })),
      })),
    }
  })
  if (!pages.length) pages.push({ id: 'home', name: 'Home', path: '/', sections: [] })
  if (!pages[0].sections.some((s) => s.type === 'hero')) {
    pages[0].sections.unshift(makeSection('hero', { subject: str(r.subject, 30) || 'experience', name, cards: 'Highlights', category: 'Custom', seed: hash(name) }))
  }
  const pal = r.palette ?? {}
  const palette = isHex(pal.primary) && isHex(pal.background)
    ? { ...buildPalette({ primary: pal.primary, background: pal.background, accent: isHex(pal.accent) ? pal.accent : undefined }), ...(isHex(pal.surface) ? { surface: pal.surface } : {}), ...(isHex(pal.text) ? { text: pal.text } : {}), ...(isHex(pal.muted) ? { muted: pal.muted } : {}) }
    : buildPalette({ primary: '#6d4aff', background: '#fbfaf7' })
  return {
    name,
    category: oneOf(r.category, CATEGORIES, 'Custom'),
    prompt: str(r.prompt, 2000),
    purpose: str(r.purpose, 300) || `Present ${name} clearly and convert visitors.`,
    audience: str(r.audience, 200) || 'Visitors interested in the offering',
    subject: str(r.subject, 30) || 'experience',
    references: str(r.references, 500),
    pages,
    navigation: { sticky: Boolean(r.navigation?.sticky), style: oneOf(r.navigation?.style, /** @type {const} */ (['left', 'centered']), 'left'), cta: str(r.navigation?.cta, 24) || 'Get in touch' },
    style: {
      direction: str(r.style?.direction, 40) || 'Custom', mood: str(r.style?.mood, 80) || 'Clean and modern',
      heroLayout: oneOf(r.style?.heroLayout, HERO_LAYOUTS, 'split'), cardStyle: oneOf(r.style?.cardStyle, CARD_STYLES, 'elevated'),
      cardSize: oneOf(r.style?.cardSize, /** @type {const} */ (['sm', 'md', 'lg']), 'md'),
    },
    palette,
    typography: { heading: oneOf(r.typography?.heading, FONT_NAMES, 'Manrope'), body: oneOf(r.typography?.body, FONT_NAMES, 'Inter') },
    layout: {
      radius: oneOf(r.layout?.radius, /** @type {(keyof typeof RADII)[]} */ (Object.keys(RADII)), 'md'),
      density: oneOf(r.layout?.density, /** @type {(keyof typeof DENSITY)[]} */ (Object.keys(DENSITY)), 'comfortable'),
      maxWidth: oneOf(r.layout?.maxWidth, ['1040px', '1200px', '1320px'], '1200px'),
    },
    responsive: strList(r.responsive).length ? strList(r.responsive) : ['Mobile-first layout', 'Collapsible navigation under 768px', 'Single-column cards on phones'],
    components: strList(r.components, 20).length ? strList(r.components, 20) : ['Navbar', 'Footer', ...new Set(pages.flatMap((p) => p.sections.map((s) => `${titleCase(s.type)}Section`)))],
    interactions: strList(r.interactions).length ? strList(r.interactions) : ['Mobile menu toggle', 'Page navigation', 'Detail dialogs', 'Validated forms with demo submission', 'FAQ accordion'],
    animation: { level: oneOf(r.animation?.level, /** @type {const} */ (['none', 'subtle', 'rich']), 'subtle'), speed: Math.max(0.25, Math.min(3, Number(r.animation?.speed) || 1)) },
    accessibility: strList(r.accessibility).length ? strList(r.accessibility) : ['WCAG AA colour contrast', 'Keyboard navigable menus and dialogs', 'Visible focus states', 'Respects prefers-reduced-motion', 'Semantic landmarks and labelled forms'],
    assets: strList(r.assets).length ? strList(r.assets) : ['Generated SVG artwork (replaceable)', 'Google Fonts'],
    framework: oneOf(r.framework, /** @type {(keyof typeof FRAMEWORKS)[]} */ (Object.keys(FRAMEWORKS)), 'react-vite'),
    styling: 'tailwind',
    language: 'typescript',
    dependencies: ['react', 'react-dom', 'lucide-react', 'tailwindcss'],
    variantName: str(r.variantName, 40) || undefined,
  }
}

/** The three design directions offered after planning. Each changes real tokens and layout, not just the name. */
export const DIRECTIONS = [
  { key: 'minimal', name: 'Minimal & elegant', summary: 'Serif headlines, generous whitespace, quiet colour and centred navigation.' },
  { key: 'saas', name: 'Modern SaaS', summary: 'Crisp sans-serif, rounded cards, gradient accents and a sticky top bar.' },
  { key: 'bold', name: 'Bold & creative', summary: 'Oversized display type, dark canvas, sharp edges and lively motion.' },
]

/**
 * @param {SiteSpec} spec
 * @param {string} key minimal | saas | bold | remix-N
 * @returns {SiteSpec}
 */
export function applyDirection(spec, key) {
  const s = structuredClone(spec)
  const p = spec.palette
  if (key === 'minimal') {
    const bg = luminanceDark(p.background) ? '#111110' : '#faf8f4'
    Object.assign(s, { variantName: 'Minimal & elegant' })
    s.palette = buildPalette({ primary: p.primary, background: bg, accent: mix(p.primary, bg, 0.4) })
    s.typography = { heading: 'Cormorant Garamond', body: 'DM Sans' }
    s.layout = { radius: 'sm', density: 'spacious', maxWidth: '1040px' }
    s.navigation = { ...s.navigation, style: 'centered' }
    s.style = { ...s.style, direction: 'Minimal & elegant', mood: 'Quiet, refined, airy', heroLayout: 'editorial', cardStyle: 'flat' }
    s.animation = { level: 'subtle', speed: 0.8 }
  } else if (key === 'saas') {
    const bg = luminanceDark(p.background) ? '#0b1020' : '#ffffff'
    Object.assign(s, { variantName: 'Modern SaaS' })
    s.palette = buildPalette({ primary: p.primary, background: bg, accent: shiftHue(p.primary, 55) })
    s.typography = { heading: 'Inter', body: 'Inter' }
    s.layout = { radius: 'lg', density: 'comfortable', maxWidth: '1200px' }
    s.navigation = { ...s.navigation, style: 'left', sticky: true }
    s.style = { ...s.style, direction: 'Modern SaaS', mood: 'Confident, clear, product-led', heroLayout: 'centered', cardStyle: 'bordered' }
    s.animation = { level: 'subtle', speed: 1 }
  } else if (key === 'bold') {
    Object.assign(s, { variantName: 'Bold & creative' })
    s.palette = buildPalette({ primary: shiftHue(p.primary, 0), background: '#0a0a0c', accent: shiftHue(p.primary, 150) })
    s.typography = { heading: 'Bricolage Grotesque', body: 'Space Grotesk' }
    s.layout = { radius: 'none', density: 'compact', maxWidth: '1320px' }
    s.navigation = { ...s.navigation, style: 'left' }
    s.style = { ...s.style, direction: 'Bold & creative', mood: 'Loud, expressive, energetic', heroLayout: 'split', cardStyle: 'elevated', cardSize: 'lg' }
    s.animation = { level: 'rich', speed: 1.2 }
  } else {
    const n = Number(key.split('-')[1]) || 1
    const seed = hash(`${spec.name}:${n}`)
    const bg = seed % 2 ? '#0e0f14' : '#f6f4ef'
    Object.assign(s, { variantName: `Exploration ${n}` })
    s.palette = buildPalette({ primary: shiftHue(p.primary, 60 + (seed % 240)), background: bg })
    s.typography = { heading: FONT_NAMES[seed % FONT_NAMES.length], body: ['Inter', 'DM Sans', 'Manrope'][seed % 3] }
    s.layout = { radius: /** @type {const} */ (['sm', 'md', 'lg', 'full'])[seed % 4], density: /** @type {const} */ (['compact', 'comfortable', 'spacious'])[seed % 3], maxWidth: '1200px' }
    s.style = { ...s.style, direction: `Exploration ${n}`, mood: 'Alternative direction', heroLayout: HERO_LAYOUTS[seed % 3], cardStyle: CARD_STYLES[(seed >> 3) % 3] }
  }
  return normaliseSpec(s)
}

/** @param {string} hex */
function luminanceDark(hex) {
  const n = parseInt(hex.slice(1), 16)
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 110
}

/** Combines colour, typography and layout from (possibly) different variations. @param {{ colors: SiteSpec, type: SiteSpec, layout: SiteSpec }} parts */
export function combineVariations({ colors, type, layout }) {
  return normaliseSpec({
    ...layout,
    palette: colors.palette,
    typography: type.typography,
    variantName: 'Combined direction',
    style: { ...layout.style, direction: 'Combined direction' },
  })
}

/** Short validation for a prompt typed by the user. @param {string} prompt */
export function validatePrompt(prompt) {
  const p = (prompt ?? '').trim()
  if (p.length < 12) return 'Describe the website in at least a sentence (12+ characters).'
  if (p.length > 2000) return 'Keep the description under 2,000 characters.'
  return null
}

/** Clarifying questions worth asking when the prompt leaves important gaps. @param {string} prompt */
export function clarifyingQuestions(prompt) {
  const t = prompt.toLowerCase()
  const q = []
  if (detectCategory(t) === 'Custom' && t.split(/\s+/).length < 8) q.push('What kind of website is it (shop, portfolio, restaurant, SaaS…)?')
  if (!detectColors(t).length && !/dark|light|colou?r|theme/.test(t)) q.push('Any colours or mood in mind? (e.g. “black and gold”, “calm pastel”)')
  return q.slice(0, 2)
}
