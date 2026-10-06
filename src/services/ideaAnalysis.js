/**
 * Lightweight, dependency-free reading of a free-form product idea.
 *
 * It does not map ideas onto fixed app categories. Instead it pulls out the
 * people (actors), the things they work with (entities), what they do
 * (actions) and a handful of cross-cutting capabilities (traits). The offline
 * architecture and UI generators compose their output from these signals, so
 * "rent farm equipment" and "find lost pets" produce different products.
 */

const STOP_WORDS = new Set(
  `i we you want wants need needs would like to a an the build building create make making app apps application
  applications platform platforms website web site system systems tool tools software service services solution
  where that which who whom whose for and or but with without my our your their its his her it is are be being been
  of on in at by from into onto about as can could should will so such this these those them they there here also
  very just simple basic small big new online digital smart easy quick modern help helps let lets allow allows allowing
  enable enables people everyone anyone something thing things way ways able each every all any some other more most
  using use used via than then when while do does done get gets have has had what how why lot lots kind type types
  place based around across over under between through up down out off one two three multiple many few own`.split(/\s+/),
)

// Verbs a user performs. Mapped to the record that the action produces.
const ACTIONS = {
  find: { record: 'search', label: 'Find' },
  search: { record: 'search', label: 'Search' },
  discover: { record: 'search', label: 'Discover' },
  browse: { record: 'search', label: 'Browse' },
  explore: { record: 'search', label: 'Explore' },
  book: { record: 'booking', label: 'Book' },
  reserve: { record: 'reservation', label: 'Reserve' },
  schedule: { record: 'booking', label: 'Schedule' },
  hire: { record: 'booking', label: 'Hire' },
  rent: { record: 'rental', label: 'Rent' },
  lease: { record: 'rental', label: 'Lease' },
  borrow: { record: 'loan', label: 'Borrow' },
  lend: { record: 'loan', label: 'Lend' },
  buy: { record: 'order', label: 'Buy' },
  sell: { record: 'listing', label: 'Sell' },
  order: { record: 'order', label: 'Order' },
  purchase: { record: 'order', label: 'Purchase' },
  shop: { record: 'order', label: 'Shop' },
  pay: { record: 'payment', label: 'Pay' },
  donate: { record: 'donation', label: 'Donate' },
  report: { record: 'report', label: 'Report' },
  track: { record: 'log', label: 'Track' },
  log: { record: 'log', label: 'Log' },
  monitor: { record: 'metric', label: 'Monitor' },
  manage: { record: 'record', label: 'Manage' },
  organize: { record: 'record', label: 'Organize' },
  organise: { record: 'record', label: 'Organise' },
  plan: { record: 'plan', label: 'Plan' },
  divide: { record: 'assignment', label: 'Divide' },
  split: { record: 'assignment', label: 'Split' },
  assign: { record: 'assignment', label: 'Assign' },
  share: { record: 'share', label: 'Share' },
  practice: { record: 'session', label: 'Practice' },
  practise: { record: 'session', label: 'Practise' },
  learn: { record: 'enrollment', label: 'Learn' },
  teach: { record: 'lesson', label: 'Teach' },
  study: { record: 'session', label: 'Study' },
  play: { record: 'match', label: 'Play' },
  compete: { record: 'match', label: 'Compete' },
  vote: { record: 'vote', label: 'Vote' },
  review: { record: 'review', label: 'Review' },
  rate: { record: 'review', label: 'Rate' },
  apply: { record: 'application', label: 'Apply' },
  join: { record: 'membership', label: 'Join' },
  post: { record: 'post', label: 'Post' },
  publish: { record: 'post', label: 'Publish' },
  write: { record: 'post', label: 'Write' },
  chat: { record: 'message', label: 'Chat' },
  message: { record: 'message', label: 'Message' },
  connect: { record: 'connection', label: 'Connect' },
  collaborate: { record: 'record', label: 'Collaborate' },
  research: { record: 'session', label: 'Research' },
  analyze: { record: 'report', label: 'Analyze' },
  analyse: { record: 'report', label: 'Analyse' },
  budget: { record: 'budget', label: 'Budget' },
  save: { record: 'goal', label: 'Save' },
  invest: { record: 'holding', label: 'Invest' },
  swap: { record: 'trade', label: 'Swap' },
  trade: { record: 'trade', label: 'Trade' },
  exchange: { record: 'trade', label: 'Exchange' },
  deliver: { record: 'delivery', label: 'Deliver' },
  ship: { record: 'shipment', label: 'Ship' },
  maintain: { record: 'work_order', label: 'Maintain' },
  repair: { record: 'work_order', label: 'Repair' },
  fix: { record: 'work_order', label: 'Fix' },
  respond: { record: 'response', label: 'Respond' },
  resolve: { record: 'resolution', label: 'Resolve' },
  upload: { record: 'upload', label: 'Upload' },
  create: { record: 'record', label: 'Create' },
  host: { record: 'event', label: 'Host' },
  attend: { record: 'attendance', label: 'Attend' },
  adopt: { record: 'application', label: 'Adopt' },
  volunteer: { record: 'shift', label: 'Volunteer' },
  cook: { record: 'recipe', label: 'Cook' },
  train: { record: 'workout', label: 'Train' },
  compare: { record: 'comparison', label: 'Compare' },
  generate: { record: 'generation', label: 'Generate' },
  summarize: { record: 'summary', label: 'Summarize' },
  summarise: { record: 'summary', label: 'Summarise' },
}

