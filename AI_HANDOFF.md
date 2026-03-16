# AI Handoff - API NFSe Project

## Project Overview
A SaaS platform for NFSe (Nota Fiscal de Serviço eletrônica) management, consisting of a Node.js/Express backend, a React/Vite frontend, and an Electron desktop wrapper. It uses Supabase for database and authentication.

## Current State (v0.4.1)
- **Logo**: Solid navy blue square logo with white invoice icon.
- **UI Styling**: Removed circular masking. Logos are displayed as squares with slight rounding (`rounded-xl` in Login, `rounded-md` in Sidebar).
- **Latest Release**: v0.4.1 (Executable: `API NFSe Setup 0.4.1.exe`).

## Technical Architecture
- **Frontend**: React + Vite + Tailwind CSS.
- **Desktop**: Electron (using `dist` from Vite build).
- **Backend (Server)**: Express.js, handling scrapers and business logic.
- **Scraper**: Puppeteer-based scraper for NFSe portal interactions.
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

## Recent Changes (History)
- Fixed logo transparency issues by moving to a solid navy design.
- Resolved broken production image paths by switching to local imports.
- Reverted circular masking to fulfill user preference for a square logo.
