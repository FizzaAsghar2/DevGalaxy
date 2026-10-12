import { analyseIdea, hashString, plural, titleCase } from './ideaAnalysis.js'
import { normaliseUiSpec, pageSlug } from './uiSchema.js'

/**
 * Offline UI generator. Architecture is the source of truth: every UI page is
 * derived from an architecture page, its sections are chosen from what the
 * page is for, and mock content is built from the idea's entities, roles and
 * database tables. The design system is derived from the idea's tone.
 */

export const UI_STYLES = ['Auto', 'Modern', 'Minimal', 'Professional', 'Playful', 'Futuristic']
export const UI_THEMES = ['Auto', 'Light', 'Dark']

const PROFILES = {
  playful: { style: 'Playful & friendly', theme: 'light', hue: [330, 40], sat: 78, radius: 'large', font: 'rounded', nav: 'topbar', density: 'spacious', reason: 'Rounded shapes, warm saturated colour and generous spacing make the product feel approachable and fun.' },
  energetic: { style: 'Bold & energetic', theme: 'dark', hue: [260, 330], sat: 85, radius: 'medium', font: 'display', nav: 'topbar', density: 'comfortable', reason: 'High-contrast neon accents on a dark stage create excitement for live, competitive moments.' },
  elegant: { style: 'Elegant & editorial', theme: 'light', hue: [20, 45], sat: 35, radius: 'small', font: 'serif', nav: 'topbar', density: 'spacious', reason: 'Muted tones, serif headlines and whitespace let imagery and craft take centre stage.' },
  calm: { style: 'Calm & reassuring', theme: 'light', hue: [150, 200], sat: 45, radius: 'large', font: 'sans', nav: 'topbar', density: 'spacious', reason: 'Soft cool colours and clear hierarchy reduce stress and build trust.' },
  technical: { style: 'Technical & precise', theme: 'dark', hue: [170, 210], sat: 70, radius: 'small', font: 'mono', nav: 'sidebar', density: 'compact', reason: 'A dense dark workspace with monospace data and status colour supports fast, focused triage.' },
  trustworthy: { style: 'Professional & trustworthy', theme: 'light', hue: [150, 225], sat: 55, radius: 'medium', font: 'sans', nav: 'sidebar', density: 'comfortable', reason: 'Clean data-first layouts and restrained colour communicate reliability for money-related decisions.' },
  professional: { style: 'Professional & structured', theme: 'light', hue: [215, 245], sat: 60, radius: 'medium', font: 'sans', nav: 'sidebar', density: 'comfortable', reason: 'A structured sidebar layout keeps many records and roles organised for day-to-day operations.' },
  friendly: { style: 'Modern marketplace', theme: 'light', hue: [0, 360], sat: 68, radius: 'large', font: 'sans', nav: 'topbar', density: 'comfortable', reason: 'Image-forward cards, clear pricing and strong calls to action help people browse and commit quickly.' },
  modern: { style: 'Modern', theme: 'light', hue: [200, 280], sat: 65, radius: 'medium', font: 'sans', nav: 'topbar', density: 'comfortable', reason: 'A balanced modern look with one confident brand colour and clean surfaces.' },
  futuristic: { style: 'Futuristic', theme: 'dark', hue: [180, 290], sat: 90, radius: 'medium', font: 'display', nav: 'sidebar', density: 'comfortable', reason: 'Glowing gradients on deep space surfaces for a cutting-edge feel.' },
  minimal: { style: 'Minimal', theme: 'light', hue: [210, 230], sat: 12, radius: 'small', font: 'sans', nav: 'topbar', density: 'spacious', reason: 'Monochrome surfaces and restraint keep attention on content.' },
}

const PROFILE_EXTRAS = {
  playful: { button: 'pill', card: 'elevated', type: 'Rounded friendly headings, large readable body' },
  energetic: { button: 'gradient', card: 'glass', type: 'Bold geometric display, tight tracking' },
  elegant: { button: 'outline', card: 'flat', type: 'Serif editorial headlines, airy sans body' },
  calm: { button: 'pill', card: 'elevated', type: 'Soft humanist sans, generous line height' },
  technical: { button: 'solid', card: 'bordered', type: 'Monospace data, compact sans labels' },
  trustworthy: { button: 'solid', card: 'bordered', type: 'Neutral sans, tabular figures for numbers' },
  professional: { button: 'solid', card: 'bordered', type: 'Neutral sans, clear hierarchy' },
  friendly: { button: 'pill', card: 'elevated', type: 'Modern sans headings, image-first cards' },
  modern: { button: 'solid', card: 'elevated', type: 'Geometric display headings, Inter body' },
  futuristic: { button: 'gradient', card: 'glass', type: 'Wide display headings, glowing accents' },
  minimal: { button: 'outline', card: 'flat', type: 'Light sans, lots of whitespace' },
}

const STYLE_TO_PROFILE = { modern: 'modern', minimal: 'minimal', professional: 'professional', playful: 'playful', futuristic: 'futuristic' }

