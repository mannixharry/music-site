// Loads src/content/snapshot.json into D1. Idempotent — every row is an
// INSERT OR REPLACE, so re-running it resets the database to match the
// committed snapshot. That makes it both the initial migration and the way to
// get a local database back to a known state.
//
//   node scripts/seed-d1.mjs            → the local (Miniflare) database
//   node scripts/seed-d1.mjs --remote   → the real one, so mind which you pick
//
// It does not touch R2: the snapshot names object keys, and the objects
// themselves are already in the buckets or they are not.
//
// ALBUMS ARE SEEDED TOO, and were not for a while, which was worse than it
// sounds. Every statement here is INSERT OR REPLACE, which deletes the row and
// writes a new one — so a column this script does not name does not keep its
// old value, it goes back to its default. Songs were being written with the
// obsolete `musical_slug` and no `album_id` at all, so a seed silently emptied
// every album and turned the whole catalogue into singles. Anything added to
// either table has to be added here as well, or a reset quietly loses it.

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

const snapshot = JSON.parse(await readFile(path.join(root, 'src/content/snapshot.json'), 'utf8'))
const { version, songs } = snapshot
// Albums arrived after the first snapshots, so an older one has none. An empty
// list is the honest reading of that, and matches what pull-snapshot writes.
const albums = snapshot.albums ?? []
const now = new Date().toISOString()

// Albums first: a song names one, and seeding the songs into an empty albums
// table would leave every one of them filed under a show that is not there.
const statements = albums.map((album) => {
  const columns = [
    quote(album.id),
    quote(album.title),
    quote(album.kind),
    quote(album.subtitle ?? ''),
    quote(album.coverKey),
    number(album.coverBytes),
    number(album.sortOrder),
    album.published === false ? '0' : '1',
    quote(now),
    quote(now),
  ]

  // No cover_master_* here, for the reason the songs below have no master_*:
  // the snapshot comes from /api/content, which says nothing about the private
  // bucket, so seeding could only ever write NULL over them.
  // notice_* and downloads_json are absent because nothing reads them any more
  // — the editorial copy went back to src/content/musicals.js. The columns are
  // still there, and OR REPLACE resets them to their defaults, which is the
  // honest outcome for a column no code consults.
  return `INSERT OR REPLACE INTO albums (
  id, title, kind, subtitle, cover_key, cover_bytes,
  sort_order, published, created_at, updated_at
) VALUES (${columns.join(', ')});`
})

statements.push(...songs.map((song) => {
  const columns = [
    quote(song.id),
    quote(song.title),
    quote(song.description ?? ''),
    quote(song.kind),
    // The album, by the column that is actually read. `musical_slug` is the
    // one this used to write: it was superseded by 0005 and nothing has read
    // it since, so seeding it and not album_id wrote the catalogue's structure
    // into a column no longer connected to anything.
    quote(song.albumId),
    quote(song.status ?? 'released'),
    quote(song.webKey),
    number(song.webBytes),
    quote(song.masterKey),
    number(song.masterBytes),
    quote(song.masterMime),
    number(song.duration),
    quote(song.coverKey),
    number(song.coverBytes),
    song.isSnippet ? '1' : '0',
    song.showSnippetTag ? '1' : '0',
    quote(JSON.stringify(song.links ?? [])),
    number(song.sortOrder),
    song.published === false ? '0' : '1',
    quote(now),
    quote(now),
  ]

  // The cover_master_* columns are absent on purpose, as the master_* ones
  // effectively are: the snapshot comes from /api/content, which exposes nothing
  // about the private bucket, so seeding could only ever write NULL over them.
  // snippet_start_s and snippet_end_s are absent for that reason too — they are
  // offsets into the master. is_snippet is not: it describes the public object,
  // and losing it would have the site call a preview a whole song.
  return `INSERT OR REPLACE INTO songs (
  id, title, description, kind, album_id, status,
  web_key, web_bytes, master_key, master_bytes, master_mime, duration_s,
  cover_key, cover_bytes, is_snippet, show_snippet_tag,
  links_json, sort_order, published, created_at, updated_at
) VALUES (${columns.join(', ')});`
}))

statements.push(`INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ${quote(version)});`)

const file = path.join(mkdtempSync(path.join(tmpdir(), 'seed-d1-')), 'seed.sql')
writeFileSync(file, `${statements.join('\n\n')}\n`)

console.log(
  `Seeding ${remote ? 'REMOTE' : 'local'} "${DATABASE}" with ` +
    `${albums.length} albums and ${songs.length} songs (version ${version})`,
)

execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', DATABASE, remote ? '--remote' : '--local', `--file=${file}`, '--yes'],
  { stdio: 'inherit', cwd: root },
)
