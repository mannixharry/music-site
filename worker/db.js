// All the SQL lives here. Callers deal in the camelCase shape the client wants;
// the snake_case columns stop at this file.

// The stored row and the shape src/content/snapshot.json holds are the same
// thing, so the client cannot tell whether it is rendering live data or the
// copy baked into the bundle. That is what makes the fallback invisible.
function toRow(record) {
  let links = []
  try {
    links = JSON.parse(record.links_json)
  } catch {
    // A malformed links_json should cost that song its links, not the whole
    // page. Everything else about the row is still good.
  }

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    kind: record.kind,
    musicalSlug: record.musical_slug,
    status: record.status,
    webKey: record.web_key,
    coverKey: record.cover_key,
    duration: record.duration_s,
    links: Array.isArray(links) ? links : [],
    sortOrder: record.sort_order,
    published: record.published === 1,
  }
}

// No cover_master_* here, for the same reason there is no master_*: nothing in
// the private bucket is reachable from the web, and naming it publicly would be
// the first half of making it so.
const PUBLIC_COLUMNS = `
  id, title, description, kind, musical_slug, status,
  web_key, cover_key, duration_s, links_json, sort_order, published
`

export async function listPublishedSongs(env) {
  const { results } = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS} FROM songs
     WHERE published = 1 AND deleted_at IS NULL
     ORDER BY sort_order`,
  ).all()

  return results.map(toRow)
}

// The admin's list — drafts included, which is the whole difference between
// this and the public one. Deleted rows stay out of it; they are recoverable
// from the database, not from the UI.
export async function listAllSongs(env) {
  const { results } = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS}, web_bytes, master_key, master_bytes, master_mime,
            cover_bytes, cover_master_key, cover_master_bytes, updated_at
     FROM songs WHERE deleted_at IS NULL ORDER BY sort_order`,
  ).all()

  return results.map((record) => ({
    ...toRow(record),
    webBytes: record.web_bytes,
    masterKey: record.master_key,
    masterBytes: record.master_bytes,
    masterMime: record.master_mime,
    coverBytes: record.cover_bytes,
    coverMasterKey: record.cover_master_key,
    coverMasterBytes: record.cover_master_bytes,
    updatedAt: record.updated_at,
  }))
}

export async function getSong(env, id) {
  const record = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS}, web_bytes, master_key, master_bytes, master_mime
     FROM songs WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(id)
    .first()

  return record ? toRow(record) : null
}

export async function getVersion(env) {
  const row = await env.DB.prepare(`SELECT value FROM meta WHERE key = 'version'`).first()
  return row?.value ?? 'unknown'
}

// An opaque token, not a hash of the content. The client only ever asks whether
// it differs from the one baked into its bundle, and a token that is cheap to
// produce cannot drift out of step with the rows the way a hash computed in two
// places eventually does. The timestamp prefix is there to make it readable in
// a log; nothing depends on it being ordered.
async function bumpVersion(env) {
  const version = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
  await env.DB.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ?)`)
    .bind(version)
    .run()
  return version
}

// ---------------------------------------------------------------------------
// Writes. Every one of them bumps the version, and every caller must purge the
// cached /api/content afterwards or the change stays invisible for a day.
// ---------------------------------------------------------------------------

const WRITABLE = {
  title: 'title',
  description: 'description',
  kind: 'kind',
  musicalSlug: 'musical_slug',
  status: 'status',
  webKey: 'web_key',
  webBytes: 'web_bytes',
  masterKey: 'master_key',
  masterBytes: 'master_bytes',
  masterMime: 'master_mime',
  coverKey: 'cover_key',
  coverBytes: 'cover_bytes',
  coverMasterKey: 'cover_master_key',
  coverMasterBytes: 'cover_master_bytes',
  coverMasterMime: 'cover_master_mime',
  duration: 'duration_s',
  published: 'published',
}

function serialise(field, value) {
  if (field === 'published') return value ? 1 : 0
  return value
}

export async function createSong(env, input) {
  const now = new Date().toISOString()

  // Sparse ordering: new songs land at the end, ten clear of the last one, so
  // there is room to move something between them without renumbering.
  const last = await env.DB.prepare(`SELECT MAX(sort_order) AS max FROM songs`).first()
  const sortOrder = (last?.max ?? 0) + 10

  // OR REPLACE, because a deleted row keeps its id: without it, deleting a song
  // and then adding one with the same title again fails on the primary key.
  // Replacing is the behaviour that reads as correct from the outside — the
  // name is free, so using it works — and it cannot clobber a live song,
  // since the route rejects an id that is still in use before reaching here.
  // deleted_at is absent from the column list and so resets to NULL.
  // Every nullable column is listed and bound, including the cover ones nothing
  // supplies yet. That is what makes the OR REPLACE above a clean slate: reusing
  // a deleted song's id must not inherit its artwork.
  await env.DB.prepare(
    `INSERT OR REPLACE INTO songs (
       id, title, description, kind, musical_slug, status,
       web_key, web_bytes, master_key, master_bytes, master_mime, duration_s,
       cover_key, cover_bytes, cover_master_key, cover_master_bytes, cover_master_mime,
       links_json, sort_order, published, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.id,
      input.title,
      input.description ?? '',
      input.kind,
      input.musicalSlug ?? null,
      input.status ?? 'released',
      input.webKey ?? null,
      input.webBytes ?? null,
      input.masterKey ?? null,
      input.masterBytes ?? null,
      input.masterMime ?? null,
      input.duration ?? null,
      input.coverKey ?? null,
      input.coverBytes ?? null,
      input.coverMasterKey ?? null,
      input.coverMasterBytes ?? null,
      input.coverMasterMime ?? null,
      JSON.stringify(input.links ?? []),
      sortOrder,
      input.published ? 1 : 0,
      now,
      now,
    )
    .run()

  await bumpVersion(env)
  return getSong(env, input.id)
}