const PEOPLE = ['Amara Okafor', 'Liam Chen', 'Sofia Rossi', 'Noah Patel', 'Zara Ahmed', 'Mateo García', 'Hana Suzuki', 'Ethan Brooks', 'Fatima Khan', 'Lucas Silva', 'Priya Nair', 'Omar Haddad']
const PLACES = ['Lahore', 'Austin', 'Lisbon', 'Nairobi', 'Toronto', 'Melbourne', 'Berlin', 'Seoul', 'Karachi', 'Dublin']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Realistic sample names for common nouns. Anything else falls back to generic naming.
const SAMPLE_NAMES = {
  bill: ['Netflix Premium', 'City Power & Light', 'Spotify Family', 'Car Insurance — Allstate', 'Fibre Broadband', 'Gym Membership'],
  language: ['Spanish for Kids', 'French Adventures', 'Mandarin Stars', 'Japanese Explorers', 'German Quest', 'Arabic Garden'],
  pet: ['Biscuit · Golden Retriever', 'Luna · Tabby Cat', 'Pepper · Border Collie', 'Mochi · Shiba Inu', 'Oscar · Grey Parrot', 'Coco · French Bulldog'],
  equipment: ['John Deere 5075E Tractor', 'Kubota Seed Drill', 'Mahindra Rotavator', 'Case IH Combine Harvester', 'Irrigation Pump 5HP', 'Hay Baler Pro 450'],
  ticket: ['Coldplay — Music of the Spheres', 'Champions League Final', 'Hamilton · West End', 'TechCrunch Disrupt Pass', 'Jazz Night at Blue Note', 'Comic Con Weekend'],
  event: ['Spring Welcome Mixer', 'Hackathon 2026', 'Charity Fun Run', 'Career Fair Night', 'Film Society Screening', 'Annual Gala'],
  interview: ['Frontend Engineer · React', 'Product Manager · Fintech', 'Data Analyst · SQL', 'UX Designer · Portfolio', 'Backend Engineer · System Design', 'Graduate Scheme · Behavioural'],
  chore: ['Take out recycling', 'Clean the kitchen', 'Vacuum living room', 'Buy groceries', 'Water the plants', 'Clean bathroom'],
  transaction: ['Whole Foods Market', 'Monthly Salary', 'Netflix Subscription', 'Uber Ride', 'Electricity Bill', 'Coffee at Blue Bottle'],
  incident: ['Phishing campaign targeting finance', 'Suspicious login from new ASN', 'Malware beacon on WS-2231', 'S3 bucket made public', 'Brute-force on VPN gateway', 'Data exfiltration alert'],
  alert: ['EDR: credential dumping detected', 'WAF: SQL injection blocked', 'IDS: port scan from 185.22.x', 'IAM: root key used', 'DLP: PII upload attempt', 'SIEM: impossible travel'],
  society: ['Robotics Society', 'Debate Union', 'Photography Club', 'Islamic Society', 'Drama Society', 'Entrepreneurs Network'],
  restaurant: ['Nando’s Peri-Peri', 'Sushi Zen', 'Burger Lab', 'Karachi Biryani House', 'Green Bowl Salads', 'Luigi’s Pizzeria'],
  quiz: ['World Capitals', '90s Pop Music', 'Marvel Universe', 'Space & Astronomy', 'Football Legends', 'Famous Paintings'],
  maintenance: ['Leaking kitchen tap · Unit 4B', 'Broken AC · Unit 12', 'Lift inspection · Block A', 'Mould in bathroom · Unit 7', 'Faulty door lock · Unit 3C', 'Boiler service · Block B'],
  property: ['Riverside Apartments', 'Maple Court', 'Harbor View Lofts', 'Oakwood Residences', 'Cedar Park Homes', 'Summit Towers'],
  source: ['Attention Is All You Need', 'Scaling Laws for Neural LMs', 'RAG: Retrieval-Augmented Generation', 'Chain-of-Thought Prompting', 'Constitutional AI', 'LoRA: Low-Rank Adaptation'],
  course: ['Intro to Python', 'UX Design Fundamentals', 'Calculus I', 'Digital Marketing', 'Data Structures', 'Public Speaking'],
  recipe: ['Chicken Karahi', 'Vegan Buddha Bowl', 'Classic Carbonara', 'Thai Green Curry', 'Banana Bread', 'Shakshuka'],
  book: ['Atomic Habits', 'The Pragmatic Programmer', 'Sapiens', 'Dune', 'Educated', 'Deep Work'],
  car: ['Toyota Corolla 2022', 'Honda Civic RS', 'Tesla Model 3', 'Suzuki Swift', 'Hyundai Tucson', 'Kia Sportage'],
  room: ['Sunny Studio near Campus', 'Ensuite in Shared House', 'Loft with City View', 'Garden Flat Room', 'Double Room · Bills incl.', 'Compact Single'],
  job: ['Junior Frontend Developer', 'Barista · Weekend', 'Marketing Intern', 'Delivery Rider', 'Data Entry Assistant', 'Graphic Designer'],
  workout: ['Morning HIIT 20', 'Upper Body Strength', 'Yoga Flow', '5K Tempo Run', 'Core Crusher', 'Mobility Reset'],
}

const PREFIXES = ['Northside', 'Riverside', 'Evergreen', 'Harbor', 'Summit', 'Cedar', 'Aurora', 'Maple']

function rng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 10000) / 10000
  }
}