// Words that name a group of people even without an -er/-or/-ist suffix.
const PEOPLE = new Set(
  `students student teachers teacher parents parent kids children child users customers customer clients client
  patients patient doctors doctor nurses staff employees employee members member teams team guests guest hosts host
  owners owner tenants tenant landlords landlord roommates roommate housemates housemate friends friend families family
  fans fan artists artist creators creator authors author readers reader players player gamers gamer coaches coach
  athletes athlete volunteers volunteer candidates candidate recruiters recruiter analysts analyst admins admin
  administrators administrator moderators moderator agents agent attendees attendee organizers organizer organisers
  organiser vendors vendor sellers seller buyers buyer drivers driver riders rider couriers courier chefs chef
  developers developer engineers engineer designers designer freelancers freelancer mentors mentor mentees mentee
  tutors tutor learners learner instructors instructor professors professor researchers researcher scientists
  scientist farmers farmer photographers photographer travelers traveler travellers traveller residents resident
  neighbors neighbours neighbor neighbour citizens citizen shoppers shopper investors investor managers manager
  technicians technician contractors contractor professionals professional`.split(/\s+/),
)

const NOT_PEOPLE = new Set(
  `tractor tractors trailer mixer mixers printer printers scooter scooters heater heaters cooler coolers speaker speakers
  order orders number numbers water paper papers answer answers power center centre filter filters tracker trackers
  planner planners letter letters computer computers calendar calendars folder folders matter matters monitor
  monitors vector error errors timer timers counter counters sensor sensors marker markers reminder reminders chapter
  chapters register cover covers poster posters trailer trailers other others corner corners weather dinner dinners
  leader leaderboard banner banners platform cluster clusters container containers explorer browser browsers
  processor processors editor editors generator generators calculator calculators simulator simulators scanner
  scanners printer printers router routers server servers controller controllers ledger ledgers budget
  meter meters voucher vouchers`.split(/\s+/),
)

const MODIFIERS = new Set(
  `lost found local nearby personal shared ai intelligent automated real realtime real-time live online offline mobile
  secure private public social smart simple quick fast daily weekly monthly household home small large premium luxury
  multiplayer collaborative virtual remote global community internal external custom interactive visual university
  student used second-hand secondhand sustainable eco green digital security cybersecurity`.split(/\s+/),
)

// Words that describe the kind of product rather than the thing it manages.
const PRODUCT_WORDS = new Set(
  `marketplace dashboard management assistant portal hub tracker planner directory engine suite network
  manager organizer organiser companion coach finder`.split(/\s+/),
)

// Nouns that imply the records a product needs when the idea names only an abstract domain.
const DOMAIN_ENTITIES = {
  finance: ['transaction', 'budget'],
  money: ['transaction', 'budget'],
  expense: ['expense', 'budget'],
  research: ['source', 'note'],
  assistant: ['conversation', 'document'],
  incident: ['incident', 'alert'],
}

