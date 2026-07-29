// Refreshes src/content/snapshot.json from the live catalogue.
//
//   node scripts/pull-snapshot.mjs
//   node scripts/pull-snapshot.mjs --from http://localhost:8787
//
// The snapshot is committed and bundled, and ContentProvider renders it on the
// first paint before /api/content has answered. So it is not a backup — it is
// what visitors actually see for the first few hundred milliseconds of every
// visit, and the only thing they see if the API is unreachable. A stale one
// shows songs that have been renamed, and points the player at audio that has
// moved.
//
// It reads the deployed API rather than D1 directly, deliberately: /api/content
// already serialises rows into exactly this shape, and querying the database
// here would mean a second copy of that mapping to keep in step with
// worker/db.js. The endpoint is public, so this needs no credentials.
//
// Note that /api/content is cached at the edge for up to a minute, so a change
// made seconds ago may not be in the response yet.

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(root, 'src/content/snapshot.json')

const fromIndex = process.argv.indexOf('--from')
const origin = fromIndex === -1 ? 'https://frankkirwan.com' : process.argv[fromIndex + 1]
if (!origin) throw new Error('--from needs an origin')

const url = `${origin}/api/content`
console.log(`Pulling ${url}`)

const response = await fetch(url)
if (!response.ok) throw new Error(`${url} answered ${response.status}`)

const data = await response.json()

// Guard against writing something that would break the site more quietly than
// it fails here. An empty catalogue is the shape a half-configured Worker
// returns, and it would blank the site on first paint.
if (!Array.isArray(data.songs) || data.songs.length === 0) {
  throw new Error('refusing to write a snapshot with no songs')
}
if (!data.version) {
  throw new Error('refusing to write a snapshot with no version — the client compares on it')
}

const legacy = data.songs.filter((song) => song.webKey?.startsWith('/'))
if (legacy.length > 0) {
  console.warn(
    `  ! ${legacy.length} song(s) still point into public/: ${legacy.map((s) => s.id).join(', ')}`,
  )
}

await writeFile(target, `${JSON.stringify(data, null, 2)}\n`)
console.log(`Wrote ${data.songs.length} songs at version ${data.version} to src/content/snapshot.json`)