function hslToHex(h, s, l) {
  const sat = s / 100
  const light = l / 100
  const k = (n) => (n + h / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`
}

export function buildDesign({ analysis, architecture, style = 'Auto', theme = 'Auto', variant = 0 }) {
  const key = STYLE_TO_PROFILE[String(style).toLowerCase()] ?? analysis.tone
  const profile = PROFILES[key] ?? PROFILES.modern
  const extras = PROFILE_EXTRAS[key] ?? PROFILE_EXTRAS.modern
  const random = rng(analysis.seed + variant * 7919)
  const [h1, h2] = profile.hue
  const span = h2 >= h1 ? h2 - h1 : h2 + 360 - h1
  const hue = Math.round(h1 + random() * span + variant * 47) % 360
  const mode = theme === 'Light' ? 'light' : theme === 'Dark' ? 'dark' : profile.theme
  const dark = mode === 'dark'
  const sat = profile.sat
  const navFlip = variant % 2 === 1
  return {
    appName: architecture.projectName,
    style: profile.style,
    theme: mode,
    primaryColor: hslToHex(hue, sat, dark ? 62 : 50),
    secondaryColor: hslToHex((hue + 40 + variant * 20) % 360, Math.max(20, sat - 15), dark ? 58 : 45),
    accentColor: hslToHex((hue + 160) % 360, Math.min(95, sat + 10), dark ? 64 : 55),
    backgroundColor: dark ? hslToHex(hue, 35, 7) : hslToHex(hue, key === 'minimal' ? 5 : 30, 97),
    surfaceColor: dark ? hslToHex(hue, 30, 12) : '#ffffff',
    textColor: dark ? '#e7ecf5' : hslToHex(hue, 30, 12),
    mutedColor: dark ? hslToHex(hue, 12, 65) : hslToHex(hue, 12, 42),
    fontStyle: profile.font,
    borderRadius: profile.radius,
    navigation: navFlip ? (profile.nav === 'sidebar' ? 'topbar' : 'sidebar') : profile.nav,
    density: profile.density,
    iconStyle: key === 'playful' ? 'filled' : 'outline',
    buttonStyle: extras.button,
    cardStyle: variant % 3 === 2 ? (extras.card === 'bordered' ? 'elevated' : 'bordered') : extras.card,
    typography: extras.type,
    designReasoning: profile.reason,
  }
}

function makeContext(architecture, idea) {
  const analysis = analyseIdea(`${idea ?? ''} ${architecture.description ?? ''}`)
  const tables = architecture.database?.tables ?? []
  const primaryTable = tables.find((t) => t.name !== 'users') ?? tables[0]
  const primaryName = primaryTable ? primaryTable.name.replace(/_/g, ' ') : 'item'
  const singularName = primaryName.replace(/ies$/, 'y').replace(/(?<!s)s$/, '')
  const E = titleCase(singularName)
  const Es = titleCase(primaryName)
  const random = rng(analysis.seed)
  const lastWord = singularName.split(' ').at(-1)
  const personEntity = architecture.userRoles?.some((r) => r.name.toLowerCase() === singularName)
  const samples =
    SAMPLE_NAMES[lastWord] ??
    SAMPLE_NAMES[singularName.split(' ')[0]] ??
    (personEntity ? PEOPLE.slice(0, 6) : PREFIXES.slice(0, 6).map((p) => `${p} ${titleCase(lastWord)}`))
  const statuses = analysis.traits.has('security')
    ? ['Critical', 'High', 'Medium', 'Low']
    : analysis.traits.has('operations')
      ? ['Open', 'Scheduled', 'In progress', 'Done']
      : analysis.traits.has('marketplace')
        ? ['Available', 'Booked', 'Pending']
        : analysis.traits.has('gamified')
          ? ['To do', 'In progress', 'Done']
          : ['Active', 'Pending', 'Completed']
  const rental = /rent|lease/i.test(idea ?? '')
  const money = analysis.traits.has('payments') || analysis.traits.has('marketplace')
  const finance = /finance|budget|bill|expense|saving/i.test(idea ?? '')
  const roles = (architecture.userRoles ?? []).map((r) => r.name).filter((r) => !['Administrator', 'Guest'].includes(r))

  const records = samples.map((title, i) => ({
    title,
    subtitle: personEntity ? `${PLACES[i % PLACES.length]} · ${4 + (i % 9)} yrs experience` : `${PLACES[(i + 2) % PLACES.length]} · ${PEOPLE[(i + 3) % PEOPLE.length]}`,
    status: statuses[i % statuses.length],
    meta: money ? (rental ? `$${40 + Math.round(random() * 160)}/day` : `$${20 + Math.round(random() * 480)}`) : finance ? `$${8 + Math.round(random() * 140)}/mo` : `${1 + Math.round(random() * 23)}h ago`,
    rating: (4 + random()).toFixed(1),
    tag: titleCase((architecture.features?.[i % Math.max(1, architecture.features.length)]?.name ?? 'Featured').split(' ')[0]),
  }))

  return { analysis, traits: analysis.traits, architecture, E, Es, records, statuses, money, rental, roles, random, tables, primaryTable }
}

function statsFor(ctx) {
  const { analysis, Es, random } = ctx
  if (analysis.traits.has('security')) return [
    { label: 'Open incidents', value: '23', change: '+4 today' },
    { label: 'Critical', value: '3', change: 'SLA 1h' },
    { label: 'MTTR', value: '2.4h', change: '−18%' },
    { label: 'Alerts / 24h', value: '1,284', change: '+9%' },
  ]
  if (/finance|budget|transaction|expense|bill|saving|goal|subscription/i.test(Es)) return [
    { label: 'Balance', value: '$12,480', change: '+3.2%' },
    { label: 'Spent this month', value: '$2,315', change: '72% of budget' },
    { label: 'Saved', value: '$640', change: 'Goal $1,000' },
    { label: 'Subscriptions', value: '7', change: '$96/mo' },
  ]
  if (analysis.traits.has('gamified')) return [
    { label: 'Points', value: String(200 + Math.round(random() * 900)), change: '+45 this week' },
    { label: 'Streak', value: '6 days', change: 'Best 14' },
    { label: 'Completed', value: '18', change: '+3' },
    { label: 'Rank', value: '#2', change: '↑1' },
  ]
  if (ctx.money) return [
    { label: `Active ${Es.toLowerCase()}`, value: String(40 + Math.round(random() * 300)), change: '+12%' },
    { label: 'Bookings', value: String(10 + Math.round(random() * 90)), change: '+8 this week' },
    { label: 'Revenue', value: `$${(2 + random() * 20).toFixed(1)}k`, change: '+21%' },
    { label: 'Avg rating', value: '4.8', change: '312 reviews' },
  ]
  return [
    { label: `Total ${Es.toLowerCase()}`, value: String(50 + Math.round(random() * 500)), change: '+9%' },
    { label: 'Active this week', value: String(10 + Math.round(random() * 80)), change: '+14%' },
    { label: 'Completion', value: `${60 + Math.round(random() * 35)}%`, change: '+5 pts' },
    { label: 'Members', value: String(20 + Math.round(random() * 200)), change: '+6' },
  ]
}

function chartItems(ctx) {
  return DAYS.map((label) => ({ label, value: 20 + Math.round(ctx.random() * 80) }))
}

function fieldNames(table) {
  return (table?.fields ?? []).map((f) => (typeof f === 'string' ? f : f?.name)).filter(Boolean)
}

function cellFor(column, record, i, ctx) {
  const c = column.toLowerCase()
  if (c === 'status') return record.status
  if (/price|rate|amount|cost|fee|total|budget|salary/.test(c)) return ctx.money ? record.meta : `$${20 + ((i * 53) % 400)}`
  if (/location|address|city|area|place|region/.test(c)) return PLACES[(i + 2) % PLACES.length]
  if (/date|time|_at|_on|deadline|when|day/.test(c)) return `${DAYS[i % DAYS.length]} ${10 + i}:00`
  if (/owner|user|member|author|name|contact|assignee|host|player/.test(c)) return PEOPLE[(i + 3) % PEOPLE.length]
  if (/rating|score|points|rank/.test(c)) return record.rating
  if (/category|type|tag|kind|genre/.test(c)) return record.tag
  if (/count|quantity|capacity|size|seats|stock/.test(c)) return String(2 + ((i * 7) % 30))
  if (/email/.test(c)) return `${PEOPLE[(i + 3) % PEOPLE.length].split(' ')[0].toLowerCase()}@example.com`
  if (/phone/.test(c)) return `+1 555 01${10 + i}`
  if (/url|link|website/.test(c)) return `example.com/${i + 1}`
  return record.subtitle.split(' · ')[0]
}

function tableFor(ctx, limit = 6) {
  const fields = fieldNames(ctx.primaryTable).filter((f) => !/(^id$|_id$|created_at|updated_at|description|^status$|latitude|longitude)/.test(f)).slice(0, 3)
  const columns = [...new Set([ctx.E, ...fields.map(titleCase).filter((c) => c !== 'Title'), 'Status'])].slice(0, 4)
  return {
    type: 'table',
    title: `Recent ${ctx.Es.toLowerCase()}`,
    columns,
    items: ctx.records.slice(0, limit).map((r, i) => ({
      title: r.title,
      subtitle: r.subtitle,
      status: r.status,
      meta: r.meta,
      cells: columns.map((column, ci) => (ci === 0 ? r.title : cellFor(column, r, i, ctx))),
    })),
    actions: ['Export'],
  }
}

function cardsFor(ctx, variant) {
  return {
    type: 'cards',
    title: `${ctx.Es}`,
    subtitle: `${ctx.records.length * 21} results`,
    variant: variant ?? (ctx.analysis.traits.has('media') || ctx.money ? 'media' : 'compact'),
    items: ctx.records,
    actions: [ctx.money ? (ctx.rental ? 'Rent now' : 'Book') : 'Open'],
  }
}

function formFor(ctx, pageName) {
  const fields = fieldNames(ctx.primaryTable)
    .filter((f) => !/(^id$|_id$|created_at|updated_at|status|latitude|longitude|^lat$|^lng$)/.test(f))
    .slice(0, 5)
    .map((f) => ({
      label: titleCase(f),
      type: /date|_at$|_on$/.test(f) ? 'date' : /price|amount|rate|total|size|capacity|points/.test(f) ? 'number' : /description|body|notes|summary/.test(f) ? 'textarea' : 'text',
    }))
  if (/book|reserve|rent|order|request|checkout/i.test(pageName)) {
    const have = new Set(fields.map((f) => f.label.toLowerCase()))
    const extra = [
      ctx.traits.has('scheduling') || ctx.money ? { label: 'Date', type: 'date' } : null,
      ctx.traits.has('location') || ctx.money ? { label: 'Location', type: 'text' } : null,
      ctx.money ? { label: 'Package', type: 'select', options: ['Essential', 'Standard', 'Premium'] } : null,
    ].filter((f) => f && !have.has(f.label.toLowerCase()))
    fields.push(...extra)
  }
  if (fields.length < 3) fields.push({ label: 'Details', type: 'textarea' }, { label: 'Photos', type: 'file' })
  return { type: 'form', title: pageName, subtitle: `Fill in the ${ctx.E.toLowerCase()} details`, fields, actions: ['Continue'] }
}

const QUOTES = [
  (ctx) => `Found the right ${ctx.E.toLowerCase()} in minutes — the whole process felt effortless.`,
  (ctx) => `${ctx.architecture.projectName} replaced three spreadsheets and a group chat for us.`,
  (ctx) => `Clear, fast and reliable. I recommend it to every ${(ctx.roles[0] ?? 'member').toLowerCase()} I know.`,
]

function testimonialsFor(ctx, title = 'Loved by our community') {
  return {
    type: 'testimonials',
    title,
    items: QUOTES.map((quote, i) => ({
      title: PEOPLE[(i + 6) % PEOPLE.length],
      subtitle: quote(ctx),
      meta: `${ctx.roles[i % Math.max(1, ctx.roles.length)] ?? 'Member'} · ${PLACES[(i + 4) % PLACES.length]}`,
      rating: (4.7 + i * 0.1).toFixed(1),
    })),
  }
}

function categoriesFor(ctx) {
  const names = [
    ...(ctx.architecture.features ?? []).map((f) => f.name),
    ...ctx.tables.filter((t) => t !== ctx.primaryTable && t.name !== 'users').map((t) => titleCase(t.name.replace(/_/g, ' '))),
  ]
  return {
    type: 'categories',
    title: 'Explore by category',
    items: [...new Set(names)].slice(0, 6).map((title, i) => ({ title, meta: `${12 + ((i * 37) % 180)} ${ctx.Es.toLowerCase()}` })),
  }
}

function packagesFor(ctx, record) {
  const base = Number(String(record.meta).replace(/[^0-9.]/g, '')) || 120
  const unit = ctx.rental ? '/day' : ''
  return {
    type: 'pricing',
    title: 'Packages',
    items: [
      { title: 'Essential', meta: `$${Math.round(base * 0.7)}${unit}`, subtitle: `Core ${ctx.E.toLowerCase()} package for smaller needs` },
      { title: 'Standard', meta: `$${Math.round(base)}${unit}`, subtitle: 'Most popular — everything most people need' },
      { title: 'Premium', meta: `$${Math.round(base * 1.8)}${unit}`, subtitle: 'Extended time, priority support and extras' },
    ],
    actions: [ctx.rental ? 'Rent now' : 'Book now'],
  }
}

function sectionsFor(page, ctx, variant) {
  const n = page.name
  const { E, Es, analysis, records } = ctx
  const traits = analysis.traits
  const lower = n.toLowerCase()

  if (/\b(sign in|login|log in|sign up|register)\b/.test(lower)) return { layout: 'centered', sections: [{ type: 'auth', title: `Welcome to ${ctx.architecture.projectName}`, subtitle: 'Sign in to continue', actions: ['Sign in', 'Create account'] }] }
  if (/^home$|landing/.test(lower)) {
    const hero = {
      type: 'hero',
      variant: variant % 2 ? 'centered' : 'split',
      title: traits.has('marketplace') ? `${ctx.analysis.actions[0]?.label ?? 'Find'} the right ${E.toLowerCase()} in minutes` : `${ctx.architecture.projectName}: ${ctx.architecture.description.split(/[.!]/)[0].replace(/^i want (to build )?(an? )?/i, '')}`,
      subtitle: `Trusted by ${1 + Math.round(ctx.random() * 9)},${Math.round(ctx.random() * 900) + 100} ${plural((ctx.roles[0] ?? 'member').toLowerCase())}`,
      actions: [traits.has('marketplace') ? `Browse ${Es}` : 'Get started', 'How it works'],
      placeholder: `Search ${Es.toLowerCase()}…`,
    }
    const sections = [hero]
    if (traits.has('location') || traits.has('marketplace')) sections.push({ type: 'search', placeholder: `Search ${Es.toLowerCase()} near you`, fields: [{ label: 'Location', type: 'text' }, { label: 'Date', type: 'date' }] })
    if ((ctx.architecture.features ?? []).length >= 3) sections.push(categoriesFor(ctx))
    sections.push({ ...cardsFor(ctx), title: `Featured ${Es.toLowerCase()}`, items: records.slice(0, variant % 2 ? 3 : 4) })
    sections.push({ type: 'stepper', title: 'How it works', items: (ctx.architecture.features ?? []).slice(0, 3).map((f) => ({ title: f.name, subtitle: f.description })) })
    if (!['technical', 'trustworthy'].includes(analysis.tone)) sections.push(testimonialsFor(ctx))
    sections.push({ type: 'cta', title: `Ready to get started?`, subtitle: `Join ${ctx.architecture.projectName} today.`, actions: ['Create free account'] })
    return { layout: 'landing', sections }
  }
  if (/achievement|badge|reward|trophies|trophy/.test(lower)) {
    const names = ['First Steps', '7-Day Streak', 'Perfect Score', 'Night Owl', 'Speed Runner', 'Helping Hand', 'Explorer', 'Champion']
    return {
      layout: 'stack',
      sections: [
        { type: 'stats', items: [{ label: 'Badges', value: '5 / 8', change: '+1 this week' }, { label: 'XP', value: '2,340', change: 'Level 7' }, { label: 'Streak', value: '6 days', change: 'Best 14' }] },
        { type: 'cards', variant: 'badges', title: 'Your badges', items: names.map((title, i) => ({ title, subtitle: i < 5 ? `Earned ${DAYS[i]}` : `${30 + i * 8}% there`, status: i < 5 ? 'Unlocked' : 'Locked' })) },
        { type: 'progress', title: 'Next rewards', items: names.slice(5).map((title, i) => ({ title, value: 40 + i * 20 })) },
      ],
    }
  }
  if (/^budgets?$|budget (overview|planner|limits)/.test(lower)) {
    const cats = [['Groceries', 450, 312], ['Rent & utilities', 1650, 1650], ['Transport', 220, 164], ['Dining out', 180, 207], ['Subscriptions', 60, 47], ['Health & fitness', 120, 55]]
    return {
      layout: 'stack',
      sections: [
        { type: 'stats', items: [{ label: 'Monthly budget', value: '$2,680', change: 'October' }, { label: 'Spent', value: '$2,435', change: '91% used' }, { label: 'Left to spend', value: '$245', change: '9 days left' }, { label: 'Over budget', value: '1 category', change: 'Dining out' }] },
        { type: 'progress', title: 'Spending by category', items: cats.map(([title, limit, spent]) => ({ title: `${title} · $${spent} of $${limit}`, value: Math.min(100, Math.round((spent / limit) * 100)) })) },
        { type: 'table', title: 'Budget limits', columns: ['Category', 'Limit', 'Spent', 'Status'], items: cats.map(([title, limit, spent]) => ({ title, status: spent > limit ? 'Over' : spent / limit > 0.85 ? 'Near limit' : 'On track', meta: `$${limit}`, cells: [title, `$${limit}`, `$${spent}`, spent > limit ? 'Over' : spent / limit > 0.85 ? 'Near limit' : 'On track'] })), actions: ['Edit budget'] },
      ],
    }
  }
  if (/goals?$|savings?$/.test(lower) && !/detail/.test(lower)) {
    const goals = [['Emergency fund', 6000, 4150, 'Mar 2027'], ['Japan trip', 3500, 1280, 'Aug 2027'], ['New laptop', 1800, 1620, 'Dec 2026'], ['House deposit', 25000, 7400, '2029']]
    return {
      layout: 'stack',
      sections: [
        { type: 'stats', items: [{ label: 'Total saved', value: '$14,450', change: '+$620 this month' }, { label: 'Active goals', value: '4', change: '1 almost done' }, { label: 'Auto-save', value: '$450/mo', change: 'Every payday' }] },
        { type: 'progress', title: n, items: goals.map(([title, target, saved]) => ({ title: `${title} · $${saved.toLocaleString('en-US')} of $${target.toLocaleString('en-US')}`, value: Math.round((saved / target) * 100) })) },
        { type: 'cards', variant: 'compact', title: 'Goal details', items: goals.map(([title, target, saved, due]) => ({ title, subtitle: `Target $${target.toLocaleString('en-US')} by ${due}`, status: saved / target > 0.85 ? 'Almost there' : 'On track', meta: `$${saved.toLocaleString('en-US')}` })) },
        { type: 'form', title: 'Add a goal', fields: [{ label: 'Goal name', type: 'text' }, { label: 'Target amount', type: 'number' }, { label: 'Target date', type: 'date' }], actions: ['Save goal'] },
      ],
    }
  }
  if (/leaderboard|ranking/.test(lower)) return { layout: 'stack', sections: [{ type: 'leaderboard', title: 'This week', items: PEOPLE.slice(0, 6).map((name, i) => ({ title: name, value: 1200 - i * 137, meta: `${7 - i} day streak` })) }] }
  if (/\b(live|play|session|practice|start|room|challenges?)\b/.test(lower) && !/detail|^new |history/.test(lower) && (traits.has('ai') || traits.has('realtime') || traits.has('gamified') || traits.has('learning'))) {
    const quiz = traits.has('gamified')
    return {
      layout: 'focus',
      sections: [
        {
          type: 'session',
          variant: quiz ? 'quiz' : 'ai',
          title: quiz ? `Question 4 of 10 · ${records[0].title}` : `${records[0].title}`,
          subtitle: quiz ? 'Which city is the capital of Australia?' : 'Tell me about a time you had to deal with conflicting priorities. How did you decide what to do first?',
          items: quiz ? ['Sydney', 'Canberra', 'Melbourne', 'Perth'].map((t) => ({ title: t })) : [{ title: 'Clarity', value: 78 }, { title: 'Structure (STAR)', value: 64 }, { title: 'Confidence', value: 82 }],
          value: quiz ? 18 : 120,
          actions: quiz ? ['Lock answer'] : ['Start recording', 'Skip question'],
        },
        quiz ? { type: 'leaderboard', title: 'Live scores', variant: 'compact', items: PEOPLE.slice(0, 4).map((name, i) => ({ title: name, value: 820 - i * 90 })) } : { type: 'chat', title: 'AI interviewer', items: [{ author: 'AI', text: 'Great, let’s begin. Take a breath — you have 2 minutes.' }, { author: 'You', text: 'Sure. In my last role at a fintech startup…' }] },
      ],
    }
  }
  if (/feedback|result|score/.test(lower)) return { layout: 'stack', sections: [{ type: 'stats', items: [{ label: 'Overall', value: '78/100', change: '+6 vs last' }, { label: 'Answers', value: '8', change: '2 strong' }, { label: 'Filler words', value: '12', change: '−5' }] }, { type: 'progress', title: 'Skill breakdown', items: [{ title: 'Communication', value: 82 }, { title: 'Problem solving', value: 71 }, { title: 'Technical depth', value: 64 }, { title: 'Culture fit', value: 88 }] }, { type: 'list', title: 'AI suggestions', items: [{ title: 'Quantify your impact', subtitle: 'Add numbers to your second answer.' }, { title: 'Use the STAR structure', subtitle: 'Your conflict answer skipped the Result.' }, { title: 'Slow down', subtitle: 'You averaged 182 words per minute.' }] }] }
  if (/ai assistant|assistant|chat|messages|inbox/.test(lower)) {
    const ai = /assistant|ai/.test(lower)
    return {
      layout: 'split',
      sections: [
        {
          type: 'chat',
          variant: ai ? 'assistant' : 'inbox',
          title: ai ? `${ctx.architecture.projectName} Assistant` : 'Messages',
          items: ai
            ? [{ author: 'You', text: `Summarise the key findings across my saved ${Es.toLowerCase()}.` }, { author: 'AI', text: `Across 6 ${Es.toLowerCase()}, three themes stand out: retrieval improves factual accuracy, scaling beats clever architectures, and fine-tuning is cheaper with adapters. Want citations?` }, { author: 'You', text: 'Yes, with page numbers.' }]
            : [{ author: PEOPLE[1], text: `Hi! Is the ${records[0].title} still available this weekend?` }, { author: 'You', text: 'Yes — Saturday 9am works. I’ll send the booking link.' }, { author: PEOPLE[1], text: 'Perfect, thank you!' }],
          tabs: ai ? [] : PEOPLE.slice(1, 5),
          placeholder: ai ? 'Ask anything…' : 'Write a message…',
        },
      ],
    }
  }
  if (/alert|notification/.test(lower)) return { layout: 'stack', sections: [{ type: 'filters', items: ctx.statuses.map((s) => ({ title: s })) }, { type: 'table', title: 'Incoming alerts', columns: ['Alert', 'Source', 'Severity', 'Age'], items: (SAMPLE_NAMES.alert).map((t, i) => ({ title: t, subtitle: ['CrowdStrike', 'Cloudflare', 'Suricata', 'AWS', 'Purview', 'Sentinel'][i], status: ctx.statuses[i % ctx.statuses.length], meta: `${2 + i * 7}m` })), actions: ['Acknowledge all'] }] }
  if (/timeline|history|activity/.test(lower)) return { layout: 'stack', sections: [{ type: 'timeline', title: n, items: records.slice(0, 5).map((r, i) => ({ title: i === 0 ? `${r.title}` : `${['Updated', 'Assigned', 'Commented on', 'Completed', 'Created'][i % 5]} ${r.title}`, subtitle: `${PEOPLE[i]} · ${r.status}`, meta: `${i + 1}h ago` })) }] }
  if (/calendar|schedule|availability/.test(lower)) return { layout: 'split', sections: [{ type: 'calendar', title: 'September 2026', items: records.slice(0, 5).map((r, i) => ({ title: r.title, day: 3 + i * 5, meta: `${9 + i}:00` })) }, { type: 'list', title: 'Upcoming', items: records.slice(0, 4).map((r, i) => ({ title: r.title, subtitle: `${DAYS[i]} · ${9 + i}:00`, status: r.status })) }] }
  if (/map/.test(lower)) return { layout: 'split', sections: [{ type: 'map', title: `${Es} near you`, items: records.slice(0, 6) }, { ...cardsFor(ctx, 'compact'), title: 'In this area' }] }
  if (/report|analytic|insight/.test(lower)) return { layout: 'stack', sections: [{ type: 'stats', items: statsFor(ctx) }, { type: 'chart', variant: 'line', title: 'Last 7 days', items: chartItems(ctx) }, { type: 'chart', variant: 'bar', title: `By ${ctx.statuses === undefined ? 'category' : 'status'}`, items: ctx.statuses.map((s) => ({ label: s, value: 10 + Math.round(ctx.random() * 60) })) }, tableFor(ctx, 4)] }
  if (/checkout|payment|cart/.test(lower)) return { layout: 'split', sections: [{ type: 'form', title: 'Payment details', fields: [{ label: 'Cardholder name', type: 'text' }, { label: 'Card number', type: 'text' }, { label: 'Expiry', type: 'text' }, { label: 'CVC', type: 'text' }], actions: ['Pay securely'] }, { type: 'summary', title: 'Order summary', items: [{ title: records[0].title, meta: records[0].meta }, { title: 'Service fee', meta: '$4.50' }, { title: 'Total', meta: records[0].meta }] }] }
  if (/member|directory|team/.test(lower) && !/dashboard/.test(lower)) return { layout: 'stack', sections: [{ type: 'search', placeholder: 'Search members' }, { type: 'cards', variant: 'people', title: 'Members', items: PEOPLE.slice(0, 8).map((name, i) => ({ title: name, subtitle: ['President', 'Treasurer', 'Secretary', 'Member', 'Events Lead', 'Member', 'Social Media', 'Member'][i], status: i % 4 === 3 ? 'Pending' : 'Active' })) }] }
  if (/profile|account/.test(lower)) return { layout: 'stack', sections: [{ type: 'profile', title: PEOPLE[0], subtitle: `${ctx.roles[0] ?? 'Member'} · ${PLACES[0]}`, items: statsFor(ctx).slice(0, 3) }, { type: 'tabs', tabs: ['Overview', 'Activity', 'Reviews'], items: records.slice(0, 3) }] }
  if (/setting/.test(lower)) return { layout: 'stack', sections: [{ type: 'tabs', tabs: ['Account', 'Notifications', 'Privacy'], variant: 'settings', items: [{ title: 'Email notifications', value: true }, { title: 'Push notifications', value: true }, { title: 'Weekly summary', value: false }, { title: 'Public profile', value: true }] }] }
  if (/admin|console|moderat/.test(lower)) return { layout: 'stack', sections: [{ type: 'stats', items: [{ label: 'Users', value: '4,812', change: '+132' }, { label: `Pending ${Es.toLowerCase()}`, value: '17', change: 'Review' }, { label: 'Reports', value: '5', change: '2 new' }] }, { ...tableFor(ctx), title: 'Awaiting moderation', actions: ['Approve', 'Reject'] }] }
  if (/dashboard|overview/.test(lower)) {
    const board = traits.has('gamified') || traits.has('operations')
    return {
      layout: 'dashboard',
      sections: [
        { type: 'stats', items: statsFor(ctx) },
        board
          ? { type: 'kanban', title: `${Es} board`, items: ctx.statuses.slice(0, 3).map((s, i) => ({ title: s, cards: records.slice(i * 2, i * 2 + 2).map((r) => r.title) })) }
          : { type: 'chart', variant: variant % 2 ? 'bar' : 'line', title: 'Activity this week', items: chartItems(ctx) },
        traits.has('security')
          ? { type: 'timeline', title: 'Latest response actions', items: records.slice(0, 4).map((r, i) => ({ title: r.title, subtitle: `${PEOPLE[i]} · ${['contained', 'escalated', 'assigned', 'closed'][i]}`, meta: `${i * 9 + 3}m ago` })) }
          : ctx.money
            ? { type: 'list', title: `Upcoming ${ctx.rental ? 'rentals' : 'bookings'}`, items: records.slice(0, 3).map((r, i) => ({ title: r.title, subtitle: `${DAYS[(i + 4) % 7]} ${12 + i * 3} Oct · ${PLACES[(i + 2) % PLACES.length]}`, status: ['Confirmed', 'Pending', 'Confirmed'][i] })) }
            : tableFor(ctx, 4),
        ...(ctx.money ? [{ ...cardsFor(ctx, 'compact'), title: `Saved ${Es.toLowerCase()}`, subtitle: '', items: records.slice(3, 6) }] : []),
        { type: 'feed', title: 'Activity', items: records.slice(0, 4).map((r, i) => ({ title: `${PEOPLE[i + 2]} ${['updated', 'added', 'completed', 'commented on'][i]} ${r.title}`, meta: `${i * 12 + 4}m` })) },
      ],
    }
  }
  if (/detail|view$|profile$/.test(lower) && !/^(my )?profile$|account/.test(lower)) {
    const r = records[0]
    if (traits.has('security') || (traits.has('operations') && !ctx.money)) {
      return {
        layout: 'detail',
        sections: [
          { type: 'stats', items: [{ label: traits.has('security') ? 'Severity' : 'Priority', value: r.status, change: 'Escalated 14m ago' }, { label: 'Assignee', value: PEOPLE[1].split(' ')[0], change: 'On call' }, { label: 'SLA', value: '00:42', change: 'remaining' }, { label: 'Affected', value: '7', change: traits.has('security') ? 'assets' : 'units' }] },
          { type: 'timeline', title: r.title, items: ['Detected', 'Triaged', 'Assigned', 'Containment started', 'Update posted'].map((t, i) => ({ title: t, subtitle: `${PEOPLE[i]} · ${r.subtitle.split(' · ')[0]}`, meta: `${(5 - i) * 11}m ago` })) },
          { ...tableFor(ctx, 4), title: traits.has('security') ? 'Affected assets' : 'Related records', actions: ['Assign', 'Resolve'] },
          { type: 'tabs', tabs: ['Notes', 'Evidence', 'Activity'], items: [{ title: 'Analyst notes', subtitle: `Initial triage complete. ${r.title} isolated; monitoring for recurrence.` }, { title: 'Evidence', subtitle: '3 log exports · 2 screenshots · 1 memory dump' }, { title: 'Activity', subtitle: `${PEOPLE[2]} changed status to ${r.status}` }] },
        ],
      }
    }
    const bookable = traits.has('marketplace') || traits.has('scheduling') || ctx.money
    const sections = [
      { type: 'gallery', variant: traits.has('media') || traits.has('marketplace') || traits.has('location') ? 'media' : 'record', title: r.title, subtitle: r.subtitle, items: records.slice(0, 4), value: r.meta, tabs: (ctx.architecture.features ?? []).slice(0, 4).map((f) => f.name.split(' ').slice(0, 2).join(' ')), actions: [bookable ? (ctx.rental ? 'Rent now' : 'Book now') : 'Contact', 'Save'] },
      { type: 'tabs', tabs: ['Overview', traits.has('marketplace') ? 'Reviews' : 'Activity', 'Details'], items: [{ title: `About this ${E.toLowerCase()}`, subtitle: `${r.title} — ${r.subtitle}. Status: ${r.status}.` }, { title: `${PEOPLE[4]} ★ ${r.rating}`, subtitle: 'Exactly as described and super easy to arrange.' }, { title: `${PEOPLE[5]} ★ 4.7`, subtitle: 'Would use again.' }] },
    ]
    if (bookable) sections.push(packagesFor(ctx, r))
    if (traits.has('scheduling') || bookable) sections.push({ type: 'calendar', title: 'Availability', items: [4, 9, 12, 18, 23, 27].map((day, i) => ({ day, title: `${r.title.split(' · ')[0]} available`, meta: `${9 + i}:00–${13 + i}:00` })) })
    sections.push(bookable ? testimonialsFor(ctx, 'Reviews') : { type: 'list', title: 'Related', items: records.slice(1, 4) })
    return { layout: 'detail', sections }
  }
  if (/new |create|add |report |book |booking |rent |rental |order |divide|apply|assign |request|reserve|reservation |post /.test(`${lower} `) && !/^reports?$/.test(lower)) {
    const bookingFlow = ctx.money && /book|rent|reserv|order|request/.test(lower)
    return {
      layout: 'focus',
      sections: [
        { type: 'stepper', variant: 'progress', title: n, items: (bookingFlow ? ['Details', 'Date & place', 'Package', 'Confirm'] : ['Details', traits.has('location') ? 'Location' : traits.has('scheduling') ? 'Date & time' : 'Options', traits.has('payments') ? 'Payment' : 'Review']).map((t) => ({ title: t })) },
        formFor(ctx, n),
        bookingFlow
          ? { type: 'summary', title: `${ctx.rental ? 'Rental' : 'Booking'} summary`, items: [{ title: E, meta: records[0].title }, { title: 'Package', meta: 'Standard' }, { title: 'Service fee', meta: '$12' }, { title: 'Total', meta: records[0].meta }] }
          : traits.has('media') || traits.has('location') ? { type: 'upload', title: 'Add photos', subtitle: 'Drag images here or browse — up to 6 photos' } : { type: 'summary', title: 'Summary', items: [{ title: E, meta: records[0].title }, { title: 'Status', meta: 'Draft' }] },
      ],
    }
  }
  if (/browse|find|search|explore|discover|catalog|list/.test(lower) || lower === Es.toLowerCase() || lower.endsWith('s')) {
    const professional = ['technical', 'professional', 'trustworthy'].includes(analysis.tone)
    return {
      layout: 'browse',
      sections: [
        { type: 'search', placeholder: `Search ${Es.toLowerCase()}…` },
        { type: 'filters', items: ctx.statuses.map((s) => ({ title: s })) },
        professional && !traits.has('marketplace') ? tableFor(ctx) : cardsFor(ctx, variant % 2 ? 'list' : undefined),
      ],
    }
  }
  return { layout: 'stack', sections: [{ type: 'list', title: n, subtitle: page.description, items: records.slice(0, 4) }, { type: 'cta', title: `Explore ${Es.toLowerCase()}`, actions: ['Open'] }] }
}

export function generateLocalUi(architecture, idea, { style = 'Auto', theme = 'Auto', variant = 0 } = {}) {
  const ctx = makeContext(architecture, idea)
  const uiDesign = buildDesign({ analysis: ctx.analysis, architecture, style, theme, variant })
  const uiPages = (architecture.pages ?? []).map((page) => {
    const { layout, sections } = sectionsFor(page, ctx, variant)
    return {
      id: pageSlug(page.name),
      name: page.name,
      route: `/${pageSlug(page.name)}`,
      purpose: page.description,
      layout,
      architecturePage: page.name,
      sections,
    }
  })
  return normaliseUiSpec({ uiDesign, uiPages, variant, source: 'demo', generatedAt: new Date().toISOString() }, architecture)
}

const COLOR_WORDS = {
  red: 0, orange: 25, amber: 40, yellow: 50, lime: 85, green: 140, emerald: 155, teal: 175, cyan: 190, sky: 200,
  blue: 220, indigo: 240, violet: 260, purple: 275, magenta: 300, pink: 330, rose: 345,
}

/**
 * Rule-based customisation used when no AI provider is configured. Handles
 * the common requests (colour, theme, density, radius, layout swaps, adding
 * search) so the edit flow works end to end; the AI path handles free-form.
 */
export function customizeLocalUi(spec, instruction, { pageId } = {}) {
  const text = String(instruction ?? '').toLowerCase()
  const next = structuredClone(spec)
  const d = next.uiDesign
  const changes = []
  const colorWord = Object.keys(COLOR_WORDS).find((c) => new RegExp(`\\b${c}\\b`).test(text))
  if (colorWord) {
    const hue = COLOR_WORDS[colorWord]
    const dark = d.theme === 'dark'
    d.primaryColor = hslToHex(hue, 70, dark ? 62 : 50)
    d.secondaryColor = hslToHex((hue + 35) % 360, 55, dark ? 58 : 45)
    d.accentColor = hslToHex((hue + 160) % 360, 75, 55)
    changes.push(`primary colour → ${colorWord}`)
  }
  const toDark = /\b(dark|darker|night)\b/.test(text)
  const toLight = /\b(light|lighter|bright|white)\b/.test(text)
  if (toDark || toLight) {
    const hueSource = hashString(d.primaryColor) % 360
    d.theme = toDark ? 'dark' : 'light'
    d.backgroundColor = toDark ? hslToHex(hueSource, 30, 7) : hslToHex(hueSource, 25, 97)
    d.surfaceColor = toDark ? hslToHex(hueSource, 25, 12) : '#ffffff'
    d.textColor = toDark ? '#e7ecf5' : '#0f172a'
    d.mutedColor = toDark ? '#94a3b8' : '#64748b'
    changes.push(`${d.theme} theme`)
  }
  if (/rounded|round|soft|friendly/.test(text)) { d.borderRadius = 'large'; changes.push('rounder corners') }
  if (/sharp|square|serious|corporate/.test(text)) { d.borderRadius = 'small'; changes.push('sharper corners') }
  if (/simpl|minimal|clean|less clutter/.test(text)) { d.density = 'spacious'; d.style = 'Minimal'; changes.push('simpler, more spacious layout') }
  if (/professional|corporate|enterprise/.test(text)) { d.style = 'Professional'; d.fontStyle = 'sans'; changes.push('professional styling') }
  if (/modern|futur|premium/.test(text)) { d.style = /futur/.test(text) ? 'Futuristic' : 'Modern'; d.fontStyle = 'display'; changes.push('more modern type') }
  if (/playful|fun/.test(text)) { d.style = 'Playful'; d.fontStyle = 'rounded'; d.borderRadius = 'large'; changes.push('playful styling') }
  if (/sidebar/.test(text)) { d.navigation = 'sidebar'; changes.push('sidebar navigation') }
  if (/top ?bar|navbar|top nav/.test(text)) { d.navigation = 'topbar'; changes.push('top navigation') }

  const targets = next.uiPages.filter((p) => !pageId || p.id === pageId || /all pages|every page|whole app/.test(text))
  for (const page of targets) {
    if (/table/.test(text)) {
      if (page.sections.some((s) => s.type === 'cards')) {
        page.sections = page.sections.map((s) => (s.type === 'cards' ? { ...s, type: 'table', columns: ['Name', 'Details', 'Status'] } : s))
        changes.push(`${page.name}: cards → table`)
      }
    } else if (/card|grid/.test(text)) {
      if (page.sections.some((s) => s.type === 'table' || s.type === 'list')) {
        page.sections = page.sections.map((s) => (s.type === 'table' || s.type === 'list' ? { ...s, type: 'cards', variant: 'compact' } : s))
        changes.push(`${page.name}: list → cards`)
      }
    }
    if (/search/.test(text) && !page.sections.some((s) => s.type === 'search')) {
      page.sections.unshift({ id: `search-${Date.now()}`, type: 'search', title: '', subtitle: '', variant: '', items: [], columns: [], fields: [], actions: [], tabs: [], placeholder: 'Search…', value: '' })
      changes.push(`${page.name}: added search`)
    }
    if (/chart|graph|analytics/.test(text) && !page.sections.some((s) => s.type === 'chart')) {
      page.sections.push({ id: `chart-${Date.now()}`, type: 'chart', title: 'Trends', subtitle: '', variant: 'line', items: DAYS.map((label, i) => ({ label, value: 30 + ((i * 37) % 60) })), columns: [], fields: [], actions: [], tabs: [], placeholder: '', value: '' })
      changes.push(`${page.name}: added chart`)
    }
  }
  return { spec: { ...next, generatedAt: new Date().toISOString() }, changes }
}
