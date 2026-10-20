# DevGalaxy — permanent project rules

These rules apply to every feature or module added to DevGalaxy.

## 1. Frontend is mandatory
- Always build the complete, modern frontend for a new feature. Backend work is optional when it is not
  needed or not yet possible.
- Never leave a feature without a usable visual interface.
- If the backend is unavailable, use realistic mock data and label the feature **Demo** or **Preview**.
- Never pretend a simulated feature is connected to a real service.

## 2. Premium dark UI
- Deep navy/charcoal backgrounds, purple and electric-blue accents, glassmorphism (`.glass`), smooth
  gradients and subtle glow, modern typography and lucide icons, animated dashboards and charts.
- Responsive for desktop, tablet and mobile.
- Use Motion for React (`framer-motion`) where it helps; respect `prefers-reduced-motion`.
- Every page must look like part of the same application (reuse `AppLayout`, `.glass`, `.btn-*`, `.chip`).
- The 3D galaxy is DevGalaxy's identity; do not turn pages into a generic flat SaaS dashboard.

## 3. Interactive frontend
- Working navigation, search/filtering, interactive cards, forms and dialogs, tabs and dropdowns,
  calendar interactions, drag-and-drop where useful, animated progress, task completion controls,
  notification panels, and loading/empty/error states.
- Without a backend, interactions work with local sample data or `localStorage`.
- **Never create a button that looks functional but does nothing.**

## 4. Explore Demo vs My Workspace
- **Explore Demo** (`/galaxy/demo`): fully interactive sample data and simulated actions; saves nothing;
  never shows private information.
- **My Workspace** (`/dashboard`, `/galaxies`): the user's private galaxies; shows real connected data only
  where an integration is implemented, otherwise labelled as browser-only demo storage.
- Always make clear which parts are demo and which are real integrations.

## 5. Source code export
- Keep **Settings → Export → Download Source Code (.zip)** working (`api/export.js`,
  `api/_lib/sourceZip.js`). New top-level source paths must be added to the allow-list there and to
  `includeFiles` in `vercel.json`.
- The ZIP contains frontend, backend, assets, config templates, docs, README and `.env.example` — never
  `.env` files, keys, passwords, tokens, user data, database dumps, `.git`, `node_modules` or build caches.
- After changing the export, verify the ZIP extracts, `npm install` succeeds and `npm run build` passes.
- Provide a development preview link whenever the environment supports it.

## 6. Personal use only
- Do not build subscription plans, SaaS pricing, payment gateways or customer billing.
- Keep AI usage and spend tracking (`src/lib/usage.js`, Settings → Usage & spend) for personal cost control.

## 7. Security (unchanged)
- Identity comes from verified Clerk tokens; roles from `profiles.role` via the service key on the server.
  Never grant privileges from client state, `localStorage`, URLs or hardcoded emails/passwords.
- Architecture-galaxy UI previews are structured JSON rendered by trusted components.
- Galaxy Studio websites are real generated code: validate paths/content (`src/studio/core/paths.js`), compile
  on the server from memory with an import allow-list (`api/studio-build.js`), and run them only in a
  sandboxed iframe (`allow-scripts allow-forms`, never `allow-same-origin`) with a restrictive CSP. Never
  execute generated code in the main app or in the server process.
- Server-only secrets never use the `VITE_` prefix and never reach the client bundle or the export.

## Definition of done
A module is frontend-complete when its pages exist, navigation works, interactive elements work, it
follows the premium dark design, it is responsive, demo interactions work where integrations are
unavailable, real functionality is clearly distinguished from previews, and its source is included in
the downloadable ZIP.

## Commands
```bash
source ~/.nvm/nvm.sh   # Node via nvm
npm install
npm run dev            # http://localhost:5173 (local /api/* via Vite middleware)
npm run lint           # oxlint
npm run typecheck      # tsc over src/studio
npm test               # vitest
npm run build
```
