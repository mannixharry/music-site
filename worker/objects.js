// Keeping the buckets to what the catalogue actually points at.
//
// Every upload writes a new key — `web/<song>/<uuid>.mp3` and friends — rather
// than overwriting the old one, which is what lets the media domain serve
// `immutable` with a year-long max-age. The cost of that is the object it
// replaced: nothing referred to it any more, and until now nothing removed it
// either, so re-uploading a master a few times quietly left copies behind.
//
// Two halves. `deleteReplacedObjects` is the cheap one and runs on every write:
// it removes exactly the object a patch has just stopped pointing at.
// `readStorage` is the survey — what is stored, what is stored that nothing
// names, and what is in the bin — for anything that got away before this
// existed, or after a failure between an upload and the row meant to name it.

import { listDeletedSongs, listExpiredSongs, purgeSong } from './db'
import { ruleForKey, D1_LIMIT_BYTES, PREFIXES, R2_LIMIT_BYTES } from './validate'

// Deleting, in as few round trips as it takes. R2 takes a list, but each
// bucket needs its own call, and a key's prefix is what says which bucket it
// belongs to — so group first, then one call per bucket rather than one per
// object. A key matching no rule is skipped rather than guessed at.
async function deleteKeys(env, keys) {
  const byBucket = new Map()

  for (const key of keys) {
    if (!key) continue
    const rule = ruleForKey(key)
    if (!rule) continue

    const list = byBucket.get(rule.bucket) ?? []
    list.push(key)
    byBucket.set(rule.bucket, list)
  }

  for (const [bucket, list] of byBucket) await env[bucket].delete(list)
  return [...byBucket.values()].flat()
}

// The four columns that name an object. A key's prefix decides which bucket it
// lives in, so nothing here has to know — see PREFIX_RULES in validate.js.
const OBJECT_KEY_FIELDS = ['webKey', 'masterKey', 'coverKey', 'coverMasterKey']

const SELECT_KEYS = `SELECT web_key, master_key, cover_key, cover_master_key FROM songs`

export async function readObjectKeys(env, id) {
  const record = await env.DB.prepare(`${SELECT_KEYS} WHERE id = ?`).bind(id).first()
  if (!record) return null

  return {
    webKey: record.web_key,
    masterKey: record.master_key,
    coverKey: record.cover_key,
    coverMasterKey: record.cover_master_key,
  }
}

// Called after the row has been updated, with the keys it held beforehand.
// Only fields the patch actually mentioned are considered, so a patch that says
// nothing about cover art can never cost a song its cover.
//
// A key is deleted when the patch moved it somewhere else *or* cleared it: both
// leave the old object with nothing naming it. Which means clearing a cover now
// removes the file rather than leaving it retrievable — the trade this makes
// deliberately, because unreferenced objects accumulating was the actual
// complaint and "recoverable" was never surfaced anywhere a person could use it.
//
// Soft-deleted songs keep their keys, so deleting a song still touches nothing.
export async function deleteReplacedObjects(env, before, patch) {
  const displaced = []

  for (const field of OBJECT_KEY_FIELDS) {
    // Untouched by this patch, so not this patch's business.
    if (!(field in patch)) continue

    const old = before?.[field]
    // Nothing there before, or the patch is setting it to what it already was.
    if (!old || old === patch[field]) continue

    displaced.push(old)
  }

  // deleteKeys skips anything whose prefix names no bucket — a key from before
  // the move to R2 points at a file in public/, not an object.
  return deleteKeys(env, displaced)
}

// Everything a song ever put in either bucket, for when the song itself is
// going for good.
//
// Not just the four keys the row currently names. A song accumulates objects
// across its life — each upload writes a new key rather than overwriting, and a
// preview adds another — and while a write now deletes the object it displaces,
// that has not always been true and cannot cover an upload that reached R2 and
// then failed to record itself. All of them are filed under the song's own id,
// so listing by that finds the lot.
//
// THE TRAILING SLASH IS LOAD-BEARING. Without it `web/pigs` would also match
// `web/pigs-snapshot/…`, and this catalogue contains both that pair and
// `copperfield-and-co` / `copperfield-and-co-snapshot`. Deleting one show's
// demo would have taken another song's audio with it.
export async function deleteSongObjects(env, songId, namedKeys) {
  const targets = new Set()

  for (const prefix of PREFIXES) {
    const { bucket } = ruleForKey(prefix)
    for (const object of await listAll(env[bucket], `${prefix}${songId}/`)) {
      targets.add(object.key)
    }
  }

  // Plus whatever the row named, in case a key was ever filed off that shape.
  for (const key of Object.values(namedKeys ?? {})) {
    if (key) targets.add(key)
  }

  return deleteKeys(env, targets)
}

// Hoisted above its callers by declaration; used by both the sweep and the
// per-song delete.
async function listAll(bucket, prefix) {
  const keys = []
  let cursor

  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 })
    for (const object of page.objects) keys.push({ key: object.key, size: object.size })
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor)

  return keys
}

