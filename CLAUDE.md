# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A portfolio/website for artist Frank Kirwan (see `<title>` in `index.html`). Built on Vite's `react` template. Five routes, a custom audio player, and no tests or component library.

The site is still staged: `index.html` carries a `noindex, nofollow` meta tag. The About page, the home-page bio, and all three musicals' teasers and synopses are Frank's real words. Still outstanding: the song descriptions (all empty), `contact.email` (`frank@example.com`), the hero images, and cover art for the singles. No song carries streaming links — the placeholder `#` Spotify ones were removed rather than left dead, and Frank adds the real URLs from `/admin` himself.

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
- `node scripts/add-song.mjs --help` — add a song, and optionally its audio, without a browser. Local unless given `--remote`. Use this rather than hand-writing SQL: it reproduces what `createSong` does, including the `meta.version` bump that the client needs in order to notice the change at all
- `node scripts/pull-snapshot.mjs` — refresh `src/content/snapshot.json` from the live `/api/content`. Run it after any catalogue change, and before a deploy that should ship one

There is no test runner configured in this repo.

Working on the admin page locally needs `cp .dev.vars.example .dev.vars` — see that file for why.

Miniflare persists its emulated cache to `.wrangler/state/v3/cache`, and `/api/content` is cached with `stale-while-revalidate=86400`. So a change made directly in the local database can appear not to take: clear that directory, or go through an admin write, which purges the entry.

## Architecture