const TRAIT_PATTERNS = {
  marketplace: /\b(marketplace|rent|rental|hire|book|booking|buy|sell|vendor|seller|buyer|listing|providers?|freelanc|gig|market)\w*/i,
  payments: /\b(pay|payment|checkout|ticket|price|pricing|rent|buy|sell|purchase|subscription|donat|fee|invoice|billing|order)\w*/i,
  scheduling: /\b(book|booking|schedul|appointment|calendar|event|reserve|reservation|slot|session|shift|availability|meeting)\w*/i,
  messaging: /\b(chat|message|messaging|inbox|conversation|contact|dm|talk)\w*/i,
  realtime: /\b(real[- ]?time|live|multiplayer|instant|streaming|socket|presence)\b/i,
  ai: /\b(ai|a\.i\.|gpt|llm|machine learning|intelligent|smart assistant|assistant|chatbot|generate|recommend)\w*/i,
  analytics: /\b(dashboard|analytics|metrics|insight|report|kpi|finance|financial|budget|expense|spending|statistics|chart|performance|monitor)\w*/i,
  location: /\b(map|location|nearby|near me|lost|found|gps|route|delivery|local|neighbou?rhood|address|geo)\w*/i,
  media: /\b(photo|image|video|portfolio|gallery|media|picture|camera|art|design|music|podcast)\w*/i,
  gamified: /\b(game|quiz|leaderboard|points|score|badge|streak|challenge|compete|competition|reward|chore|trivia)\w*/i,
  learning: /\b(learn|course|lesson|tutor|study|quiz|exam|class|school|university|education|teach|interview practice|practice)\w*/i,
  community: /\b(community|social|society|societies|club|forum|group|members|network|follow|feed|neighbou?r)\w*/i,
  security: /\b(security|incident|threat|vulnerab|breach|soc\b|compliance|audit|risk|cyber)\w*/i,
  operations: /\b(maintenance|work order|ticket|inventory|asset|fleet|logistics|warehouse|facility|property|equipment|repair)\w*/i,
  health: /\b(health|medical|doctor|patient|clinic|therapy|wellness|fitness|workout|diet|mental)\w*/i,
  approval: /\b(approv|verify|verification|moderat|review|application|apply|adopt)\w*/i,
}

const TONE_PATTERNS = [
  ['playful', /\b(kids?|children|fun|game|quiz|trivia|roommates?|housemates?|friends|casual|pets?|chores?|family|party|playful|cute)\b/i],
  ['energetic', /\b(gaming|multiplayer|sports?|fitness|workout|esports|music|festival|competition|arena)\b/i],
  ['elegant', /\b(luxury|photograph\w*|wedding|fashion|art|gallery|boutique|hotel|interior|jewel\w*|fine dining|premium)\b/i],
  ['calm', /\b(health|medical|therapy|wellness|meditation|mental|care|clinic|patients?|elderly)\b/i],
  ['technical', /\b(developer|security|incident|cyber|devops|api|code|research|engineering|infrastructure|logs?|threat)\b/i],
  ['trustworthy', /\b(finance|financial|bank|budget|expense|invest\w*|money|insurance|legal|accounting|tax)\b/i],
  ['professional', /\b(management|enterprise|business|b2b|crm|team|workflow|property|maintenance|university|societ\w*|hr|operations)\b/i],
]

