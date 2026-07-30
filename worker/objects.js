// Keeping the buckets to what the catalogue actually points at.
//
// Every upload writes a new key — `web/<song>/<uuid>.mp3` and friends — rather
// than overwriting the old one, which is what lets the media domain serve
// `immutable` with a year-long max-age. The cost of that is the object it
// replaced: nothing referred to it any more, and until now nothing removed it
// either, so re-uploading a master a few times quietly left copies behind.
//
// Two halves. `deleteReplacedObjects` is the cheap one and runs on every write:
// it removes exactly the object a patch has just stopped pointing at. `findOrphans`
// is the sweep, for anything that got away before this existed — or after a
// failure between the upload and the row that was meant to name it.

import { ruleForKey, PREFIXES } from './validate'

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
  const removed = []

  for (const field of OBJECT_KEY_FIELDS) {
    if (!(field in patch)) continue

    const old = before?.[field]
    if (!old || old === patch[field]) continue

    // A key from before the move to R2 names a file in public/, not an object.
    const rule = ruleForKey(old)
    if (!rule) continue

    await env[rule.bucket].delete(old)
    removed.push(old)
  }

  return removed
}

// Every object a row named, for when the row itself is going. Takes what
// readObjectKeys returned, so the caller never has to know which bucket a key
// belongs to — the prefix decides that, here as everywhere.
export async function deleteObjects(env, keys) {
  const removed = []

  for (const key of Object.values(keys ?? {})) {
    if (!key) continue

    const rule = ruleForKey(key)
    if (!rule) continue

    await env[rule.bucket].delete(key)
    removed.push(key)
  }

  return removed
}

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

// What is stored, and what is stored that nothing points at.
//
// One pass answers both, which is why they are not two endpoints: they need the
// same walk of the same two buckets, and asking separately would do it twice for
// one panel.
export async function readStorage(env) {
  const referenced = await referencedKeys(env)

  const buckets = []
  const orphans = []

  for (const prefix of PREFIXES) {
    const { bucket } = ruleForKey(prefix)
    let count = 0
    let bytes = 0

    for (const object of await listAll(env[bucket], prefix)) {
      count += 1
      bytes += object.size
      if (!referenced.has(object.key)) orphans.push({ ...object, bucket })
    }

    buckets.push({ prefix, bucket, count, bytes })
  }

  return { database: await readDatabaseUsage(env), buckets, orphans }
}

export async function deleteOrphans(env, orphans) {
  for (const orphan of orphans) await env[orphan.bucket].delete(orphan.key)
  return orphans.length
}