- **Build tool**: Vite (`vite.config.js`), using `@vitejs/plugin-react` (Oxc-based, not SWC).
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin — imported with a single `@import "tailwindcss";` in `src/index.css`. There is no `tailwind.config.js`; v4 is configured through CSS/Vite plugin, not a JS config file.
- **Entry point**: `src/main.jsx` mounts `<App />` into `#root` (defined in `index.html`) inside `React.StrictMode`, wrapped in `<ContentProvider>`.
- **Routing**: `react-router-dom` (v7). `App.jsx` defines `/`, `/songs`, `/musicals`, `/about`, `/contact`, all nested under a pathless `<Route element={<Layout />}>`. There is no `*` catch-all. The musicals are anchored sections on one page (`id={musical.slug}`), not per-musical routes.
- **Navigation**: `src/nav.js` is the single list of pages, read by both `Header` and `Footer`. The header is `sticky top-0 z-20`, and that is coupled to the `scroll-mt-20` on every in-page anchor target (`#top`, the musicals' sections, the `/songs` groups) — without it a hash jump lands with the heading underneath the header. Change the header's height and those have to follow. In-page links are `<Link to="#slug">`, not bare `<a href>`, so they go through `ScrollToTop`'s hash handling rather than around the router.
- **Deployment**: a Cloudflare Worker at `frankkirwan.com` (attached via the dashboard, not `wrangler.jsonc`), deployed manually with `npm run deploy`. There is no CI.
- **The Worker** (`worker/`, bundled by Wrangler, *not* by Vite — which is why it sits outside `src/`) answers `/api/*` and nothing else. Every page and asset is served by Cloudflare without invoking it, which is both free and uncounted against the request quota. `run_worker_first: ["/api/*"]` is what carves out the exception; without it the SPA fallback would answer `/api/content` with `index.html`.
- **Data**: D1 (binding `DB`) holds the catalogue; R2 holds audio — `MEDIA` public via `media.frankkirwan.com`, `MASTERS` private. Two buckets rather than prefixes, because an R2 custom domain exposes a whole bucket with no per-prefix access control.
- **Shared helpers**: `src/format.js` (`formatTime`, `formatBytes`) and `src/admin/keys.js` (`extensionOf` and the four R2 key builders). Both exist because the same few lines had been copied three and four times over and had started to disagree. Reach for these before writing another one.
- **Linting**: Oxlint with `react` and `oxc` plugins enabled; `react/rules-of-hooks` is an error, `react/only-export-components` is a warning. That last rule is why context objects and their providers are split across two files — see `src/context/*.js` vs `src/components/*Provider.jsx`. Follow that split when adding a context.

## Content

Songs are **data, not code**. The catalogue lives in `src/content/snapshot.json`, which is committed and bundled; `ContentProvider` renders it immediately and then revalidates against `/api/content`, keeping whichever is newer by `version`. That API is live and backed by D1, so the snapshot is now the offline fallback rather than the only source — and it goes stale, because nothing regenerates it on deploy yet. A song added through `/admin` or `scripts/add-song.mjs` exists in D1 and not in the committed snapshot until someone refreshes it.

- `src/content/normalise.js` — `toSong(row, mediaBase)` turns a stored row into what components render. Rows hold a storage **key** and a **bare** title; the URL and the `"<Musical> — <demo>"` display title are composed here. `song.title` is the composed one, `song.shortTitle` the bare one.
- A `webKey` starting with `/` is a file in `public/`; anything else is an R2 object key. That fork is what let the audio move to R2 without a flag day — a move now complete, so every song holds an R2 key and `public/audio/` no longer exists. The branch stays in `normalise.js` because it costs a line and is the escape hatch if a file ever needs serving from the repo again.
- `src/content/musicals.js` holds only the three musicals' editorial copy. Their demo tracks are songs like any other — `MusicalSection` pulls them via `demosFor(slug)`.
- Rows with `published: false` never reach a visitor.
- **Deleting is soft and now has a UI.** `deleteSong` sets `deleted_at` and clears `published`; the row keeps its title, links and object keys, which is what makes it recoverable and why a deleted song's files still count as referenced by the storage sweep. `DeletedSongs` in the admin surfaces that bin: `POST /api/admin/songs/:id/restore` brings a song back **as a draft** (never straight in front of visitors), and `DELETE /api/admin/songs/:id/purge` removes the row and every R2 object it named. Both are guarded on the row already being soft-deleted, so neither can be reached for a live song.
- **Ordering is one flat `sort_order`, but every view draws it in groups by `kind`** — the admin list, `/songs`, and the home page's singles. The kinds interleave freely in the flat order, so the admin's up/down arrows move a song past its neighbour *within its group*, not its flat neighbour. Doing it the obvious way is what made them look broken: a single with three demos between it and the next single took four presses to move once. `neighbourFor` in `SongList` decides both the move and whether the arrow is enabled, so those cannot disagree.
- **`ContentProvider` fetches once, on mount, from above the router.** That is right for a visitor and wrong for Frank, who edits the catalogue and then navigates to the site client-side — no new document, so no new fetch, so the site showed what it knew when `/admin` was opened. `RefreshOnNavigate` (in `Layout`) re-reads on every navigation *when the admin hint is set*, so a visitor still costs one request per session. `refresh` dedupes concurrent calls.

## Admin authentication

`/admin` is protected by **Cloudflare Access**, which authenticates at the edge before a request reaches the Worker. There is no password, no session, and no login code in this repo — an Access policy is an allow-list of email addresses, and Access mails a one-time PIN. Do not add homemade auth alongside it.

The admin lives at `/admin` (`src/pages/Admin.jsx` + `src/admin/`), lazily loaded and mounted outside `<Layout>`. The split is load-bearing: the admin pulls in an MP3 encoder, and the public bundle must not grow by 164 kB to carry it.

`src/adminHint.js` is the one thing on the public side that mentions the admin at all, and it is **not** auth. The admin page writes a sessionStorage flag once its API call has succeeded; the site header reads it and offers a "Back to admin" link, so previewing a change is a round trip rather than a one-way one. It carries no identity and grants nothing — Access still decides who may open `/admin`, and a visitor who sets the flag by hand gets a link to a login page. It exists in that shape because asking `/api/admin/session` instead would wake the Worker on every visitor's page load, which is exactly what the static-asset arrangement above is protecting.

**Uploads and transcoding.** Audio never passes through the Worker in production — the browser is handed a presigned URL and PUTs straight to R2, because the free plan gives 10 ms of CPU per request and caps bodies at 100 MB. Encoding therefore happens in the browser too, and it is split across two places for a reason worth remembering: **`decodeAudioData` runs on the main thread** (`src/admin/upload.js`) because the Web Audio API is not exposed to Web Workers at all, while the slow MP3 encode runs in `transcode.worker.js`. Decoding is native and quick; the encode is the long loop.

An upload records the **master first** and patches the song before doing anything else, so a failed decode or a closed tab leaves a recoverable song rather than a lost file.

**Every upload keeps the original**, whatever format it arrives in — `master_key` is never null for a song that has audio. Files already MP3/M4A and under 12 MB skip *encoding* (the common case, and the one that never downloads the encoder chunk), but they are still archived: the same bytes go to both buckets, private original and public copy. That looks wasteful and is deliberate. The public object can then be replaced, re-encoded or deleted without it being a one-way door, and serving an MP3 as-is avoids compressing already-compressed audio twice. The masters bucket has no custom domain and no `r2.dev` URL, so nothing in it is reachable from the web; `/api/content` exposes no `master*` field.

Locally there is no S3 endpoint to presign against, so `wrangler dev` uploads stream through `PUT /api/admin/blob` into the emulated bucket and are served back by `GET /api/media/*`. The client picks between the two on `capabilities.presign` from `/api/admin/session`, never by sniffing hostnames.

**Nothing is overwritten, so replacements have to be deleted on purpose.** Every upload writes a fresh key (`web/<song>/<uuid>.mp3`), which is what lets the media domain serve `immutable` for a year — and it means the object a patch stops pointing at is left with nothing naming it. `worker/objects.js` handles both halves: `deleteReplacedObjects` runs in `waitUntil` after every PATCH and removes exactly the displaced object, considering only key columns the patch actually mentioned; `readStorage` backs the whole bottom of the admin in one call — D1 size (off any statement's `meta.size_after`), song counts, per-prefix R2 totals, anything unreferenced, **and the bin**. One endpoint because all four move together: emptying the bin changes the usage figures, so fetching them apart left one showing a number the other had just made false. `Admin` owns that state and passes it down; `DeletedSongs` and `StoragePanel` are presentational. `POST /api/admin/storage` sweeps the unreferenced files only. Two rules in it are load-bearing: **soft-deleted songs still count as referencing their objects** (otherwise an undoable delete quietly stops being undoable), and a key matching no prefix rule is skipped rather than guessed at.

**Where an object goes is decided by its key, not by the request.** `PREFIX_RULES` in `worker/validate.js` maps each prefix to a bucket, an allowed content-type list and a size cap, and both upload routes read it. Four prefixes exist: `web/` and `covers/` in `MEDIA`, `masters/` and `cover-masters/` in `MASTERS`. A key that matches none of them is refused. This is why the client no longer sends a bucket at all — it could otherwise ask for a public signature and name a private object, or the reverse. An unrecognised prefix must stay an error rather than defaulting to a bucket.

**Cover art** is stored the same way audio is, and for the same reason: a public copy in `MEDIA` under `covers/` that the site serves off `media.frankkirwan.com`, and the untouched upload kept private in `MASTERS` under `cover-masters/`, so the public copy can be re-cropped or re-encoded later without going back to Frank for the file. `/api/content` exposes `coverKey` and nothing about `cover_master_*`.

Two things about it are deliberate:

- **Any song may carry art; only the singles show it.** `cover_key` is on `songs` with no reference to `kind`, and `ReleaseItem` is the only component that draws it. So changing a song's type to `single` starts showing art that was already uploaded rather than asking for the file again — which is the whole point of not keying this off `kind`.
- **Resizing happens in the browser, on the main thread, with no worker.** `src/admin/cover.js` centre-crops to a square and encodes WebP at up to 1000px via `createImageBitmap` and `canvas.toBlob` — both native and quick, unlike the MP3 encode, so there is no second worker and no growth in the admin chunk. It never upscales: a 1600×900 upload becomes 900×900. Images already JPEG/PNG/WebP, under 400 kB and no larger than 1000px are stored untouched, mirroring `canUseDirectly` for audio.

No SVG in `IMAGE_TYPES`, and it should stay out: `media.frankkirwan.com` fronts a whole public bucket, and an SVG is a script container.

**Previews.** Frank uploads a whole song and can publish only a cut of it. The cut is made in the browser before the upload (`src/admin/snippet.js`), and that is the feature rather than an implementation detail: the media domain fronts the entire public bucket, so a player told to stop at 1:15 would still be sitting on top of the complete recording. Cropping first means the full song only ever exists in `MASTERS`. Three things follow, and none of them are optional:

- **A preview can never take the direct upload path.** `canUseDirectly` means "serve these bytes untouched", which is the opposite of publishing twenty seconds of them — so `useUpload` forces the decode-and-encode path whenever a range is set, even for an MP3 that would otherwise sail through.
- **`is_snippet` describes what `web_key` already is.** Setting it on a full track mislabels the track; clearing it does not restore anything. So every path that publishes a whole track writes `isSnippet: false` explicitly rather than leaving the field alone — see `NOT_A_SNIPPET` in `useUpload.js`, and the same reasoning in `scripts/add-song.mjs`, which cannot crop and therefore always clears it when it uploads audio.
- **`snippet_start_s` / `snippet_end_s` are not public.** They are offsets into the master and sit with the `master_*` columns; `/api/content` exposes `isSnippet` alone, because the site needs it to draw the label. `duration_s` is the cut's own length, so the player needs no special case.

The range the form asks for is clamped to what the file turns out to contain, and what gets recorded is what was clamped to — asking for a minute from a 45-second recording is ordinary and should not fail. The cut is faded in and out (15 ms and 750 ms, the latter capped at a third of the preview) because a hard cut sounds like a file that failed to download.

**A preview is only ever cut from the audio already published for the song**, fetched back down from `/api/media/<key>` — same-origin in both environments, so no CORS rule has to exist for it, and it reads the same public bucket the site does. There is deliberately no second route: the order of operations is upload the song, then cut a preview out of what went up, and a dropzone in that mode would be a second path with different consequences for the master. A song that is already a preview says so and sends you back through an upload, because cutting a preview out of a preview loses a generation each pass with no way back.

That path passes `archiveMaster: false` to `start()`, and it must: the file is a copy of the published audio, so filing it as the master would replace the pointer to Frank's original with one to a second-generation copy of itself.

Cutting is a **two-step upload**: the fetched audio goes to `SnippetTrimmer` and nothing leaves the browser until the trimmer's own button. That pause is what makes auditioning the cut before publishing possible at all. An ordinary upload has nothing left to decide and still goes straight up. The range is an argument to `start(file, range)` rather than a `useUpload` option, so dragging a handle does not rebuild the upload callback sixty times a second.

The trimmer decodes the fetched audio to draw its waveform (`src/admin/waveform.js`), which the upload then decodes again on its way to the encoder. That is deliberate: threading one `AudioBuffer` out of here would save about a second and couple the trimmer to the pipeline's internals permanently. The buffer is dropped once the peaks are computed — five minutes of stereo is ~100MB of floats, and holding it for the length of an edit is the thing to avoid. Playback during editing is an `<audio>` element streaming the same file, not that buffer.

`worker/access.js` is the second lock, and three things in it must not be softened:

- The JWT **signature** is verified, and `aud` is checked against this application's AUD tag. Skipping the audience check accepts a valid token minted for any other app in the same Zero Trust organisation.
- It **fails closed**. With `ACCESS_TEAM`/`ACCESS_AUD` unset, every admin route refuses. Never rewrite this as "allow when unconfigured".
- The local bypass needs `DEV_BYPASS_AUTH=true` *and* a loopback hostname, both.

`workers_dev` and `preview_urls` are `false` in `wrangler.jsonc` for the same reason: Access is bound to `frankkirwan.com`, so a `workers.dev` URL would expose the admin API on a hostname nothing guards.

`AudioPlayer` is `preload="none"` and takes a `duration` prop from the data, so a page of songs costs **zero** audio requests until someone presses play. Do not revert this to `preload="metadata"`; at 150 songs it is one request per track on load. Because the length is known before the media is, the scrubber is gated on a separate `hasMetadata` state — seeking a track the browser has not loaded throws `InvalidStateError`.

## Notes

- No TypeScript — this is a plain JS/JSX React project (though `@types/react` and `@types/react-dom` are present for editor intellisense).
- No React Compiler — intentionally left off in this template for dev/build performance (see `README.md`).
