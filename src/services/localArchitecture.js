import { normaliseArchitecture } from './architectureSchema'

/**
 * Offline architecture generator used for the demo galaxy and whenever the
 * serverless AI endpoint is unavailable. It is keyword driven, so different
 * ideas still produce visibly different universes instead of a canned answer.
 */

const DOMAINS = [
  {
    key: 'commerce',
    match: /shop|store|ecommerce|e-commerce|marketplace|product|retail|cart|delivery|food|grocery/i,
    entity: 'product',
    pages: ['Catalog', 'Product Details', 'Cart', 'Checkout', 'Orders'],
    features: [
      ['Product Search', 'Full-text search with category and price filters'],
      ['Cart & Checkout', 'Persistent cart with secure payment capture'],
      ['Order Tracking', 'Live status updates from placement to delivery'],
      ['Reviews & Ratings', 'Verified buyer feedback on each product'],
    ],
    roles: [
      ['Customer', ['browse products', 'place orders', 'write reviews']],
      ['Seller', ['manage inventory', 'fulfil orders', 'view payouts']],
    ],
    tables: [
      ['products', ['id', 'seller_id', 'name', 'price', 'stock', 'created_at']],
      ['orders', ['id', 'user_id', 'total', 'status', 'created_at']],
      ['order_items', ['id', 'order_id', 'product_id', 'quantity', 'unit_price']],
      ['reviews', ['id', 'product_id', 'user_id', 'rating', 'body', 'created_at']],
    ],
    apis: [
      ['Payments API', 'Charge cards and issue refunds'],
      ['Shipping API', 'Rate quotes and delivery tracking'],
    ],
  },
  {
    key: 'learning',
    match: /learn|course|tutor|education|school|student|study|university|class/i,
    entity: 'course',
    pages: ['Course Catalog', 'Course Details', 'Lesson Player', 'My Learning', 'Certificates'],
    features: [
      ['Course Enrolment', 'Join a course and track completion'],
      ['Progress Tracking', 'Per-lesson progress and streaks'],
      ['Quizzes & Grading', 'Auto-graded assessments with feedback'],
      ['Live Sessions', 'Scheduled tutoring and office hours'],
    ],
    roles: [
      ['Student', ['enrol in courses', 'submit assignments', 'leave reviews']],
      ['Instructor', ['publish courses', 'grade submissions', 'host sessions']],
    ],
    tables: [
      ['courses', ['id', 'instructor_id', 'title', 'level', 'published', 'created_at']],
      ['lessons', ['id', 'course_id', 'title', 'position', 'duration']],
      ['enrollments', ['id', 'user_id', 'course_id', 'progress', 'created_at']],
      ['submissions', ['id', 'user_id', 'lesson_id', 'score', 'submitted_at']],
    ],
    apis: [
      ['Video API', 'Upload, transcode and stream lesson video'],
      ['Calendar API', 'Schedule live tutoring sessions'],
    ],
  },
  {
    key: 'health',
    match: /health|doctor|medical|clinic|patient|appointment|hospital|therapy|fitness/i,
    entity: 'appointment',
    pages: ['Find a Doctor', 'Doctor Profile', 'Book Appointment', 'My Appointments', 'Medical Records'],
    features: [
      ['Availability Search', 'Filter practitioners by speciality and slot'],
      ['Appointment Booking', 'Reserve, reschedule and cancel visits'],
      ['Reminders', 'Email and SMS reminders before each visit'],
      ['Secure Records', 'Encrypted notes, prescriptions and history'],
    ],
    roles: [
      ['Patient', ['book appointments', 'view records', 'message clinicians']],
      ['Practitioner', ['manage availability', 'write notes', 'issue prescriptions']],
    ],
    tables: [
      ['practitioners', ['id', 'user_id', 'speciality', 'clinic_id', 'rating']],
      ['appointments', ['id', 'patient_id', 'practitioner_id', 'starts_at', 'status']],
      ['records', ['id', 'patient_id', 'appointment_id', 'notes', 'created_at']],
      ['prescriptions', ['id', 'record_id', 'medication', 'dosage', 'issued_at']],
    ],
    apis: [
      ['Notifications API', 'Appointment reminders over email and SMS'],
      ['Payments API', 'Consultation fees and insurance claims'],
    ],
  },
  {
    key: 'social',
    match: /social|community|chat|forum|network|feed|message|post|blog|content/i,
    entity: 'post',
    pages: ['Feed', 'Explore', 'Profile', 'Messages', 'Notifications'],
    features: [
      ['Personalised Feed', 'Ranked timeline of followed accounts'],
      ['Direct Messaging', 'Realtime one-to-one and group chat'],
      ['Reactions & Comments', 'Threaded discussion on every post'],
      ['Moderation Tools', 'Reporting queue and automated filters'],
    ],
    roles: [
      ['Member', ['create posts', 'comment', 'follow accounts']],
      ['Moderator', ['review reports', 'remove content', 'suspend members']],
    ],
    tables: [
      ['posts', ['id', 'author_id', 'body', 'media_url', 'created_at']],
      ['comments', ['id', 'post_id', 'author_id', 'body', 'created_at']],
      ['follows', ['id', 'follower_id', 'followee_id', 'created_at']],
      ['messages', ['id', 'sender_id', 'recipient_id', 'body', 'sent_at']],
    ],
    apis: [
      ['Realtime API', 'WebSocket channels for chat and presence'],
      ['Media API', 'Image and video upload with CDN delivery'],
    ],
  },
  {
    key: 'saas',
    match: /saas|dashboard|analytics|crm|workflow|team|project|task|management|tool|platform|ai/i,
    entity: 'workspace',
    pages: ['Dashboard', 'Projects', 'Project Details', 'Reports', 'Settings'],
    features: [
      ['Workspace Collaboration', 'Invite teammates with scoped roles'],
      ['Analytics Dashboard', 'Usage and performance metrics over time'],
      ['Automations', 'Rule based triggers and scheduled jobs'],
      ['Audit Log', 'Immutable trail of every workspace action'],
    ],
    roles: [
      ['Member', ['create projects', 'comment', 'view reports']],
      ['Workspace Admin', ['manage billing', 'invite members', 'configure automations']],
    ],
    tables: [
      ['workspaces', ['id', 'owner_id', 'name', 'plan', 'created_at']],
      ['projects', ['id', 'workspace_id', 'name', 'status', 'created_at']],
      ['tasks', ['id', 'project_id', 'assignee_id', 'title', 'state', 'due_at']],
      ['events', ['id', 'workspace_id', 'actor_id', 'action', 'created_at']],
    ],
    apis: [
      ['Billing API', 'Subscriptions, invoices and usage metering'],
      ['Webhooks API', 'Outbound events for third-party integrations'],
    ],
  },
]

