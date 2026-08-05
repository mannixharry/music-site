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
    albumId: record.album_id,
    status: record.status,
    webKey: record.web_key,
    coverKey: record.cover_key,
    duration: record.duration_s,
    // Whether web_key holds a cut of the song rather than the whole of it. The
    // site needs this to label the player; where the cut was taken from is a
    // fact about the master, so it stays out — see below.
    isSnippet: record.is_snippet === 1,
    // Whether to say so. Separate from the fact itself — see 0004.
    showSnippetTag: record.show_snippet_tag === 1,
    links: Array.isArray(links) ? links : [],
    sortOrder: record.sort_order,
    // Whether the home page shows it. Separate from album_id since 0007: what a
    // song belongs to and where it is shown are two questions, and answering
    // both with one column meant the only way onto the front page was to leave
    // the record.
    onHomepage: record.on_homepage === 1,
    // Whether the album's own listing leaves it out — see 0008. Only ever
    // meaningful for a song that is in an album and shown somewhere else.
    hiddenInAlbum: record.hide_in_album === 1,
    published: record.published === 1,
  }
}

// No cover_master_* here, for the same reason there is no master_*: nothing in
// the private bucket is reachable from the web, and naming it publicly would be
// the first half of making it so. snippet_start_s and snippet_end_s are absent
// on the same principle — they are offsets into the master, and the public
// object's own length is duration_s.
const PUBLIC_COLUMNS = `
  id, title, description, kind, album_id, status,
  web_key, cover_key, duration_s, is_snippet, show_snippet_tag,
  links_json, sort_order, on_homepage, hide_in_album, published
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
            cover_bytes, cover_master_key, cover_master_bytes,
            snippet_start_s, snippet_end_s, updated_at
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
    snippetStart: record.snippet_start_s,
    snippetEnd: record.snippet_end_s,
    updatedAt: record.updated_at,
  }))
}

// The bin. Soft-deleted rows keep everything, including the keys of the objects
// they used, so this can offer both a way back and a way to finish the job.
//
// The sizes travel with it because "permanently delete" is a storage decision as
// much as a catalogue one, and it should be obvious what each row is costing.
export async function listDeletedSongs(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, title, kind, deleted_at,
            web_bytes, master_bytes, cover_bytes, cover_master_bytes
     FROM songs WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
  ).all()

  return results.map((record) => ({
    id: record.id,
    title: record.title,
    kind: record.kind,
    deletedAt: record.deleted_at,
    bytes:
      (record.web_bytes ?? 0) +
      (record.master_bytes ?? 0) +
      (record.cover_bytes ?? 0) +
      (record.cover_master_bytes ?? 0),
  }))
}

// Everything soft-deleted before `before`, which is an ISO timestamp. String
// comparison is the right one here: every deleted_at is written by
// toISOString(), so it is fixed-width UTC and sorts chronologically as text.
export async function listExpiredSongs(env, before) {
  const { results } = await env.DB.prepare(
    `SELECT id FROM songs WHERE deleted_at IS NOT NULL AND deleted_at < ?`,
  )
    .bind(before)
    .all()

  return results.map((record) => record.id)
}

// Back as a draft, never straight back onto the site. `deleteSong` cleared
// `published` on the way out and this deliberately does not set it again: a song
// reappearing in front of visitors because someone was browsing the bin would be
// a much worse surprise than one that needs ticking again.
export async function restoreSong(env, id) {
  await env.DB.prepare(
    `UPDATE songs SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL`,
  )
    .bind(new Date().toISOString(), id)
    .run()

  await bumpVersion(env)
  return getSong(env, id)
}

// The real thing: the row goes. Guarded on the row already being soft-deleted,
// so this can never be reached for a live song by a mistyped id.
export async function purgeSong(env, id) {
  const { meta } = await env.DB.prepare(
    `DELETE FROM songs WHERE id = ? AND deleted_at IS NOT NULL`,
  )
    .bind(id)
    .run()

  await bumpVersion(env)
  return (meta?.changes ?? 0) > 0
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
  albumId: 'album_id',
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
  isSnippet: 'is_snippet',
  showSnippetTag: 'show_snippet_tag',
  snippetStart: 'snippet_start_s',
  snippetEnd: 'snippet_end_s',
  onHomepage: 'on_homepage',
  hiddenInAlbum: 'hide_in_album',
  published: 'published',
}

const BOOLEAN_FIELDS = new Set([
  'published',
  'isSnippet',
  'showSnippetTag',
  'onHomepage',
  'hiddenInAlbum',
])

function serialise(field, value) {
  if (BOOLEAN_FIELDS.has(field)) return value ? 1 : 0
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
  // Every nullable column is listed and bound, including the cover and snippet
  // ones nothing supplies yet. That is what makes the OR REPLACE above a clean
  // slate: reusing a deleted song's id must not inherit its artwork, and must
  // not inherit a preview flag describing audio it no longer points at.
  await env.DB.prepare(
    `INSERT OR REPLACE INTO songs (
       id, title, description, kind, album_id, status,
       web_key, web_bytes, master_key, master_bytes, master_mime, duration_s,
       cover_key, cover_bytes, cover_master_key, cover_master_bytes, cover_master_mime,
       is_snippet, show_snippet_tag, snippet_start_s, snippet_end_s,
       links_json, sort_order, on_homepage, hide_in_album, published, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.id,
      input.title,
      input.description ?? '',
      input.kind,
      input.albumId ?? null,
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
      input.isSnippet ? 1 : 0,
      input.showSnippetTag ? 1 : 0,
      input.snippetStart ?? null,
      input.snippetEnd ?? null,
      JSON.stringify(input.links ?? []),
      sortOrder,
      input.onHomepage ? 1 : 0,
      input.hiddenInAlbum ? 1 : 0,
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

// ---------------------------------------------------------------------------
// Albums. A named group of songs with a cover of its own; a musical is one of
// these with kind = 'musical'. The shape below is what the client renders and
// what snapshot.json holds, exactly as with songs.
// ---------------------------------------------------------------------------

function toAlbumRow(record) {
  return {
    id: record.id,
    title: record.title,
    kind: record.kind,
    subtitle: record.subtitle,
    coverKey: record.cover_key,
    sortOrder: record.sort_order,
    published: record.published === 1,
  }
}

// No cover_master_* , for the reason songs have no master_*: nothing in the
// private bucket is reachable from the web.
const ALBUM_PUBLIC_COLUMNS = `id, title, kind, subtitle, cover_key, sort_order, published`

export async function listPublishedAlbums(env) {
  const { results } = await env.DB.prepare(
    `SELECT ${ALBUM_PUBLIC_COLUMNS} FROM albums
     WHERE published = 1 AND deleted_at IS NULL
     ORDER BY sort_order`,
  ).all()

  return results.map(toAlbumRow)
}

export async function listAllAlbums(env) {
  const { results } = await env.DB.prepare(
    `SELECT ${ALBUM_PUBLIC_COLUMNS}, cover_bytes, cover_master_key, cover_master_bytes,
            cover_master_mime
     FROM albums WHERE deleted_at IS NULL ORDER BY sort_order`,
  ).all()

  return results.map((record) => ({
    ...toAlbumRow(record),
    coverBytes: record.cover_bytes,
    coverMasterKey: record.cover_master_key,
    coverMasterBytes: record.cover_master_bytes,
    coverMasterMime: record.cover_master_mime,
  }))
}

export async function getAlbum(env, id) {
  const record = await env.DB.prepare(
    `SELECT ${ALBUM_PUBLIC_COLUMNS}, cover_bytes, cover_master_key, cover_master_bytes,
            cover_master_mime
     FROM albums WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(id)
    .first()

  if (!record) return null
  return {
    ...toAlbumRow(record),
    coverBytes: record.cover_bytes,
    coverMasterKey: record.cover_master_key,
    coverMasterBytes: record.cover_master_bytes,
    coverMasterMime: record.cover_master_mime,
  }
}

export async function createAlbum(env, input) {
  const now = new Date().toISOString()
  const last = await env.DB.prepare(`SELECT MAX(sort_order) AS max FROM albums`).first()

  // OR REPLACE for the reason createSong has it: a deleted album keeps its id,
  // and reusing a name that is no longer in use should simply work. Every
  // nullable column is bound, so the new album cannot inherit the artwork of
  // the one whose id it is taking.
  await env.DB.prepare(
    `INSERT OR REPLACE INTO albums (
       id, title, kind, subtitle,
       cover_key, cover_bytes, cover_master_key, cover_master_bytes, cover_master_mime,
       sort_order, published, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.id,
      input.title,
      input.kind,
      input.subtitle ?? '',
      null,
      null,
      null,
      null,
      null,
      (last?.max ?? 0) + 10,
      input.published ? 1 : 0,
      now,
      now,
    )
    .run()

  await bumpVersion(env)
  return getAlbum(env, input.id)
}

const ALBUM_WRITABLE = {
  title: 'title',
  kind: 'kind',
  subtitle: 'subtitle',
  coverKey: 'cover_key',
  coverBytes: 'cover_bytes',
  coverMasterKey: 'cover_master_key',
  coverMasterBytes: 'cover_master_bytes',
  coverMasterMime: 'cover_master_mime',
  published: 'published',
}

export async function updateAlbum(env, id, patch) {
  const assignments = []
  const values = []

  for (const [field, column] of Object.entries(ALBUM_WRITABLE)) {
    if (!(field in patch)) continue
    assignments.push(`${column} = ?`)
    values.push(field === 'published' ? (patch[field] ? 1 : 0) : patch[field])
  }

  if (assignments.length === 0) return getAlbum(env, id)

  assignments.push('updated_at = ?')
  values.push(new Date().toISOString(), id)

  await env.DB.prepare(
    `UPDATE albums SET ${assignments.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(...values)
    .run()

  await bumpVersion(env)
  return getAlbum(env, id)
}

// Soft, like a song's — and it releases the songs rather than taking them with
// it. An album is a grouping; deleting the grouping should not delete the work.
// The songs land back among the singles on /songs, which is a state the site
// already knows how to show. `on_homepage` is deliberately left alone: since
// 0007 it is an editorial choice of its own, so dissolving an album must not
// silently move five demos onto the front page.
export async function deleteAlbum(env, id) {
  const now = new Date().toISOString()

  await env.DB.batch([
    env.DB.prepare(`UPDATE albums SET deleted_at = ?, updated_at = ? WHERE id = ?`).bind(now, now, id),
    // `kind` follows the album, so releasing a song has to move it too, or the
    // row says "demo" while belonging to nothing.
    env.DB.prepare(
      `UPDATE songs SET album_id = NULL, kind = 'single', updated_at = ? WHERE album_id = ?`,
    ).bind(now, id),
  ])

  await bumpVersion(env)
}

export async function moveAlbum(env, id, afterId) {
  const { results } = await env.DB.prepare(
    `SELECT id, sort_order FROM albums WHERE deleted_at IS NULL ORDER BY sort_order`,
  ).all()

  const others = results.filter((row) => row.id !== id)
  const index = afterId === null ? -1 : others.findIndex((row) => row.id === afterId)
  if (afterId !== null && index === -1) return

  const before = index >= 0 ? others[index].sort_order : 0
  const after = others[index + 1]?.sort_order ?? before + 20

  if (after - before > 1) {
    await env.DB.prepare(`UPDATE albums SET sort_order = ?, updated_at = ? WHERE id = ?`)
      .bind(Math.floor((before + after) / 2), new Date().toISOString(), id)
      .run()
  } else {
    const ordered = [...others]
    ordered.splice(index + 1, 0, { id })
    await env.DB.batch(
      ordered.map((row, position) =>
        env.DB.prepare(`UPDATE albums SET sort_order = ? WHERE id = ?`).bind((position + 1) * 10, row.id),
      ),
    )
  }

  await bumpVersion(env)
}

// Whether anything still points at an album, which is what the admin needs to
// say before offering to delete one.
export async function countAlbumSongs(env, id) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM songs WHERE album_id = ? AND deleted_at IS NULL`,
  )
    .bind(id)
    .first()

  return row?.n ?? 0
}
