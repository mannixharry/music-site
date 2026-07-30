// Adds a song, and optionally its audio, without a browser.
//
//   node scripts/add-song.mjs --title "Song name"                       → local
//   node scripts/add-song.mjs --title "Song name" audio.mp3 --remote    → the real one
//
// This exists because /admin is behind Cloudflare Access and needs a human with
// an inbox, which makes it useless to a script or an agent. Everything here
// goes at D1 and R2 directly with wrangler's own credentials, and reproduces
// what worker/db.js createSong and src/admin/useUpload.js do between them.
//
// It deliberately does NOT transcode. The browser path decodes with the Web
// Audio API, which does not exist in node, so anything that is not already
// streamable is refused as a web object rather than half-handled — upload those
// through /admin. It can still archive one as a master, which is never served
// and so has no format requirement at all. See --help for the flags.
//
// Like the admin, it keeps the original of everything: an audio file given here
// is uploaded to both buckets unless the song already has a master, so no song
// with audio ends up without one.
//
// One caveat with no workaround here: an admin write purges the cached
// /api/content, and this cannot, because that cache lives inside the Worker.
// The version is bumped, so the change is correct the moment the edge revalidates
// — about a minute — it is just not instant.

import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseBuffer } from 'music-metadata'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATABASE = 'artist-site'

// Mirrors src/admin/upload.js. Browsers lie about File.type for some formats and
// node does not guess at all, so in both places the extension decides.
const EXTENSION_TYPES = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  aiff: 'audio/aiff',
  aif: 'audio/aiff',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
}

// The formats that can be served as they are. Matches canUseDirectly() in
// src/admin/upload.js, minus its 12MB ceiling: that limit exists to decide
// whether re-encoding is worth it, and this script cannot re-encode anyway.
const STREAMABLE = new Set(['audio/mpeg', 'audio/mp4'])

const KINDS = new Set(['single', 'demo', 'other'])
const STATUSES = new Set(['released', 'coming-soon'])

// ---------------------------------------------------------------------------

function usage() {
  console.log(`
Usage: node scripts/add-song.mjs [audio-file] [options]

  --title <text>          Required for a new song.
  --id <slug>             Defaults to a slug of the title.
  --master <file>         Archive this as the master instead of the audio file.
                          Any format — it is never served. Use it alone to
                          attach a master to a song that already has audio.
  --kind <k>              single | demo | other      (default: single)
  --musical <slug>        Required when kind is demo.
  --description <text>
  --status <s>            released | coming-soon     (default: released)
  --link "Label|https://…"  Repeatable.
  --draft                 published = 0. Visible in /admin and nowhere else.
  --remote                Act on the REAL database and bucket. Off by default.
  --dry-run               Print the SQL and the R2 key, change nothing.

An existing --id keeps its row and replaces only what is given, so this doubles
as the way to attach audio to a song that already exists.
`)
}

// Nothing is defaulted here. An option left unset has to stay distinguishable
// from one set to its default value, or updating an existing song would quietly
// reset every field the caller did not mention — turning a demo into a single
// because --kind was not repeated.
function parseArgs(argv) {
  const options = { links: [] }
  const rest = []

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const value = () => {
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) throw new Error(`${arg} needs a value`)
      i += 1
      return next
    }

    if (arg === '--help' || arg === '-h') return { help: true }
    else if (arg === '--remote') options.remote = true
    else if (arg === '--draft') options.draft = true
    else if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--title') options.title = value()
    else if (arg === '--id') options.id = value()
    else if (arg === '--kind') options.kind = value()
    else if (arg === '--musical') options.musical = value()
    else if (arg === '--description') options.description = value()
    else if (arg === '--master') options.master = value()
    else if (arg === '--status') options.status = value()
    else if (arg === '--link') options.links.push(value())
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`)
    else rest.push(arg)
  }

  if (rest.length > 1) throw new Error('give at most one audio file')
  options.file = rest[0]
  return options
}

// Kept identical to slugify() in worker/validate.js: the id is the primary key,
// the playback slot key and part of the R2 path, so the two must not drift.
function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const quote = (value) =>
  value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`
const number = (value) => (value === null || value === undefined ? 'NULL' : String(value))

function wrangler(args, { capture = false } = {}) {
  return execFileSync('npx', ['wrangler', ...args], {
    cwd: root,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
  })
}

function query(sql, remote) {
  const out = wrangler(
    ['d1', 'execute', DATABASE, remote ? '--remote' : '--local', '--json', `--command=${sql}`],
    { capture: true },
  )
  // --json still prints wrangler's banner on some versions, so find the payload
  // rather than trusting the whole of stdout to be JSON.
  return JSON.parse(out.slice(out.indexOf('[')))[0].results
}

// ---------------------------------------------------------------------------