function singular(word) {
  if (word.length <= 3) return word
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`
  if (/(ss|us|is)$/.test(word)) return word
  if (/(ches|shes|xes|zes|sses)$/.test(word)) return word.slice(0, -2)
  if (/s$/.test(word)) return word.slice(0, -1)
  return word
}

export function plural(word) {
  if (!word) return word
  const lower = word.toLowerCase()
  if (/(equipment|software|feedback|information|data|staff|research|maintenance|finance|news|media)$/.test(lower)) return word
  if (/[^aeiou]y$/.test(lower)) return `${word.slice(0, -1)}ies`
  if (/[aeiou]z$/.test(lower)) return `${word}zes`
  if (/(s|x|z|ch|sh)$/.test(lower)) return `${word}es`
  return `${word}s`
}

export function titleCase(value) {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function snake(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '')
}

function isPerson(word) {
  if (NOT_PEOPLE.has(word)) return false
  if (PEOPLE.has(word)) return true
  return /(ers|ors|ists|ians)$/.test(word) && word.length > 5
}

function tokenize(idea) {
  return idea
    .toLowerCase()
    .replace(/real[- ]time/g, 'realtime')
    .replace(/e-commerce/g, 'ecommerce')
    .replace(/[,.;:!?()/]+/g, ' | ')
    .replace(/[^a-z0-9|\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function hashString(value) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export { hashString }

/**
 * @returns {{
 *   actors: string[], entities: {name: string, compound: string}[], actions: {verb: string, record: string, label: string}[],
 *   traits: Set<string>, tone: string, keywords: string[], seed: number
 * }}
 */
export function analyseIdea(idea) {
  const text = String(idea ?? '')
  const words = tokenize(text)
  const actors = []
  const entities = []
  const actions = []
  const seenEntity = new Set()

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i]
    if (word === '|') continue
    const base = word.replace(/(ing|ed)$/, '')
    const action = ACTIONS[word] ?? ACTIONS[base] ?? ACTIONS[`${base}e`] ?? (word.endsWith('s') ? ACTIONS[word.slice(0, -1)] : undefined)
    if (action && !actions.some((a) => a.record === action.record)) {
      actions.push({ verb: word, ...action })
      continue
    }
    if (STOP_WORDS.has(word) || /^\d+$/.test(word) || word.length < 3) continue

    if (isPerson(word)) {
      const person = singular(word)
      if (!actors.includes(person)) actors.push(person)
      continue
    }
    if (MODIFIERS.has(word) || ACTIONS[word] || PRODUCT_WORDS.has(word)) continue
    if (/(ly|ful|ous|ive|able|ible|al)$/.test(word) && word.length > 6) continue

    const name = singular(word)
    const prev = words[i - 1] ?? ''
    const last = entities.at(-1)
    let compound = name
    if (last && last.name === singular(prev) && last.compound.split(' ').length < 3) {
      compound = `${last.compound} ${name}`
      entities.pop()
      seenEntity.delete(last.compound)
    } else if (MODIFIERS.has(prev) && !['ai', 'online', 'simple', 'smart', 'modern', 'new', 'digital', 'security', 'cybersecurity'].includes(prev)) {
      compound = `${prev} ${name}`
    }
    if (seenEntity.has(compound)) continue
    seenEntity.add(compound)
    entities.push({ name, compound })
  }

  for (const word of words) {
    for (const hinted of DOMAIN_ENTITIES[singular(word)] ?? []) {
      if (!seenEntity.has(hinted) && !entities.some((e) => e.name === hinted)) {
        seenEntity.add(hinted)
        entities.push({ name: hinted, compound: hinted })
      }
    }
  }

  const abstract = entities.filter((e) => DOMAIN_ENTITIES[e.name.split(' ').at(-1)] && !Object.values(DOMAIN_ENTITIES).flat().includes(e.name))
  for (const entity of abstract) entities.splice(entities.indexOf(entity), 1)

  const traits = new Set(Object.entries(TRAIT_PATTERNS).filter(([, re]) => re.test(text)).map(([key]) => key))
  if (actors.length >= 2 && actions.some((a) => ['booking', 'rental', 'order', 'listing', 'loan'].includes(a.record))) {
    traits.add('marketplace')
  }

  const tone = TONE_PATTERNS.find(([, re]) => re.test(text))?.[0] ?? (traits.has('marketplace') ? 'friendly' : 'modern')

  return {
    actors: actors.slice(0, 4),
    entities: entities.filter((e) => !['idea', 'way', 'thing'].includes(e.name)).slice(0, 6),
    actions: actions.slice(0, 5),
    traits,
    tone,
    keywords: words.filter((w) => w !== '|' && !STOP_WORDS.has(w)),
    seed: hashString(text.trim().toLowerCase()),
  }
}