// Every key any row names, live or soft-deleted.
//
// Deleted songs count as referring to their objects, and must: a soft delete is
// meant to be undoable, and a sweep that took the audio with it would make that
// a lie. This is why the query has no WHERE clause.
async function referencedKeys(env) {
  const { results } = await env.DB.prepare(SELECT_KEYS).all()

  const referenced = new Set()
  for (const record of results) {
    for (const key of Object.values(record)) {
      if (key) referenced.add(key)
    }
  }

  return referenced
}

// How big the database is, and what is in it.
//
// `size_after` comes back on the meta of any statement — D1 reports the whole
// database's size with every query — so the count below pays for both answers.
async function readDatabaseUsage(env) {
  const { results, meta } = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS songs,
       SUM(CASE WHEN deleted_at IS NULL AND published = 1 THEN 1 ELSE 0 END) AS published,
       SUM(CASE WHEN deleted_at IS NULL AND is_snippet = 1 THEN 1 ELSE 0 END) AS previews,
       SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS deleted
     FROM songs`,
  ).all()

  return { ...results[0], bytes: meta?.size_after ?? null }
}

// Just the total, for the capacity check on the upload path. readStorage
// answers this too, but also walks the bin and works out orphans — this runs on
// every upload and should do no more than it has to.
export async function storedBytes(env) {
  let bytes = 0

  for (const prefix of PREFIXES) {
    const { bucket } = ruleForKey(prefix)
    for (const object of await listAll(env[bucket], prefix)) bytes += object.size
  }

  return bytes
}

// D1 reports the whole database's size on the meta of any statement, so the
// cheapest possible query answers this.
export async function databaseBytes(env) {
  const { meta } = await env.DB.prepare(`SELECT 1`).all()
  return meta?.size_after ?? 0
}

// How long a deleted song is kept before it goes for good. Long enough that
// noticing a mistake a month later is still recoverable, short enough that the
// bin cannot quietly become most of the storage allowance.
export const BIN_DAYS = 30

// The automatic half of the bin, run daily by the cron trigger in
// wrangler.jsonc. Does exactly what "delete for good" does, and by the same
// route — the row first, then everything the song ever put in either bucket —
// so there is one behaviour to reason about rather than two.
export async function expireDeletedSongs(env) {
  const cutoff = new Date(Date.now() - BIN_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const expired = await listExpiredSongs(env, cutoff)

  for (const id of expired) {
    // Read before the row goes, delete after: the same order as the manual
    // purge, and for the same reason.
    const keys = await readObjectKeys(env, id)
    if (await purgeSong(env, id)) await deleteSongObjects(env, id, keys)
  }

  return expired
}

// "web/<songId>/<file>" — the middle segment. Every key this app writes has
// that shape; anything else belongs to no song in particular.
function songIdFromKey(key) {
  const parts = key.split('/')
  return parts.length >= 3 ? parts[1] : null
}

// Everything the admin's two bottom sections need, in one answer.
//
// They were two endpoints and that was wrong twice over: usage and the orphan
// check need the same walk of the same two buckets, and the bin is the
// explanation for the usage figure — permanently deleting a song changes both,
// so fetching them apart meant one could be left showing a number the other had
// just made false.
export async function readStorage(env) {
  const referenced = await referencedKeys(env)

  const buckets = []
  const orphans = []
  const bySong = new Map()

  for (const prefix of PREFIXES) {
    const { bucket } = ruleForKey(prefix)
    let count = 0
    let bytes = 0

    for (const object of await listAll(env[bucket], prefix)) {
      count += 1
      bytes += object.size
      if (!referenced.has(object.key)) orphans.push({ ...object, bucket })

      const songId = songIdFromKey(object.key)
      if (songId) {
        const owned = bySong.get(songId) ?? { files: 0, bytes: 0 }
        owned.files += 1
        owned.bytes += object.size
        bySong.set(songId, owned)
      }
    }

    buckets.push({ prefix, bucket, count, bytes })
  }

  // What a deleted song is really holding, measured rather than added up from
  // the row's four size columns — which count only the objects it still names,
  // and so understate what deleting it for good would actually free.
  const deleted = (await listDeletedSongs(env)).map((song) => ({
    ...song,
    ...(bySong.get(song.id) ?? { files: 0, bytes: 0 }),
  }))

  return {
    database: await readDatabaseUsage(env),
    buckets,
    orphans,
    deleted,
    // So the panel can draw usage against something rather than just reporting
    // a number nobody can size up.
    limits: { r2: R2_LIMIT_BYTES, d1: D1_LIMIT_BYTES },
    // So the admin can say how long is left rather than restating the rule.
    binDays: BIN_DAYS,
  }
}

export async function deleteOrphans(env, orphans) {
  const removed = await deleteKeys(env, orphans.map((orphan) => orphan.key))
  return removed.length
}
