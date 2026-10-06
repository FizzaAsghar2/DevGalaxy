import { normaliseArchitecture } from './architectureSchema.js'
import { analyseIdea, plural, snake, titleCase } from './ideaAnalysis.js'

/**
 * Offline architecture generator, used for the demo galaxy and whenever the AI
 * provider is unavailable. It composes the architecture from the idea's own
 * actors, entities, actions and traits (see ideaAnalysis) rather than picking a
 * canned template, so two unrelated ideas produce unrelated galaxies.
 */

const COMPLEXITY_LIMITS = {
  simple: { pages: 5, features: 3, tables: 3, apis: 1, roles: 2 },
  medium: { pages: 7, features: 4, tables: 4, apis: 2, roles: 3 },
  complex: { pages: 10, features: 6, tables: 6, apis: 3, roles: 4 },
}

const NAME_SUFFIX = {
  search: 'Finder',
  booking: 'Book',
  reservation: 'Reserve',
  rental: 'Rent',
  loan: 'Share',
  order: 'Market',
  listing: 'Market',
  assignment: 'Split',
  session: 'Coach',
  enrollment: 'Academy',
  match: 'Arena',
  report: 'Watch',
  log: 'Track',
  metric: 'Pulse',
  budget: 'Wise',
  work_order: 'Desk',
  record: 'Hub',
}

const RECORD_FIELDS = {
  booking: ['starts_at', 'ends_at', 'status', 'total_price'],
  reservation: ['starts_at', 'party_size', 'status'],
  rental: ['start_date', 'end_date', 'daily_rate', 'status', 'deposit'],
  loan: ['borrowed_at', 'due_at', 'returned_at', 'status'],
  order: ['total', 'status', 'placed_at'],
  listing: ['title', 'price', 'status', 'published_at'],
  payment: ['amount', 'currency', 'provider_ref', 'status'],
  report: ['summary', 'severity', 'status', 'reported_at'],
  log: ['value', 'note', 'logged_at'],
  assignment: ['assignee_id', 'due_on', 'status', 'points'],
  session: ['started_at', 'duration_minutes', 'score', 'status'],
  enrollment: ['progress', 'status', 'enrolled_at'],
  match: ['room_code', 'status', 'started_at', 'winner_id'],
  review: ['rating', 'body'],
  message: ['sender_id', 'body', 'sent_at', 'read_at'],
  application: ['status', 'motivation', 'submitted_at', 'decided_at'],
  membership: ['role', 'status', 'joined_at'],
  work_order: ['priority', 'status', 'scheduled_for', 'completed_at'],
  budget: ['category', 'limit_amount', 'period'],
  post: ['title', 'body', 'published_at'],
  event: ['title', 'starts_at', 'location', 'capacity'],
  vote: ['choice', 'cast_at'],
}

function ownerRole(analysis, entity) {
  if (analysis.actors.length === 0) return 'Member'
  return titleCase(analysis.actors[0])
}

function buildRoles(analysis, entity, marketplace) {
  const roles = analysis.actors.map((actor) => titleCase(actor))
  if (marketplace && roles.length === 1) {
    const providerIsActor = !analysis.entities.length || entity.toLowerCase() === roles[0].toLowerCase()
    roles.push(providerIsActor ? 'Client' : `${titleCase(entity)} Owner`)
  }
  if (roles.length === 0) roles.push(analysis.traits.has('community') ? 'Member' : 'User')
  if (analysis.traits.has('security') && !roles.some((r) => /analyst/i.test(r))) roles.push('Analyst')
  roles.push('Administrator')
  if (analysis.traits.has('marketplace') || analysis.traits.has('community')) roles.push('Guest')
  return [...new Set(roles)]
}

