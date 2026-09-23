# Text to Speech

A lightweight browser text-to-speech tool that lets users write or paste text, choose an available voice, and control playback without an account or paid API.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/text-to-speech run dev` — run the web app through the managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/text-to-speech/src/App.tsx` — Web Speech API state, voice discovery, playback controls, theme toggle, and page composition
- `artifacts/text-to-speech/src/index.css` — responsive visual system, light/dark theme tokens, and component styling
- `artifacts/text-to-speech/vite.config.ts` — Vite entry and artifact routing configuration

## Architecture decisions

- Speech is entirely client-side through `window.speechSynthesis`; there is no backend, database, login, or paid API dependency.
- Available voices are loaded from the browser and refreshed through the `voiceschanged` event so browser-specific voice catalogs are supported.
- The app stays on a single route and persists only the light/dark preference in local storage.

## Product

- Write or paste up to 5,000 characters and see a live character count.
- Choose a browser-provided language/voice, adjust speed, pitch, and volume, and use Play, Pause, Resume, and Stop.
- Clear text, copy text to the clipboard, load a sample passage, and switch between light and dark mode.
- Shows clear Ready, Speaking, Paused, Stopped, and unsupported-browser states.

## User preferences

- Keep the app lightweight, responsive, and free of external speech APIs.

## Gotchas

- Voice availability is browser- and device-dependent; the UI includes a loading fallback while the browser exposes its voices.
- Vite builds require the managed artifact workflow to provide `PORT` and `BASE_PATH`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
