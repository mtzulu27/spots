# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Spots is

Spots is a visual-first city guide for Cali (18–35 audience) that helps people decide on a place or plan quickly. It deliberately avoids feeling like a generic directory or a Google Maps clone. There are no standalone product/brand docs in the repo; the closest thing to a design spec is `apps/mobile/components/DESIGN.md` (dense, approved specs for desktop Explore, discovery navbar motion, etc. — read it before touching those surfaces and follow its exact measurements/tokens).

## Monorepo layout

pnpm workspace (`pnpm@10.6.1`, `pnpm-workspace.yaml` → `apps/*`, `packages/*`):

- `apps/mobile` — the main product. iOS-first React Native + Expo (Expo 55, React 19.2, RN 0.83, expo-router). Also exported as a web PWA (with a dedicated desktop layout ≥1024px) and deployed to Hostinger via FTP. Nearly all feature work happens here.
- `apps/admin` — internal dashboard, React 19 + Vite. Manages catalog data against Supabase.
- `packages/shared` — reserved for shared types/contracts but currently **empty** (README + package.json only). Apps do not import from it.
- `supabase/` — SQL migrations and Deno Edge Functions.
- `scripts/` — many one-off Node (`.mjs`) data-ingestion/enrichment scripts (CSV import, geocoding, photo fixes, menu scraping, OCR, per-place `update-*.mjs`). `scripts/spots-research/` holds the newer research/intake pipeline (Google Places, Instagram profile/highlight parsing, Menupp, photo audits, catalog integration, plus some Python Codex workers), with `node:test` tests. These mutate the Supabase catalog or `apps/mobile/public` directly; they are operational tooling, not app code.
- `skills/spots-user-testing/` — an agent skill for synthetic-persona usability studies of Spots (`SKILL.md`, protocol, personas, `scripts/lab.mjs`).
- `docs/` — the catalog pipeline's working files: place-suggestion batches, CSV exports/templates, Supabase schema SQL, and dated handoff/review notes.
- Loose design assets (`spots-*.png`/`.svg`) and `_tmp_*` dirs sit at the repo root; they are not referenced by the apps.

## Commands

Run from repo root unless noted. Root scripts fan out with `pnpm -r`.

```bash
pnpm dev                  # run all apps in parallel
pnpm dev:mobile           # Expo dev server (apps/mobile)
pnpm dev:admin            # Vite dev server (apps/admin)
pnpm lint                 # lint every workspace
pnpm typecheck            # typecheck every workspace (tsc --noEmit)
pnpm test:spots-research  # node --test scripts/spots-research/*.test.mjs
```

Mobile app (`apps/mobile`):

```bash
pnpm --dir apps/mobile ios | android | web   # platform-specific Expo start
pnpm --dir apps/mobile build:catalog          # regenerate public/spots-catalog.json from Supabase
pnpm --dir apps/mobile build:updates          # diff catalog vs baseline → public/place-updates.json
pnpm --dir apps/mobile export:web             # build:updates + expo export (web) + patch output
pnpm --dir apps/mobile deploy:web             # export:web then FTP-deploy to Hostinger
pnpm --dir apps/mobile sync:catalog:local     # copy catalog + media into an existing dist/
pnpm --dir apps/mobile test:menu-catalog      # node --test ../../scripts/test-menu-catalog.mjs
```

`.claude/launch.json` defines a `mobile-dist` config that serves `apps/mobile/dist` on port 3333.

Admin: `pnpm --dir apps/admin build` (`tsc -b && vite build`). The admin UI is essentially one large file — `apps/admin/src/App.tsx` (~4.4k lines) — with seed data in `seed-spots.ts` and a small UI kit in `overtone-kit.tsx`; expect to navigate within `App.tsx` rather than a component tree.

### Tests

There is no Jest/Vitest; tests use Node's built-in `node:test` and are run file-by-file:

- `apps/mobile/scripts/test-*.cjs|.mjs` — unit tests for `apps/mobile/lib/*` logic (search, filters, schedule status, map markers, menu pricing, notifications, place updates…). The `.cjs` ones transpile the `.ts` lib file on the fly with `typescript`. Run one with `node --test apps/mobile/scripts/test-spot-search.cjs`.
- `scripts/spots-research/*.test.mjs`, `scripts/*.test.mjs`, `skills/spots-user-testing/scripts/lab.test.mjs`.

When adding pure logic under `apps/mobile/lib`, add a matching `scripts/test-<name>` file. For UI changes, verify by running the dev server or a web export. Root `playwright`/`tesseract.js` devDeps are for ingestion scripts (scraping/OCR), not a test suite.

## Data architecture (the key thing to understand)

