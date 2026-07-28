# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A portfolio/website for artist Frank Kirwan (see `<title>` in `index.html`). Built on Vite's `react` template. Five routes, a custom audio player, and no tests or component library.

The site is still staged: `index.html` carries a `noindex, nofollow` meta tag. The About page, the home-page bio and the Guyana Skies copy are Frank's real words; still placeholder are the song descriptions (all empty), the Spotify links (all `#`), the Pigs and Copperfield teasers and resumes (lorem ipsum), and `contact.email` (`frank@example.com`).

It is mid-migration to a self-hosted admin CMS — see "Content" below.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — production build (output to `dist/`)
- `npm run preview` — serve the production build locally
- `npm run lint` — run Oxlint (config in `.oxlintrc.json`)

There is no test runner configured in this repo.

## Architecture

- **Build tool**: Vite (`vite.config.js`), using `@vitejs/plugin-react` (Oxc-based, not SWC).
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin — imported with a single `@import "tailwindcss";` in `src/index.css`. There is no `tailwind.config.js`; v4 is configured through CSS/Vite plugin, not a JS config file.
- **Entry point**: `src/main.jsx` mounts `<App />` into `#root` (defined in `index.html`) inside `React.StrictMode`, wrapped in `<ContentProvider>`.
- **Routing**: `react-router-dom` (v7). `App.jsx` defines `/`, `/songs`, `/musicals`, `/about`, `/contact`, all nested under a pathless `<Route element={<Layout />}>`. There is no `*` catch-all. The musicals are anchored sections on one page (`id={musical.slug}`), not per-musical routes.
- **Deployment**: a Cloudflare Worker serving static assets (`wrangler.jsonc`, `assets.directory: ./dist`, SPA `not_found_handling`), deployed manually with `npx wrangler deploy`. There is no CI.
- **Linting**: Oxlint with `react` and `oxc` plugins enabled; `react/rules-of-hooks` is an error, `react/only-export-components` is a warning. That last rule is why context objects and their providers are split across two files — see `src/context/*.js` vs `src/components/*Provider.jsx`. Follow that split when adding a context.

## Content

Songs are **data, not code**. The catalogue lives in `src/content/snapshot.json`, which is committed and bundled; `ContentProvider` renders it immediately and then revalidates against `/api/content`, keeping whichever is newer by `version`. The API does not exist yet (Phase 4), so the fetch currently always fails and is silently ignored — that is the designed fallback, not a bug.

- `src/content/normalise.js` — `toSong(row, mediaBase)` turns a stored row into what components render. Rows hold a storage **key** and a **bare** title; the URL and the `"<Musical> — <demo>"` display title are composed here. `song.title` is the composed one, `song.shortTitle` the bare one.
- A `webKey` starting with `/` is a file still in `public/`; anything else is an R2 object key. This is what lets the audio move to R2 without a flag day.
- `src/content/musicals.js` holds only the three musicals' editorial copy. Their demo tracks are songs like any other — `MusicalSection` pulls them via `demosFor(slug)`.
- Rows with `published: false` never reach a visitor.

`AudioPlayer` is `preload="none"` and takes a `duration` prop from the data, so a page of songs costs **zero** audio requests until someone presses play. Do not revert this to `preload="metadata"`; at 150 songs it is one request per track on load. Because the length is known before the media is, the scrubber is gated on a separate `hasMetadata` state — seeking a track the browser has not loaded throws `InvalidStateError`.

## Notes

- No TypeScript — this is a plain JS/JSX React project (though `@types/react` and `@types/react-dom` are present for editor intellisense).
- No React Compiler — intentionally left off in this template for dev/build performance (see `README.md`).