export async function updateSong(env, id, patch) {
  const assignments = []
  const values = []

  for (const [field, column] of Object.entries(WRITABLE)) {
    if (!(field in patch)) continue
    assignments.push(`${column} = ?`)
    values.push(serialise(field, patch[field]))
  }

  // `links` is stored as JSON in one column, so it does not fit the loop above.
  if ('links' in patch) {
    assignments.push('links_json = ?')
    values.push(JSON.stringify(patch.links ?? []))
  }

  if (assignments.length === 0) return getSong(env, id)

  assignments.push('updated_at = ?')
  values.push(new Date().toISOString(), id)

  await env.DB.prepare(
    `UPDATE songs SET ${assignments.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(...values)
    .run()

  await bumpVersion(env)
  return getSong(env, id)
}

// Soft. The row keeps its title, description and links, and the R2 objects it
// points at are never removed — so this is undoable with one UPDATE, and a
// visitor part-way through loading the old catalogue still gets working audio.
export async function deleteSong(env, id) {
  await env.DB.prepare(`UPDATE songs SET deleted_at = ?, published = 0 WHERE id = ?`)
    .bind(new Date().toISOString(), id)
    .run()

  await bumpVersion(env)
}

// Places `id` immediately after `afterId`, or first when that is null. Sparse
// ordering means this is one UPDATE regardless of how long the list is; the
// renumber below is the rare case where a gap has been used up.
export async function moveSong(env, id, afterId) {
  const { results } = await env.DB.prepare(
    `SELECT id, sort_order FROM songs WHERE deleted_at IS NULL ORDER BY sort_order`,
  ).all()

  const others = results.filter((row) => row.id !== id)
  const index = afterId === null ? -1 : others.findIndex((row) => row.id === afterId)
  if (afterId !== null && index === -1) return

  const before = index >= 0 ? others[index].sort_order : 0
  const after = others[index + 1]?.sort_order ?? before + 20

  if (after - before > 1) {
    await env.DB.prepare(`UPDATE songs SET sort_order = ?, updated_at = ? WHERE id = ?`)
      .bind(Math.floor((before + after) / 2), new Date().toISOString(), id)
      .run()
  } else {
    // No room left between the two neighbours. Rewrite the whole list back onto
    // a sparse 10, 20, 30… and put this row where it was asked to go.
    const ordered = [...others]
    ordered.splice(index + 1, 0, { id })

    const statements = ordered.map((row, position) =>
      env.DB.prepare(`UPDATE songs SET sort_order = ? WHERE id = ?`).bind((position + 1) * 10, row.id),
    )
    await env.DB.batch(statements)
  }

  await bumpVersion(env)
}
