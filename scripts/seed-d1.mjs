// Loads src/content/snapshot.json into D1. Idempotent — every row is an
// INSERT OR REPLACE, so re-running it resets the database to match the
// committed snapshot. That makes it both the initial migration and the way to
// get a local database back to a known state.
//
//   node scripts/seed-d1.mjs            → the local (Miniflare) database
//   node scripts/seed-d1.mjs --remote   → the real one, so mind which you pick
//
// It does not touch R2. While `webKey` still starts with "/" the audio is
// served from public/ as it is today; the move to R2 rewrites those keys.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const remote = process.argv.includes('--remote')
const DATABASE = 'artist-site'

const quote = (value) => (value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`)
const number = (value) => (value === null || value === undefined ? 'NULL' : String(value))

const { version, songs } = JSON.parse(await readFile(path.join(root, 'src/content/snapshot.json'), 'utf8'))
const now = new Date().toISOString()

const statements = songs.map((song) => {
  const columns = [
    quote(song.id),
    quote(song.title),
    quote(song.description ?? ''),
    quote(song.kind),
    quote(song.musicalSlug),
    quote(song.status ?? 'released'),
    quote(song.webKey),
    number(song.webBytes),
    quote(song.masterKey),
    number(song.masterBytes),
    quote(song.masterMime),
    number(song.duration),
    quote(JSON.stringify(song.links ?? [])),
    number(song.sortOrder),
    song.published === false ? '0' : '1',
    quote(now),
    quote(now),
  ]

  return `INSERT OR REPLACE INTO songs (
  id, title, description, kind, musical_slug, status,
  web_key, web_bytes, master_key, master_bytes, master_mime, duration_s,
  links_json, sort_order, published, created_at, updated_at
) VALUES (${columns.join(', ')});`
})

statements.push(`INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ${quote(version)});`)

const file = path.join(mkdtempSync(path.join(tmpdir(), 'seed-d1-')), 'seed.sql')
writeFileSync(file, `${statements.join('\n\n')}\n`)

console.log(`Seeding ${remote ? 'REMOTE' : 'local'} "${DATABASE}" with ${songs.length} songs (version ${version})`)

execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', DATABASE, remote ? '--remote' : '--local', `--file=${file}`, '--yes'],
  { stdio: 'inherit', cwd: root },
)
