# AI Handoff - API NFSe Project

## Project Overview
A SaaS platform for NFSe (Nota Fiscal de Serviço eletrônica) management, consisting of a Node.js/Express backend, a React/Vite frontend, and an Electron desktop wrapper. It uses Supabase for database and authentication.

## Current State (v0.5.0)
- **Logo**: Solid navy blue square logo with white invoice icon.
- **UI Styling**: Removed circular masking. Logos are displayed as squares with slight rounding (`rounded-xl` in Login, `rounded-md` in Sidebar).
- **Latest Release**: v0.5.0

## Technical Architecture
- **Frontend**: React 19 + Vite 7 + Tailwind CSS 4.
- **Desktop**: Electron 28 (using `dist` from Vite build).
- **Backend (Server)**: Express.js, handling scrapers and business logic.
- **Scraper**: Cheerio-based parser for NFSe portal interactions (mTLS + password auth).
- **Database**: Supabase (PostgreSQL).

## File Structure
- `/web`: React application and Electron configuration.
- `/server`: Node.js backend server.
- `/Docs`: Comprehensive project documentation.
- `web/src/assets/logo.png`: Main logo asset.
- `web/public/logo.png`: Public logo and favicon.

## Key Instructions for Successors
- **Logo Integration**: Always use ES imports (`import logo from ...`) for logos in React to ensure Vite processes paths correctly for the `file://` protocol in Electron.
- **Build Process**: Run `npm run electron:build` in the `/web` directory. It builds the Vite app first, then packages with `electron-builder`.
- **Windows Icons**: `electron-builder` is configured to generate the Windows `.ico` automatically from `web/public/logo.png`.
- **Transparency**: When generating new logo versions, avoid patterns (checkerboards). Use solid backgrounds or true alpha transparency.
- **Electron Entry**: `web/electron/main.cjs` is the entry point. Uses CommonJS (`require`). The `"type": "module"` was removed from `web/package.json` to avoid conflicts.
- **ELECTRON_RUN_AS_NODE**: The dev script uses `env -u ELECTRON_RUN_AS_NODE` to unset this env var which breaks `require('electron')`.
- **Config Files**: `postcss.config.js` and `tailwind.config.js` use `module.exports` (CJS). `vite.config.mjs` and `eslint.config.mjs` are ESM.

## Folder Structure for XMLs
Notes are saved following the structure: `[BaseOutputDir]/[CompanyName]/[type]/[CompetenceMonth]/[AccessKey].xml`
- `BaseOutputDir`: Company's `custom_output_path` or global `output_path` from settings, default `~/Documents/XML's`
- `type`: `recebidas` or `emitidas`
- `CompetenceMonth`: Numeric month from competence date (1-12)

## Key Features (v0.5.0)
- **Companies Management**: Full CRUD with certificate + password auth support
- **Individual Extraction**: Per-company NFSe extraction with certificate or password auth
- **Bulk Monthly Sync**: `POST /scraper/bulk-sync` processes all companies for a given month
- **NSU Deduplication**: Pre-fetches existing access_keys into a Set for O(1) duplicate check
- **Competence Tracking**: Detects retroactive notes (emitted current month, competence previous month)
- **NfseList Filters**: Filter by company, competence mismatch, retroactive, out of period, retained
- **Open in Explorer**: "Ver XML" resolves absolute path via `base_output_path` per company
- **Open Company Folder**: Opens the company's output folder directly in Windows Explorer
- **Credential Validation**: Bulk sync skips companies without valid credentials
- **Per-Company Results**: Bulk sync shows detailed results table per company

## API Routes
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/companies` | List all companies |
| POST | `/companies/quick` | Quick register from cert data |
| POST | `/companies` | Create with cert upload |
| PUT | `/companies/:id` | Update company |
| DELETE | `/companies/:id` | Delete company |
| POST | `/companies/:id/credentials` | Save login credentials |
| GET | `/companies/grouped-nfs` | Get notes grouped by company + competence (includes base_output_path) |
| GET | `/companies/:id/download-zip` | Download company notes as ZIP |
| DELETE | `/companies/:id/nfs` | Reset company notes |
| POST | `/scraper/validate-cert` | Validate certificate or credentials |
| POST | `/scraper/fetch-gov` | Run extraction for one company |
| POST | `/scraper/bulk-sync` | Bulk sync all companies for a month |
| GET | `/api/settings` | Get global settings (with defaults) |
| POST | `/api/settings` | Update settings |
| DELETE | `/api/settings/clear-nfs` | Delete all notes from DB |
| GET | `/api/logs` | SSE stream for real-time logs |

## Recent Changes (History)
- **v0.5.0**: Fix "Ver XML" path resolution, default output path, bulk sync with credential validation and per-company results table, NfseList filters (company, status flags), open company folder button.
- **v0.4.6**: High-contrast UI, company edit feature, fix competence divergence logic (timezone + retroactive-only detection), NSU deduplication optimization, bulk sync endpoint.
- **v0.4.5**: Fix Building2 ReferenceError in Layout.jsx.
- **v0.4.4**: Companies management page, auto-auth selection, bulk monthly sync.
- Fixed logo transparency issues by moving to a solid navy design.
- Resolved broken production image paths by switching to local imports.
- Reverted circular masking to fulfill user preference for a square logo.
