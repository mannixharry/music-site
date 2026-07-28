# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A portfolio/website for artist Frank Kirwan (see `<title>` in `index.html`). Built on Vite's `react` template. Five routes, a custom audio player, and no tests or component library.

The site is still staged: `index.html` carries a `noindex, nofollow` meta tag. The About page, the home-page bio and the Guyana Skies copy are Frank's real words; still placeholder are the song descriptions (all empty), the Spotify links (all `#`), the Pigs and Copperfield teasers and resumes (lorem ipsum), and `contact.email` (`frank@example.com`).

It is mid-migration to a self-hosted admin CMS — see "Content" below.

## Commands

- `npm run dev` — Vite dev server with HMR (proxies `/api` to port 8787)
- `npm run dev:worker` — the Worker, with local D1 and R2. Run alongside `npm run dev`
- `npm run build` — production build (output to `dist/`)
- `npm run preview` — serve the production build locally
- `npm run lint` — run Oxlint (config in `.oxlintrc.json`)
- `npm run deploy` — build, then `wrangler deploy`. Use this rather than calling either half alone
- `npm run db:migrate:local` / `db:migrate` — apply `migrations/` to the local or real database
- `npm run db:seed:local` / `db:seed` — load `snapshot.json` into it. Idempotent, so it doubles as a reset

There is no test runner configured in this repo.

Working on the admin page locally needs `cp .dev.vars.example .dev.vars` — see that file for why.

Miniflare persists its emulated cache to `.wrangler/state/v3/cache`, and `/api/content` is cached with `stale-while-revalidate=86400`. So a change made directly in the local database can appear not to take: clear that directory, or go through an admin write, which purges the entry.

## Architecture

- **Build tool**: Vite (`vite.config.js`), using `@vitejs/plugin-react` (Oxc-based, not SWC).
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin — imported with a single `@import "tailwindcss";` in `src/index.css`. There is no `tailwind.config.js`; v4 is configured through CSS/Vite plugin, not a JS config file.
- **Entry point**: `src/main.jsx` mounts `<App />` into `#root` (defined in `index.html`) inside `React.StrictMode`, wrapped in `<ContentProvider>`.
- **Routing**: `react-router-dom` (v7). `App.jsx` defines `/`, `/songs`, `/musicals`, `/about`, `/contact`, all nested under a pathless `<Route element={<Layout />}>`. There is no `*` catch-all. The musicals are anchored sections on one page (`id={musical.slug}`), not per-musical routes.
- **Deployment**: a Cloudflare Worker at `frankkirwan.com` (attached via the dashboard, not `wrangler.jsonc`), deployed manually with `npm run deploy`. There is no CI.
- **The Worker** (`worker/`, bundled by Wrangler, *not* by Vite — which is why it sits outside `src/`) answers `/api/*` and nothing else. Every page and asset is served by Cloudflare without invoking it, which is both free and uncounted against the request quota. `run_worker_first: ["/api/*"]` is what carves out the exception; without it the SPA fallback would answer `/api/content` with `index.html`.
- **Data**: D1 (binding `DB`) holds the catalogue; R2 holds audio — `MEDIA` public via `media.frankkirwan.com`, `MASTERS` private. Two buckets rather than prefixes, because an R2 custom domain exposes a whole bucket with no per-prefix access control.
- **Linting**: Oxlint with `react` and `oxc` plugins enabled; `react/rules-of-hooks` is an error, `react/only-export-components` is a warning. That last rule is why context objects and their providers are split across two files — see `src/context/*.js` vs `src/components/*Provider.jsx`. Follow that split when adding a context.

## Content

Songs are **data, not code**. The catalogue lives in `src/content/snapshot.json`, which is committed and bundled; `ContentProvider` renders it immediately and then revalidates against `/api/content`, keeping whichever is newer by `version`. The API does not exist yet (Phase 4), so the fetch currently always fails and is silently ignored — that is the designed fallback, not a bug.

- `src/content/normalise.js` — `toSong(row, mediaBase)` turns a stored row into what components render. Rows hold a storage **key** and a **bare** title; the URL and the `"<Musical> — <demo>"` display title are composed here. `song.title` is the composed one, `song.shortTitle` the bare one.
- A `webKey` starting with `/` is a file still in `public/`; anything else is an R2 object key. This is what lets the audio move to R2 without a flag day.
- `src/content/musicals.js` holds only the three musicals' editorial copy. Their demo tracks are songs like any other — `MusicalSection` pulls them via `demosFor(slug)`.
- Rows with `published: false` never reach a visitor.

## Admin authentication

`/admin` is protected by **Cloudflare Access**, which authenticates at the edge before a request reaches the Worker. There is no password, no session, and no login code in this repo — an Access policy is an allow-list of email addresses, and Access mails a one-time PIN. Do not add homemade auth alongside it.

`worker/access.js` is the second lock, and three things in it must not be softened:

- The JWT **signature** is verified, and `aud` is checked against this application's AUD tag. Skipping the audience check accepts a valid token minted for any other app in the same Zero Trust organisation.
- It **fails closed**. With `ACCESS_TEAM`/`ACCESS_AUD` unset, every admin route refuses. Never rewrite this as "allow when unconfigured".
- The local bypass needs `DEV_BYPASS_AUTH=true` *and* a loopback hostname, both.

`workers_dev` and `preview_urls` are `false` in `wrangler.jsonc` for the same reason: Access is bound to `frankkirwan.com`, so a `workers.dev` URL would expose the admin API on a hostname nothing guards.

`AudioPlayer` is `preload="none"` and takes a `duration` prop from the data, so a page of songs costs **zero** audio requests until someone presses play. Do not revert this to `preload="metadata"`; at 150 songs it is one request per track on load. Because the length is known before the media is, the scrubber is gated on a separate `hasMetadata` state — seeking a track the browser has not loaded throws `InvalidStateError`.

## Notes

- No TypeScript — this is a plain JS/JSX React project (though `@types/react` and `@types/react-dom` are present for editor intellisense).
- No React Compiler — intentionally left off in this template for dev/build performance (see `README.md`).
