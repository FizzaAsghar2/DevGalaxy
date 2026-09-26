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
