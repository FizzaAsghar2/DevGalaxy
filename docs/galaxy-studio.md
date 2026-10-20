# Galaxy Studio

Galaxy Studio is DevGalaxy's website design workspace. It turns a description into a structured website
plan, offers design variations, generates real React + TypeScript + Tailwind source code, previews it live
in a sandbox, and lets you refine it by chatting, with design controls, or by editing files directly.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page with features, examples and the three-step workflow |
| `/studio/new` | Describe → Review plan → Choose design |
| `/studio/:id` | Editor: files/pages/assets/history, live preview or code, AI chat and design controls |
| `/studio/:id/preview` | Full-screen preview of a saved project |
| `/studio/examples/:slug` | Public example preview (generated offline, not saved) |
| `/projects` | Projects dashboard: search, filter, sort, favourites, rename, duplicate, delete, ZIP |
| `/settings?tab=ai` | AI provider status, spending limits and recent Studio AI requests |

The architecture galaxy remains at `/galaxy/demo`, `/create` and `/galaxies` ("Architecture" in the menu).

## Workflow

1. **Describe.** A prompt is enough. Name, category, framework (React + Vite or Next.js), styling, colours,
   fonts, design references and reference images are optional. Vague prompts get up to two optional
   clarifying questions.
2. **Review plan.** The `SiteSpec` (`src/studio/core/spec.js`) lists purpose, audience, pages, sections,
   navigation, palette, typography, layout, responsive behaviour, interactions, animation, accessibility,
   assets, framework and dependencies. Everything is editable before code is generated.
3. **Choose design.** Three directions — Minimal & elegant, Modern SaaS, Bold & creative — change palette,
   typography, density, radius, navigation, card style, hero layout and motion. Preview any of them live,
   remix, or combine colours, typography and layout from different variations.
4. **Edit.** Chat requests, design controls and file edits each create a new immutable version.

## AI vs Offline (Demo)

`GET /api/studio-ai` reports whether a provider is configured. With `AI_PROVIDER` + `AI_API_KEY` set,
planning, variations and edits are done by the model on the server; responses are normalised
(`normaliseSpec`) and generated files validated (`validateFiles`) before use.

Without a key the UI shows **Offline (Demo)**: `planOffline` builds the plan from the prompt, and
`applyOfflineEdit` handles common requests (theme/colour/background, dark/light, fonts, sticky navbar,
animation speed, card size, spacing, radius, "more premium", hero copy, adding/removing sections and
pages). Anything it does not understand is reported as unsupported — nothing is faked.

## Preview and security

- Generated files are path-checked (no traversal, absolute paths, `.env`, `.git`, `node_modules`,
  unsupported types), size-limited and scanned for credentials (`src/studio/core/paths.js`).
- `POST /api/studio-build` compiles from memory with esbuild and Tailwind. Only `react`, `react-dom`,
  `lucide-react` and `framer-motion` can be imported; packages are pre-resolved, never installed per build.
  Generated code is never executed in the server process.
- The result runs in an iframe with `sandbox="allow-scripts allow-forms"` (no `allow-same-origin`) and a CSP
  with `connect-src 'none'`, `frame-src 'none'` and `form-action 'none'`. Compile and runtime errors are
  shown with file and line.
- Provider keys stay on the server and never use the `VITE_` prefix.

## Storage and versions

Projects live in the browser's IndexedDB (`src/studio/storage.js`), scoped to the signed-in user (or a
guest scope). They are not synced to a server — the UI says "Saved in this browser". Each version keeps
its spec, the full file snapshot, custom file edits, a summary, its source (AI, offline, manual, restore)
and build status. Undo/redo move through history; **Restore** copies an old version to the top, so newer
versions are never lost. Versions can be compared (line diff), duplicated into a new project or downloaded.

## Assets

Reference images and uploads (PNG, JPG, WebP, GIF, SVG up to 2 MB; SVGs with scripts are rejected) are
stored with the project under `src/assets/uploads/` and included in the ZIP. Generated artwork is local
SVG, so exports never depend on preview URLs.

## Export

**Download ZIP** builds a standalone project in the browser (`src/studio/core/zip.js`). Paths and secrets
are re-validated; skipped files are listed. Unzip, `npm install`, `npm run dev`.

## Personal cost control

Studio AI calls respect `AI_MAX_REQUEST_USD`, `AI_DAILY_BUDGET_USD` and `AI_MONTHLY_BUDGET_USD`. Usage is
recorded in Supabase when configured, otherwise in a local server ledger (`.devgalaxy/`, git-ignored and
excluded from source export). There is no billing.

## Limitations

- Click-to-select visual editing inside the preview is not implemented; use design controls, chat or Code view.
- Storage is browser-local; clearing site data deletes projects.
- The preview supports the allow-listed packages only.