const STOP_WORDS = new Set([
  'i', 'want', 'to', 'a', 'an', 'the', 'build', 'create', 'make', 'app', 'application',
  'platform', 'website', 'site', 'system', 'where', 'that', 'for', 'and', 'with', 'my',
  'users', 'user', 'can', 'it', 'is', 'of', 'on', 'in',
])

function pickDomain(idea) {
  return DOMAINS.find((domain) => domain.match.test(idea)) ?? DOMAINS[DOMAINS.length - 1]
}

function titleCase(value) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}

function deriveName(idea, domain) {
  const words = idea
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 3)

  if (words.length === 0) return `${titleCase(domain.key)} Platform`
  return titleCase(words.join(' '))
}

const COMPLEXITY_LIMITS = {
  simple: { pages: 5, features: 3, tables: 3, apis: 1, roles: 2 },
  medium: { pages: 7, features: 4, tables: 4, apis: 2, roles: 3 },
  complex: { pages: 10, features: 6, tables: 6, apis: 3, roles: 4 },
}

export function generateLocalArchitecture(idea, { appType = 'SaaS', complexity = 'medium' } = {}) {
  const domain = pickDomain(idea)
  const limits = COMPLEXITY_LIMITS[complexity] ?? COMPLEXITY_LIMITS.medium
  const isMobile = /mobile/i.test(appType)

  const pages = ['Home', 'Sign In', 'Sign Up', ...domain.pages, 'Profile', 'Admin Dashboard']
    .slice(0, limits.pages + 3)
    .map((name) => ({ name, description: `${name} screen of the ${appType.toLowerCase()} experience` }))

  const features = domain.features.slice(0, limits.features).map(([name, description]) => ({
    name,
    description,
    relatedPages: pages.slice(3, 6).map((page) => page.name),
    relatedRoles: domain.roles.map(([role]) => role),
  }))

  if (limits.features > 4) {
    features.push({
      name: 'Role Based Access',
      description: 'Fine grained permissions enforced in the database layer',
      relatedPages: ['Admin Dashboard'],
      relatedRoles: ['Administrator'],
    })
  }

  const userRoles = [
    ...domain.roles.map(([name, permissions]) => ({ name, permissions, description: `${name} of the platform` })),
    { name: 'Administrator', permissions: ['manage users', 'moderate content', 'view analytics'], description: 'Operates the platform' },
    { name: 'Guest', permissions: ['browse public content'], description: 'Unauthenticated visitor' },
  ].slice(0, limits.roles)

  const tables = [
    { name: 'users', description: 'Account records linked to the auth provider', fields: ['id', 'auth_user_id', 'name', 'email', 'role', 'created_at'] },
    ...domain.tables.map(([name, fields]) => ({ name, description: `${titleCase(name)} records`, fields })),
    { name: 'notifications', description: 'In-app and email notifications', fields: ['id', 'user_id', 'kind', 'payload', 'read_at'] },
  ].slice(0, limits.tables + 1)

  const tableNames = tables.map((table) => table.name)
  const relationships = tableNames
    .slice(1)
    .map((name) => ({ from: 'users', to: name, type: 'one-to-many' }))
    .filter((rel) => rel.to !== 'users')

  if (tableNames.includes('orders') && tableNames.includes('order_items')) {
    relationships.push({ from: 'orders', to: 'order_items', type: 'one-to-many' })
  }

  const apis = [
    { name: 'Auth API', purpose: 'Session verification and profile sync' },
    ...domain.apis.map(([name, purpose]) => ({ name, purpose })),
  ].slice(0, limits.apis + 1)

  return normaliseArchitecture(
    {
      projectName: deriveName(idea, domain),
      description: idea.trim().slice(0, 240),
      pages,
      features,
      userRoles,
      frontend: isMobile
        ? ['React Native', 'Expo', 'NativeWind', 'React Navigation']
        : ['React', 'Vite', 'Tailwind CSS', 'React Router'],
      backend: ['Node.js', 'Serverless Functions', 'Supabase Edge Functions'],
      database: { type: 'PostgreSQL (Supabase)', tables },
      apis,
      relationships,
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
