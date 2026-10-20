# DevGalaxy · Galaxy Studio

**Your ideas. Beautiful websites. Powered by AI.** Galaxy Studio (`/studio/new`, `/projects`) turns a
website description into a structured plan, design variations, real React + Tailwind source code, a live
sandboxed preview, chat-driven edits with version history, and a downloadable project ZIP. See
[docs/galaxy-studio.md](docs/galaxy-studio.md).

**The architecture galaxy is still here:** DevGalaxy turns a one-sentence product idea into an interactive
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

A banner in the app makes it clear when demo mode is active.

### Explore Demo vs My Workspace

- **Explore Demo** (`/galaxy/demo`, “Explore Demo” in the navbar) is a sample galaxy with simulated
  actions. It is labelled *Explore Demo · sample data*, saves nothing and shows no personal data.
- **My Workspace** (`/dashboard`, `/galaxies`) holds your own galaxies. Without Clerk + Supabase it is
  labelled *Demo · saved in this browser*; with them it shows *My Workspace · synced*.
- **Settings → Workspace** lists which integrations (sign-in, storage, AI) are really connected. Add the environment variables below to
switch each piece over to the real service.

## Environment variables

Copy `.env.example`. Only `VITE_`-prefixed variables reach the browser; the AI key never does.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | client | Clerk frontend key |
| `VITE_SUPABASE_URL` | client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client | Supabase anon key (RLS enforced) |
| `CLERK_SECRET_KEY` | server | Verifies the caller's session token in `/api/generate` |
| `AI_PROVIDER` | server | `openai` (any OpenAI-compatible API), `anthropic` or `gemini`; default `openai` |
| `AI_API_KEY` | server | Provider API key |
| `AI_MODEL_FAST` | server | Optional cheaper model for small Studio edits |
| `AI_TIMEOUT_MS` | server | Optional provider timeout (default 90000) |
| `AI_MAX_REQUEST_USD` / `AI_DAILY_BUDGET_USD` | server | Optional per-request and daily AI spend caps |
| `AI_BASE_URL` | server | Defaults to `https://api.openai.com/v1` |
| `AI_MODEL` | server | Defaults to `gpt-4o-mini` |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Roles, AI usage, `/admin` and source export (never expose) |
| `SUPABASE_URL` | server | Optional; defaults to `VITE_SUPABASE_URL` |
| `AI_MONTHLY_BUDGET_USD` | server | Optional monthly AI spend cap; AI calls are refused once reached |
| `AI_USD_PER_MILLION_TOKENS` | server | Optional; converts provider-reported tokens into measured cost |
| `VITE_SOURCE_REPO_URL` | client | Optional; repository used for the fallback “main branch .zip” link |

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

## Galaxy Studio

Describe → review plan → choose design → edit. Full details, security model and limitations are in
[docs/galaxy-studio.md](docs/galaxy-studio.md). In short:

- Projects and every version are stored in this browser (IndexedDB), scoped per signed-in user. Labelled
  “Saved in this browser”; nothing is synced to a server yet.
- Without `AI_API_KEY` the Studio runs in **Offline (Demo)** mode: a rule-based planner and editor that
  understands common requests (“make the navbar sticky”, “change the theme to emerald”, “add a contact
  section”). Unsupported requests are reported, never faked.
- Previews are compiled on the server by `api/studio-build.js` (esbuild + Tailwind, in memory, import
  allow-list) and run in a sandboxed iframe without `allow-same-origin`, with a CSP that blocks network
  access, frames and form posts.
- Download ZIP produces a standalone React/Vite or Next.js + TypeScript project.

## UI Preview (architecture galaxy)

Every galaxy can be turned into a clickable multi-page prototype (Workspace → **UI Preview**).
`/api/generate-ui` produces a `uiDesign` + `uiPages` spec with exactly one UI page per architecture page,
realistic mock data and a design system chosen for the product. With `AI_API_KEY` the model designs it;
without one, the offline generator in `src/services/localUi.js` composes pages from the architecture
(browse/detail/form/dashboard/session/chat/map/… layouts). Supports Desktop/Tablet/Mobile frames,
full-screen **Open Demo**, style/theme selection, regenerate, design variations and natural-language edits
(“make it dark and purple”, “use a table here”). Page nodes offer **View UI**; UI pages offer **View in Architecture**.