export function generateLocalArchitecture(idea, { appType = 'SaaS', complexity = 'medium' } = {}) {
  const analysis = analyseIdea(idea)
  const limits = COMPLEXITY_LIMITS[complexity] ?? COMPLEXITY_LIMITS.medium
  const { traits } = analysis
  const marketplace = traits.has('marketplace')
  const isMobile = /mobile/i.test(appType)

  const providerActor = marketplace && analysis.actors.length ? analysis.actors.at(-1) : null
  const primary =
    analysis.entities[0]?.compound ??
    providerActor ??
    analysis.actions.find((a) => a.record !== 'search' && a.record !== 'record')?.record ??
    analysis.keywords.find((word) => word.length > 3) ??
    'item'
  const E = titleCase(primary)
  const Es = titleCase(plural(primary))
  const secondary = analysis.entities.slice(1).map((e) => e.compound)
  const records = analysis.actions.map((a) => a.record).filter((r) => !['search', 'record'].includes(r))
  const mainAction = analysis.actions.find((a) => a.record !== 'search')
  const findAction = analysis.actions.find((a) => a.record === 'search')

  const roles = buildRoles(analysis, primary, marketplace)
  const userRoles = roles.map((name) => {
    const permissions =
      name === 'Administrator'
        ? ['manage users', 'moderate content', 'view analytics']
        : name === 'Guest'
          ? [`browse ${Es.toLowerCase()}`]
          : [
              `${findAction ? findAction.label.toLowerCase() : 'view'} ${Es.toLowerCase()}`,
              mainAction ? `${mainAction.label.toLowerCase()} ${Es.toLowerCase()}` : `manage ${Es.toLowerCase()}`,
              traits.has('messaging') || marketplace ? 'send messages' : 'update profile',
            ]
    return { name, permissions, description: `${name} of ${E.toLowerCase()} workflows` }
  })

  // Pages in priority order; complexity decides how deep the list goes.
  const toolLike = traits.has('analytics') || traits.has('security') || traits.has('operations') || traits.has('ai')
  const pages = []
  const add = (name, description) => {
    if (!pages.some((p) => p.name.toLowerCase() === name.toLowerCase())) pages.push({ name, description })
  }
  if (toolLike && !marketplace) add('Dashboard', `Overview of ${Es.toLowerCase()} and what needs attention`)
  else add('Home', `Landing page introducing the ${E.toLowerCase()} experience`)
  if (traits.has('ai')) add(traits.has('learning') ? `Start ${E}` : 'AI Assistant', `Start an AI-guided ${E.toLowerCase()} session`)
  add(
    findAction ? `${findAction.label} ${Es}` : traits.has('security') ? Es : `${Es}`,
    `Searchable, filterable list of ${Es.toLowerCase()}`,
  )
  add(`${E} Details`, `Everything about a single ${E.toLowerCase()}`)
  if (mainAction && mainAction.record !== 'record') add(`${mainAction.label} ${E}`, `Flow to ${mainAction.label.toLowerCase()} a ${E.toLowerCase()}`)
  else if (!toolLike) add(`New ${E}`, `Create a ${E.toLowerCase()}`)
  if (traits.has('ai') && traits.has('learning')) add(`${E} Session`, `Live AI-driven ${E.toLowerCase()} session`)
  if (traits.has('ai')) add(traits.has('learning') ? 'AI Feedback' : 'Saved Results', 'Model output with scores and highlights')
  if (traits.has('realtime') && traits.has('gamified')) add('Live Game', 'Realtime room where players answer together')
  if (traits.has('security')) add('Alerts', 'Incoming alerts ranked by severity')
  if (traits.has('security')) add('Incident Timeline', 'Chronological response log for an incident')
  if (traits.has('gamified')) add('Leaderboard', 'Points and ranking between participants')
  if (traits.has('scheduling')) add('Calendar', 'Upcoming sessions and availability')
  if (traits.has('messaging') || marketplace) add('Messages', 'Conversations between participants')
  if (traits.has('location')) add('Map View', `${Es} plotted by location`)
  if (traits.has('analytics') || traits.has('security')) add('Reports', 'Trends and exportable reports')
  if (traits.has('community')) add('Members', 'Directory of members and roles')
  if (traits.has('payments')) add('Checkout', 'Secure payment and confirmation')
  for (const role of roles.filter((r) => !['Administrator', 'Guest'].includes(r)).slice(0, 2)) add(`${role} Dashboard`, `Personal workspace for ${plural(role).toLowerCase()}`)
  add('History', `Past ${records[0] ? plural(records[0].replace(/_/g, ' ')) : 'activity'}`)
  add('Profile', 'Account details and preferences')
  add('Settings', 'Notification, privacy and account settings')
  add('Admin Console', 'Moderation, users and platform analytics')

  const limitedPages = [...pages.slice(0, limits.pages + 1), { name: 'Sign In', description: 'Authentication' }].slice(0, limits.pages + 3)

  const pageNames = limitedPages.map((p) => p.name)
  const pick = (re, fallback) => pageNames.filter((n) => re.test(n)).slice(0, 2).concat(fallback ? [fallback] : []).filter(Boolean)
  const consumerRoles = roles.filter((r) => !['Administrator', 'Guest'].includes(r))

  const features = []
  const feat = (name, description, related) =>
    features.push({ name, description, relatedPages: related, relatedRoles: consumerRoles.slice(0, 2) })
  feat(`${findAction ? findAction.label : 'Browse'} & Filter ${Es}`, `Search ${Es.toLowerCase()} by keyword, status and attributes`, pick(/Find|Search|Browse|Explore|Discover|Es$/, pageNames[1]))
  if (mainAction) feat(`${mainAction.label} Flow`, `Guided flow to ${mainAction.label.toLowerCase()} ${Es.toLowerCase()} with validation`, pick(new RegExp(mainAction.label)))
  if (traits.has('ai')) feat('AI Engine', `Model-generated guidance, scoring and summaries for each ${E.toLowerCase()}`, pick(/AI|Session|Feedback|Result/))
  if (traits.has('realtime')) feat('Realtime Sync', 'Live presence and instant updates across devices', pick(/Live|Session|Messages/))
  if (traits.has('security')) feat('Severity Triage', 'Prioritise and assign incidents by severity and SLA', pick(/Alert|Timeline|Dashboard/))
  if (traits.has('gamified')) feat('Points & Streaks', 'Reward progress and rank participants', pick(/Leaderboard|Dashboard/))
  if (traits.has('scheduling')) feat('Availability & Scheduling', 'Time slots, reminders and calendar sync', pick(/Calendar|Book|Rent|Reserve/))
  if (traits.has('payments')) feat('Secure Payments', 'Checkout, receipts and refunds through a payment provider', pick(/Checkout|Book|Rent/))
  if (traits.has('messaging') || marketplace) feat('Messaging', 'One-to-one conversations with notifications', pick(/Messages/))
  if (traits.has('location')) feat('Location Search', `Find ${Es.toLowerCase()} near a point on the map`, pick(/Map/))
  if (traits.has('analytics')) feat('Insights & Reports', 'Charts and exports for trends over time', pick(/Report|Dashboard/))
  if (marketplace) feat('Ratings & Reviews', `Trust signals on every ${E.toLowerCase()}`, pick(/Details/))
  if (traits.has('approval')) feat('Review & Approval', 'Moderated approval workflow with audit trail', pick(/Admin/))
  if (traits.has('community')) feat('Roles & Membership', 'Invite members and manage roles', pick(/Members|Admin/))
  feat('Notifications', 'In-app and email notifications for important changes', pick(/Dashboard|Profile/))
  feat('Role Based Access', 'Permissions enforced in the database layer', pick(/Admin/))

  const tables = [{ name: 'users', description: 'Accounts linked to the auth provider', fields: ['id', 'auth_user_id', 'name', 'email', 'role', 'created_at'] }]
  const primaryTable = snake(plural(primary))
  tables.push({
    name: primaryTable,
    description: `${Es} managed in the product`,
    fields: ['id', 'owner_id', 'title', 'description', 'status', ...(traits.has('location') ? ['latitude', 'longitude'] : []), ...(traits.has('payments') ? ['price'] : []), 'created_at'],
  })
  for (const record of records) {
    tables.push({
      name: snake(plural(record)),
      description: `${titleCase(plural(record))} for ${Es.toLowerCase()}`,
      fields: ['id', `${snake(primary)}_id`, 'user_id', ...(RECORD_FIELDS[record] ?? ['status', 'notes']), 'created_at'],
    })
  }
  for (const entity of secondary) {
    tables.push({ name: snake(plural(entity)), description: `${titleCase(plural(entity))} records`, fields: ['id', 'user_id', 'name', 'status', 'created_at'] })
  }
  if (traits.has('ai')) tables.push({ name: 'ai_results', description: 'Stored model output', fields: ['id', `${snake(primary)}_id`, 'prompt', 'output', 'score', 'created_at'] })
  if (traits.has('security')) tables.push({ name: 'timeline_events', description: 'Response actions per incident', fields: ['id', `${snake(primary)}_id`, 'actor_id', 'action', 'created_at'] })
  if (traits.has('gamified')) tables.push({ name: 'scores', description: 'Points per participant', fields: ['id', 'user_id', 'points', 'streak', 'updated_at'] })
  if (marketplace) tables.push({ name: 'reviews', description: 'Ratings left after a transaction', fields: ['id', `${snake(primary)}_id`, 'user_id', 'rating', 'body', 'created_at'] })
  if (traits.has('messaging') || marketplace) tables.push({ name: 'messages', description: 'Conversation messages', fields: ['id', 'sender_id', 'recipient_id', 'body', 'sent_at', 'read_at'] })
  if (traits.has('payments')) tables.push({ name: 'payments', description: 'Payment provider records', fields: ['id', 'user_id', 'amount', 'currency', 'provider_ref', 'status'] })
  tables.push({ name: 'notifications', description: 'In-app and email notifications', fields: ['id', 'user_id', 'kind', 'payload', 'read_at'] })

  const uniqueTables = tables.filter((t, i) => tables.findIndex((o) => o.name === t.name) === i).slice(0, limits.tables + 1)
  const names = uniqueTables.map((t) => t.name)
  const relationships = names.slice(1).map((name) => ({ from: 'users', to: name, type: 'one-to-many' }))
  for (const table of uniqueTables.slice(2)) {
    if (table.fields.includes(`${snake(primary)}_id`)) relationships.push({ from: primaryTable, to: table.name, type: 'one-to-many' })
  }

  const apis = [{ name: 'Auth API', purpose: 'Session verification and profile sync' }]
  if (traits.has('ai')) apis.push({ name: 'LLM API', purpose: `Generate ${E.toLowerCase()} guidance and scoring` })
  if (traits.has('payments')) apis.push({ name: 'Payments API', purpose: 'Checkout sessions, webhooks and refunds' })
  if (traits.has('location')) apis.push({ name: 'Maps API', purpose: 'Geocoding and nearby search' })
  if (traits.has('realtime') || traits.has('messaging')) apis.push({ name: 'Realtime API', purpose: 'WebSocket channels for live updates' })
  if (traits.has('security')) apis.push({ name: 'Threat Intel API', purpose: 'Enrich alerts with indicator data' })
  if (traits.has('scheduling')) apis.push({ name: 'Calendar API', purpose: 'Sync sessions with Google/Outlook calendars' })
  if (traits.has('media')) apis.push({ name: 'Media Storage API', purpose: 'Image upload, resizing and CDN delivery' })
  apis.push({ name: 'Email API', purpose: 'Transactional email and reminders' })

  const baseName = titleCase(primary.split(' ').at(-1))
  const suffix = NAME_SUFFIX[mainAction?.record ?? findAction?.record ?? ''] ?? (traits.has('ai') ? 'AI' : traits.has('security') ? 'Shield' : 'Hub')
  const projectName = `${baseName.replace(/\s+/g, '')}${suffix}`

  return normaliseArchitecture(
    {
      projectName,
      description: String(idea).trim().slice(0, 240),
      pages: limitedPages,
      features: features.slice(0, limits.features + 1),
      userRoles: userRoles.slice(0, limits.roles + (roles.length > limits.roles ? 0 : 0)),
      frontend: isMobile
        ? ['React Native', 'Expo', 'NativeWind', 'React Navigation']
        : ['React', 'Vite', 'Tailwind CSS', 'React Router'],
      backend: ['Node.js', 'Serverless Functions', ...(traits.has('realtime') ? ['Supabase Realtime'] : ['Supabase Edge Functions'])],
      database: { type: 'PostgreSQL (Supabase)', tables: uniqueTables },
      apis: apis.slice(0, limits.apis + 1),
      relationships,
      ownerRole: ownerRole(analysis, primary),
    },
    'Untitled Project',
  )
}

export const DEMO_IDEA =
  'I want to build an online food delivery application where customers browse restaurants, place orders and track delivery in realtime.'

export function buildDemoGalaxy() {
  const architecture = generateLocalArchitecture(DEMO_IDEA, { appType: 'Website', complexity: 'complex' })
  return {
    id: 'demo',
    project_name: architecture.projectName,
    original_idea: DEMO_IDEA,
    description: architecture.description,
    app_type: 'Website',
    complexity: 'complex',
    architecture_data: architecture,
    ui_data: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
