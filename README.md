# DevGalaxy

**See your app before you build it.** DevGalaxy turns a one-sentence product idea into an interactive
3D architecture galaxy — pages, features, user roles, database schema, APIs and a recommended stack,
orbiting the project core.

- Landing page with a WebGL hero (starfield, nebula, glowing core, orbiting category planets, pointer parallax)
- Cinematic generation sequence instead of a spinner
- 3D galaxy workspace: click a planet to fly the camera to it and reveal its children
- Glass node inspector with database fields and relationships
- Three zoom levels with breadcrumbs: project → category → component
- Presentation mode (`P`) for demos: UI hidden, camera slowly orbiting
- 2D React Flow fallback for mobile, reduced-motion and machines without WebGL
- Secure server-side AI generation, Clerk auth, Supabase persistence with row level security

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS, Framer Motion |
| 3D | Three.js, @react-three/fiber, @react-three/drei |
| 2D fallback | @xyflow/react (React Flow) |
| Auth | Clerk |
| Database | Supabase (Postgres + RLS) |
| AI | Any OpenAI-compatible provider, called from a serverless function |
| Hosting | Vercel |

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — see "Demo mode" below
npm run dev                  # http://localhost:5173
```

### Demo mode

The app is fully usable with **no credentials at all**:

- no Clerk key → a local demo account is used, stored in `localStorage`
- no Supabase key → galaxies are saved to `localStorage`
- no AI key (or no serverless runtime in `vite dev`) → a local generator produces a domain-aware
  architecture from your idea (commerce, learning, health, social or generic SaaS), so different
  ideas still produce different galaxies

A banner in the app makes it clear when demo mode is active. Add the environment variables below to
switch each piece over to the real service.

## Environment variables

Copy `.env.example`. Only `VITE_`-prefixed variables reach the browser; the AI key never does.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | client | Clerk frontend key |
| `VITE_SUPABASE_URL` | client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client | Supabase anon key (RLS enforced) |
| `CLERK_SECRET_KEY` | server | Verifies the caller's session token in `/api/generate` |
| `AI_API_KEY` | server | OpenAI-compatible API key |
| `AI_BASE_URL` | server | Defaults to `https://api.openai.com/v1` |
| `AI_MODEL` | server | Defaults to `gpt-4o-mini` |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Roles, plans, usage and `/admin` (never expose) |
| `SUPABASE_URL` | server | Optional; defaults to `VITE_SUPABASE_URL` |
| `BILLING_PROVIDER`, `BILLING_WEBHOOK_SECRET` | server | Reserved for verified checkout webhooks |

## Clerk setup

1. Create an application at <https://dashboard.clerk.com>.
2. Copy the **Publishable key** into `VITE_CLERK_PUBLISHABLE_KEY` and the **Secret key** into `CLERK_SECRET_KEY`.
3. Under **Configure → Sessions → Customize session token**, nothing extra is required — the default
   token already contains the `sub` claim used by the Supabase policies.
4. Add your deployment domain under **Domains** before going to production.

## Supabase setup

1. Create a project at <https://supabase.com/dashboard>, then copy the project URL and anon key.
2. Run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in the SQL editor. It creates
   `profiles` and `galaxies`, an `updated_at` trigger, and RLS policies.
3. Connect Clerk as a third-party auth provider (**Authentication → Sign In / Providers → Clerk**) so
   Supabase accepts Clerk session JWTs.

Ownership is enforced in the database, not the UI: every policy compares `user_id` with the `sub`
claim of the request JWT, so changing a galaxy id in the URL returns nothing for a different user.

## AI setup

`api/generate.js` is the only place that talks to the model. It:

- accepts `POST` only, and verifies the Clerk session token when `CLERK_SECRET_KEY` is set
- rate limits to 8 requests per minute per user/IP
- validates idea length before spending a token
- asks for strict JSON and parses it even when the provider wraps it in a code fence

The response is normalised and validated client-side (`src/services/architectureSchema.js`) before it
is rendered or saved, so a malformed model response can never corrupt a galaxy.

Any OpenAI-compatible provider works — set `AI_BASE_URL` to Groq, OpenRouter, Together, etc.

