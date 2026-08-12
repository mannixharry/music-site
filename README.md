# frankkirwan.com

The website of songwriter Frank Kirwan: a catalogue of songs with a custom
audio player, three musicals, and a self-hosted admin for adding to it.

React and Vite on the front, a Cloudflare Worker with D1 and R2 behind. No
CI — deploys are manual, from a laptop, with `npm run deploy`.

The site is public and open to search engines. Some copy is still placeholder;
`docs/cloudflare-setup.md` tracks what is left in its "Afterwards" section.

## Getting started

```
npm install
cp .dev.vars.example .dev.vars     # only needed for /admin — see the file
npm run db:migrate:local
npm run db:seed:local

npm run dev                        # the site, on :5173
npm run dev:worker                 # the API, on :8787 — run both
```

`npm run dev` proxies `/api` to the Worker, so the two together behave like
production. Without the Worker the site still renders — it falls back to the
committed snapshot, which is the designed behaviour rather than a broken state.

## Commands

| | |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run dev:worker` | the Worker, with local D1 and R2 |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve that build locally |
| `npm run lint` | Oxlint |
| `npm run deploy` | build, then `wrangler deploy` |
| `npm run db:migrate` | apply `migrations/` (`:local` for the emulated one) |
| `npm run db:seed` | load `snapshot.json` into it (`:local` likewise) |
| `npm run db:dump` | point-in-time dump of the real database into `backup/` |
| `node scripts/add-song.mjs --help` | add a song, and its audio, without a browser |
| `node scripts/pull-snapshot.mjs` | refresh the snapshot from the live API |

There is no test runner in this repo.

## How the content works

Songs are data, not code. The catalogue lives in D1 and is served by
`/api/content`; `src/content/snapshot.json` is a committed copy of it that gets
bundled and rendered on the first paint, before the API has answered — and is
all a visitor sees if the API is unreachable.

That snapshot is refreshed automatically as a `prebuild` step, so a deploy
cannot ship a stale one. Set `SKIP_SNAPSHOT_PULL=1` to build without the
network; the committed snapshot is then used as-is.

Audio lives in R2 and is served from `media.frankkirwan.com`. Nothing is in
`public/` any more.

## Deploys and stale tabs

Every build is stamped with an id, in the bundle (`virtual:build-id`) and in
`/build.json` beside it. `/build.json` is served `no-store`, so it is the one
thing a browser cannot answer from its own cache; `src/components/FreshBuild.jsx`
compares the two and reloads the page if they differ.

That exists because caching headers being right is not sufficient. A browser
holding a copy of `index.html` it has stopped revalidating will keep serving a
complete, coherent, months-old site through reloads, and nothing inside that
page can tell — the old shell names the old hashed bundle, which is genuinely
still valid. The check has to come from outside it.

## The admin

`/admin` is behind Cloudflare Access — an allow-list of email addresses and a
one-time PIN. There is no password and no login code in this repo, and none
should be added. `worker/access.js` verifies the token a second time and fails
closed if it is not configured.

`docs/cloudflare-setup.md` is the runbook for all of it, including the traps
that cost time the first time round.

## Notes on the stack

- **No TypeScript.** Plain JS and JSX; `@types/react` is present only for
  editor intellisense.
- **No React Compiler.** Left off for dev and build performance — see
  [the installation docs](https://react.dev/learn/react-compiler/installation)
  to add it.
- **Tailwind v4** via `@tailwindcss/vite`, configured in CSS. There is no
  `tailwind.config.js` and there should not be.