## Personal use: AI usage and spend

DevGalaxy is a personal tool. There are **no subscription plans, pricing, payment gateways or customer
billing**. Instead, every AI generation is recorded so you can control cost:

- `/api/generate` and `/api/generate-ui` verify the Clerk token, then call `reserve_usage()`, which records a
  usage event with an estimated cost (advisory lock, so parallel requests cannot overshoot the budget).
- When the provider reports token usage, the event is updated with the token count and, if
  `AI_USD_PER_MILLION_TOKENS` is set, the measured cost.
- If `AI_MONTHLY_BUDGET_USD` is set and this month's spend has reached it, AI calls are refused with
  `budget_reached` before the provider is called. Offline generations cost nothing and are never blocked.
- **Settings → Usage & spend** shows this month's generations, estimated spend, budget, a 14-day chart,
  per-action counts and recent activity. In demo mode the log lives in this browser and can be cleared.

Run `supabase/migrations/0003_personal_use.sql` after `0002` to drop the old plan/subscription tables and
add `cost_cents`/`tokens` to `usage_events`.

## Source code export

**Settings → Export → Download Source Code (.zip)** calls `/api/export`, which streams a ZIP of the project
built from an allow-list (`src/`, `api/`, `public/`, `supabase/`, README, AGENTS.md, `package.json`,
lockfile, build config, `.env.example`). `.env*` files (except `.env.example`), keys, logs, database dumps,
`.git`, `node_modules`, `dist` and caches are never included, and any file containing the value of a
configured server secret is skipped. In managed mode only the owner (database role `admin`) can
download; the request is rate-limited. If the in-app export is unavailable, the Export tab links to the
repository's `main` branch ZIP instead.

The archive extracts to `devgalaxy/` and runs with `npm install && npm run dev`.

### Making the administrator

There is no admin password anywhere. Roles are stored in `profiles.role` and can only be changed with
database access. After running `supabase/migrations/0002_ui_plans_admin.sql`, sign in once with the
admin email so the profile exists, then run in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where lower(email) = lower('fizzaasghar47@gmail.com');
```

The profile email is taken from the verified Clerk account, so only that Clerk user can hold it.
`/admin` (and every `/api/admin` call) returns 403 for anyone whose database role is not `admin`.
Admin actions (suspensions, reactivations and galaxy deletions) are written to
`admin_audit_logs`.

## Deploying to Vercel

1. Import the repository at <https://vercel.com/new>. Vite is detected automatically and each file in `api/`
   becomes a serverless function (`vercel.json` bundles the source files `api/export.js` needs).
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
api/                         serverless API: generate, generate-ui, me, admin, export, studio-ai, studio-build
api/_lib/providers.js        OpenAI-compatible / Anthropic / Gemini provider abstraction (server only)
api/_lib/studioUsage.js      Studio AI budgets (request/day/month) and usage ledger
src/studio/core/             Galaxy Studio planner, design tokens, code generator, offline editor, path/secret checks, ZIP
src/studio/                  Studio API client, IndexedDB storage, preview document, examples
src/pages/studio/            new project, editor, projects, preview pages
src/components/studio/       preview frame, spec editor, variations, chat, design, code inspector, versions, assets
tests/                       Vitest suites (npm test)
docs/                        Galaxy Studio documentation
api/_lib/sourceZip.js        allow-listed, secret-free source ZIP builder
src/auth/                    Clerk provider + local demo fallback
src/components/three/        canvas, starfield, nebula, orbs, curved connections
src/components/galaxy/       scene, 2D flow map, inspector, toolbar, rail, generation sequence
src/components/landing/      hero scene + CSS fallback
src/pages/                   landing, dashboard, create, my galaxies, workspace, settings, admin, 404
src/services/                AI client, schema validation, local generator, layout, persistence
supabase/migrations/         schema + RLS
```

## Keyboard shortcuts (workspace)

| Key | Action |
| --- | --- |
| `P` | Toggle presentation mode |
| `Esc` | Exit presentation / zoom back out / close inspector |