## UI Preview

Every galaxy can be turned into a clickable multi-page prototype (Workspace → **UI Preview**).
`/api/generate-ui` produces a `uiDesign` + `uiPages` spec with exactly one UI page per architecture page,
realistic mock data and a design system chosen for the product. With `AI_API_KEY` the model designs it;
without one, the offline generator in `src/services/localUi.js` composes pages from the architecture
(browse/detail/form/dashboard/session/chat/map/… layouts). Supports Desktop/Tablet/Mobile frames,
full-screen **Open Demo**, style/theme selection, regenerate, design variations and natural-language edits
(“make it dark and purple”, “use a table here”). Page nodes offer **View UI**; UI pages offer **View in Architecture**.

## Plans, usage and admin

| Plan | Galaxies | UI previews | Regenerations / variations / AI edits |
| ---- | -------- | ----------- | ------------------------------------- |
| Free | 1 | 1 | — |
| Pro  | 50 / period | 50 / period | 200 / period |

Limits live in the `plans` table (editable in `/admin`). Every restricted request is checked **on the server
before the AI provider is called**: `/api/generate` and `/api/generate-ui` verify the Clerk token, load the
role, plan and usage with the Supabase service role, and reserve usage atomically via `reserve_usage()`
(advisory lock, so parallel requests cannot exceed a limit). Saved galaxies and previews stay available
after limits are reached. Browser state (localStorage, React state, edited JS) is never trusted for role,
plan or ownership.

Without Clerk + Supabase (demo mode) the Free plan is simulated in the browser so the upgrade flow can
be explored; demo mode has no Pro or admin access.

### Making the administrator

There is no admin password anywhere. Roles are stored in `profiles.role` and can only be changed with
database access. After running `supabase/migrations/0002_ui_plans_admin.sql`, sign in once with the
admin email so the profile exists, then run in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where lower(email) = lower('fizzaasghar47@gmail.com');
```

The profile email is taken from the verified Clerk account, so only that Clerk user can hold it.
`/admin` (and every `/api/admin` call) returns 403 for anyone whose database role is not `admin`.
Admin actions (plan changes, Pro grants, suspensions, galaxy deletions, plan edits) are written to
`admin_audit_logs`.

### Payments

Checkout is intentionally not faked. Until `BILLING_PROVIDER` and `BILLING_WEBHOOK_SECRET` are set and a
verified webhook handler writes `subscriptions`, the Pro button explains that checkout is not connected;
admins can grant Pro manually.

## Deploying to Vercel

1. Import the repository at <https://vercel.com/new>. Vite is detected automatically and `api/generate.js`
   becomes a serverless function.
2. Add all environment variables from the table above (the `VITE_` ones plus the server-only ones).
3. Deploy. `vercel.json` rewrites non-`/api` paths to `index.html` for client-side routing.

```bash
npm run build     # production build into dist/
npm run preview   # serve the build locally
npm run lint      # oxlint
```

## Performance

The 3D layer is designed to stay smooth on an ordinary laptop:

- device tiers (`high`/`medium`/`low`) drive star counts, DPR, orbit detail and particle trails
- `AdaptiveDpr` + `PerformanceMonitor` drop resolution when frames get expensive, and fall back to the
  2D map on low-tier devices
- rendering pauses when the tab is hidden
- `prefers-reduced-motion` disables rotation, parallax and animated particles everywhere
- mobile and non-WebGL devices get the React Flow map instead of the galaxy

## Project structure

```
api/generate.js              secure AI endpoint (server only)
src/auth/                    Clerk provider + local demo fallback
src/components/three/        canvas, starfield, nebula, orbs, curved connections
src/components/galaxy/       scene, 2D flow map, inspector, toolbar, rail, generation sequence
src/components/landing/      hero scene + CSS fallback
src/pages/                   landing, dashboard, create, my galaxies, workspace, 404
src/services/                AI client, schema validation, local generator, layout, persistence
supabase/migrations/         schema + RLS
```

## Keyboard shortcuts (workspace)

| Key | Action |
| --- | --- |
| `P` | Toggle presentation mode |
| `Esc` | Exit presentation / zoom back out / close inspector |