// `forWeb` is the only thing that limits the format. A master is archival — it
// is never served to anyone, so any of these formats is fine. A web object has
// to be something a browser can stream, and this script cannot convert.
async function describeAudio(file, { forWeb = true } = {}) {
  const extension = path.extname(file).slice(1).toLowerCase()
  const contentType = EXTENSION_TYPES[extension]
  if (!contentType) throw new Error(`unrecognised audio extension: .${extension}`)

  if (forWeb && !STREAMABLE.has(contentType)) {
    throw new Error(
      `${extension} has to be converted before it can be served, and this script cannot ` +
        `do that — decoding needs the Web Audio API, which node does not have.\n` +
        `Upload it through /admin instead, which decodes in the browser and encodes in a worker.\n` +
        `To keep it only as an archival master, pass it as --master ${file} instead.`,
    )
  }

  const bytes = await readFile(file)
  const { size } = await stat(file)

  // The player shows the length before it has fetched a byte, which is what
  // lets AudioPlayer stay preload="none". Getting it wrong is visible; getting
  // it absent costs the readout but not playback, so a failure here is not fatal.
  let duration = null
  try {
    const parsed = await parseBuffer(bytes, contentType, { duration: true })
    duration = parsed.format.duration ?? null
  } catch (error) {
    console.warn(`  ! could not read the duration (${error.message}); leaving it null`)
  }

  return { bytes, size, contentType, extension, duration }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) return usage()

  if (options.kind !== undefined && !KINDS.has(options.kind)) {
    throw new Error(`--kind must be one of ${[...KINDS].join(', ')}`)
  }
  if (options.status !== undefined && !STATUSES.has(options.status)) {
    throw new Error(`--status must be one of ${[...STATUSES].join(', ')}`)
  }

  const id = slugify(options.id ?? options.title ?? '')
  if (!id) throw new Error('need --title (or --id) to build a slug from')

  const remote = Boolean(options.remote)
  const existing = query(`SELECT * FROM songs WHERE id = ${quote(id)}`, remote)[0] ?? null
  if (!existing && !options.title) throw new Error(`"${id}" does not exist yet, so --title is required`)

  // What the row will actually hold: the flag if given, else what is already
  // there, else the default for a brand-new song. The consistency rules below
  // have to be checked against these rather than against the flags, or updating
  // a demo without repeating --musical would look like a violation.
  const kind = options.kind ?? existing?.kind ?? 'single'
  const status = options.status ?? existing?.status ?? 'released'
  const musical = options.musical ?? existing?.musical_slug ?? null

  // The schema's own CHECK does not cover this pairing, so it is enforced here.
  if (kind === 'demo' && !musical) throw new Error('--kind demo needs --musical <slug>')
  if (kind !== 'demo' && musical) {
    throw new Error(`"${id}" would be a ${kind} carrying musical_slug "${musical}"`)
  }

  console.log(`${existing ? 'Updating' : 'Creating'} "${id}" in the ${remote ? 'REMOTE' : 'local'} database`)

  // Audio first. A row pointing at an object that failed to upload is worse
  // than an upload with no row — the second is invisible, the first is broken.
  let audio = null
  // Keys are unique per upload rather than per song, so replacing a track never
  // serves the old bytes from a cache. That is what lets the media domain send
  // `immutable` with a year-long max-age.
  const keyFor = (prefix, described) =>
    `${prefix}/${id}/${createHash('sha256').update(described.bytes).digest('hex').slice(0, 8)}.${described.extension}`

  const put = (bucket, key, file, contentType) => {
    if (options.dryRun) return
    wrangler([
      'r2',
      'object',
      'put',
      `${bucket}/${key}`,
      `--file=${file}`,
      `--content-type=${contentType}`,
      remote ? '--remote' : '--local',
    ])
  }

  // The master goes first, and is recorded before the web object is even
  // uploaded. Everything Frank sends is kept untouched and private, whatever
  // format it arrives in, so the public copy can be replaced or re-encoded
  // later without that being a one-way door.
  let master = null
  const masterSource = options.master ?? options.file
  if (masterSource && !existing?.master_key) {
    const described = await describeAudio(masterSource, { forWeb: false })
    const key = keyFor('masters', described)
    console.log(`  master: ${(described.size / 1048576).toFixed(1)}MB ${described.contentType} → ${key}`)
    put('frank-kirwan-masters', key, masterSource, described.contentType)
    master = { key, size: described.size, mime: described.contentType, duration: described.duration }
  } else if (masterSource) {
    console.log(`  master: keeping the existing one (${existing.master_key})`)
  }

  if (options.file) {
    const described = await describeAudio(options.file)
    const key = keyFor('web', described)

    console.log(
      `  audio: ${(described.size / 1048576).toFixed(1)}MB ${described.contentType}` +
        `${described.duration ? `, ${described.duration.toFixed(1)}s` : ''} → ${key}`,
    )

    put('frank-kirwan-media', key, options.file, described.contentType)
    audio = { key, size: described.size, duration: described.duration }
  }

  // Sparse ordering, ten clear of the last, matching createSong in worker/db.js
  // so there is room to move something between two rows without renumbering.
  const sortOrder =
    existing?.sort_order ?? ((query('SELECT MAX(sort_order) AS max FROM songs', remote)[0]?.max ?? 0) + 10)

  const now = new Date().toISOString()
  const links = options.links.map((entry) => {
    const [label, href] = entry.split('|')
    if (!label || !href) throw new Error(`--link wants "Label|https://…", got "${entry}"`)
    return { label: label.trim(), href: href.trim() }
  })

  // Same shape as bumpVersion() in worker/db.js. Opaque, not a hash of the
  // content: the client only asks whether it differs from its baked-in snapshot.
  const version = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`

  const columns = {
    id: quote(id),
    title: quote(options.title ?? existing?.title),
    description: quote(options.description ?? existing?.description ?? ''),
    kind: quote(kind),
    musical_slug: quote(musical),
    status: quote(status),
    web_key: quote(audio?.key ?? existing?.web_key ?? null),
    web_bytes: number(audio?.size ?? existing?.web_bytes ?? null),
    master_key: quote(master?.key ?? existing?.master_key ?? null),
    master_bytes: number(master?.size ?? existing?.master_bytes ?? null),
    master_mime: quote(master?.mime ?? existing?.master_mime ?? null),
    duration_s: number(audio?.duration ?? existing?.duration_s ?? master?.duration ?? null),
    // Carried through untouched. This script cannot set cover art — resizing it
    // needs a canvas, so /admin does that — but the statement below is an
    // INSERT OR REPLACE, which rebuilds the whole row: any column missing from
    // this list would be silently reset to NULL. Updating a song from here must
    // not cost it its artwork.
    cover_key: quote(existing?.cover_key ?? null),
    cover_bytes: number(existing?.cover_bytes ?? null),
    cover_master_key: quote(existing?.cover_master_key ?? null),
    cover_master_bytes: number(existing?.cover_master_bytes ?? null),
    cover_master_mime: quote(existing?.cover_master_mime ?? null),
    // Previews are the one place where carrying the old value through would be
    // wrong. This script cannot cut one — that needs the Web Audio API, same as
    // transcoding does — so any audio it uploads is the whole song, and the row
    // has to stop saying otherwise or the site keeps the "Preview" label on a
    // complete recording. With no new audio they carry through untouched, like
    // the cover columns above.
    is_snippet: options.file ? '0' : String(existing?.is_snippet ?? 0),
    show_snippet_tag: String(existing?.show_snippet_tag ?? 0),
    snippet_start_s: number(options.file ? null : (existing?.snippet_start_s ?? null)),
    snippet_end_s: number(options.file ? null : (existing?.snippet_end_s ?? null)),
    links_json: quote(JSON.stringify(links.length ? links : JSON.parse(existing?.links_json ?? '[]'))),
    sort_order: number(sortOrder),
    published: options.draft ? '0' : String(existing?.published ?? 1),
    created_at: quote(existing?.created_at ?? now),
    updated_at: quote(now),
  }

  const sql = [
    `INSERT OR REPLACE INTO songs (${Object.keys(columns).join(', ')})`,
    `VALUES (${Object.values(columns).join(', ')});`,
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ${quote(version)});`,
  ].join('\n')

  if (options.dryRun) {
    console.log(`\n--- dry run, nothing written ---\n${sql}`)
    return
  }

  const file = path.join(mkdtempSync(path.join(tmpdir(), 'add-song-')), 'add.sql')
  writeFileSync(file, `${sql}\n`)
  wrangler(['d1', 'execute', DATABASE, remote ? '--remote' : '--local', `--file=${file}`, '--yes'])

  // The R2 put and the D1 write are two commands with no transaction across
  // them, and the interesting failure is the second one not landing after the
  // first did: the object exists, the row still points at wherever it pointed
  // before, and nothing about the output says so. That happened once, during
  // the public/audio migration, and was caught by a separate pass afterwards
  // rather than by the script. So it reads the row back.
  const written = query(`SELECT web_key, master_key FROM songs WHERE id = ${quote(id)}`, remote)[0]
  if (!written) throw new Error(`wrote "${id}" but it is not in the database — nothing was saved`)
  for (const [what, uploaded, stored] of [
    ['web', audio?.key, written.web_key],
    ['master', master?.key, written.master_key],
  ]) {
    if (uploaded && stored !== uploaded) {
      throw new Error(
        `uploaded ${uploaded} but "${id}" still has ${what}_key = ${stored ?? 'NULL'} — ` +
          `the object is in R2, the row was not updated. Re-run to retry.`,
      )
    }
  }

  console.log(`\nDone — "${id}" is in, version ${version}.`)
  if (remote) {
    console.log('The edge cache holds /api/content for up to a minute; this cannot purge it.')
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`)
  process.exit(1)
})