The mobile app reads catalog data from **one of two sources**, chosen in `apps/mobile/lib/supabase.ts`:

- **Supabase backend** when `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set (`backendEnabled`).
- **Static catalog JSON** (`public/spots-catalog.json`, fetched at `/spots-catalog.json`) otherwise. This is the deployed-web path: `build:catalog` snapshots Supabase into that file, and `deploy:web` ships it. `apps/mobile/lib/spots-store.tsx` handles both and caches to AsyncStorage (`public-json-cache.ts` helps with the static JSON fetches).

The data model is **Spot → Branches → Branch hours** (see the `SpotRow` / `BranchRow` / `BranchHourRow` types in `spots-store.tsx`, mirrored in `docs/supabase-spots-v2-schema.sql`). A spot has a category/moods/tags; branches carry per-location neighborhood, budget (incl. verified-budget context), address, hours, menu items, and geo. Both the app and `scripts/build-static-catalog.mjs` select an explicit column list (`spotSelectColumns` / `branchSelectColumns` / `branchHourSelectColumns`) — when adding a column, update the SQL migration, those select lists, and the row types together.

Search/discovery logic lives in pure modules under `apps/mobile/lib` (`spot-search.ts`, `explore-filters.ts`, `discovery-ranking.ts`, `menu-search-index.ts`, `schedule-status.ts`, `map-*.ts`). Mobile and desktop Explore share these — never fork the search engine per surface.

### Place updates / notifications

Catalog change notifications come from a **published feed**, not Realtime: `build:updates` (`scripts/build-place-updates.mjs`, engine in `lib/catalog-updates/engine.mjs`) diffs `public/spots-catalog.json` against `public/place-updates-baseline.json` and appends events to `public/place-updates.json`. The baseline must already exist (it refuses to announce the whole catalog). `lib/place-updates-store.tsx` reads both JSON files on the client. `EXPO_PUBLIC_LIVE_CATALOG_BANNERS` (default `false`) toggles live banners. Web push is in `lib/web-push.ts` plus the Edge Functions below.

## Mobile app conventions

- **Routing**: expo-router file-based routes in `apps/mobile/app`. Route groups: `(auth)`, `(onboarding)`, `(setup)`, `(tabs)` (`today`, `explore`, `account`); top-level screens include `spot/[id].tsx` (place detail), `filters`, `notifications`, `settings`, `edit-profile`, `contribute`, `discover`, `place-map`, `today-results`, `debug`, `style-preview`.
- **Path alias**: `@/*` maps to the mobile app root (`apps/mobile/tsconfig.json`), e.g. `@/lib/spots-store`.
- **State**: React Context stores in `apps/mobile/lib/*-store.tsx`, composed in `app/_layout.tsx` in this order — `SafeAreaProvider → AuthStore → SpotsStore → PlaceUpdates → LocationStore → LikesStore → BookmarksStore → VisitedStore`. New global state follows this provider pattern. Some stores (e.g. visited) are AsyncStorage-only; `local-guest.ts` supports using the app without an account.
- **Web-specific variants**: files like `explore-map.web.tsx`, `desktop-explore.web.tsx`, `desktop-login.web.tsx`, `avatar-upload.web.ts` provide the web implementation alongside the native file (often a stub on native). Keep both when touching cross-platform components; the app runs meaningfully on web, including a separate desktop shell gated by `lib/desktop-*-policy.ts`.
- **Maps**: Mapbox on web (`EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`).
- **Icons**: custom icon set in `lib/spots-icon-paths.ts` / `spots-icon-map.ts`, rendered by `components/spots-icon.tsx` and `category-icon.tsx`.

## Supabase / backend

- Migrations in `supabase/migrations/*.sql`; broader schema/seed SQL and admin UX notes live under `docs/`.
- Edge Functions (Deno, `npm:` imports) in `supabase/functions/`: `send-web-push` (sends web-push notifications) and `dispatch-place-updates` (scheduler-only, auth'd by `CATALOG_PUSH_DISPATCH_SECRET`, sends place-update pushes). Web-push setup is documented in `docs/web-push-setup.md`.

## Environment

Env is git-ignored; copy the examples. Mobile (`apps/mobile/.env.example`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_AUTH_REDIRECT_URL`, `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`, `EXPO_PUBLIC_LIVE_CATALOG_BANNERS`; plus `HOSTINGER_FTP_*` for deploy (`.env.deploy.example`). Admin: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. The `EXPO_PUBLIC_`/`VITE_` prefixes are required for the respective bundlers to expose vars to the client.

## Note on language

Product docs, commit messages, and script console output are largely in Spanish; code identifiers and comments are mixed English/Spanish. Match the surrounding file.
