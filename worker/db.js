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
    duration: record.duration_s,
    links: Array.isArray(links) ? links : [],
    sortOrder: record.sort_order,
    published: record.published === 1,
  }
}

const PUBLIC_COLUMNS = `
  id, title, description, kind, musical_slug, status,
  web_key, duration_s, links_json, sort_order, published
`

export async function listPublishedSongs(env) {
  const { results } = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS} FROM songs WHERE published = 1 ORDER BY sort_order`,
  ).all()

  return results.map(toRow)
}

// The admin's list — drafts included, which is the whole difference between
// this and the public one.
export async function listAllSongs(env) {
  const { results } = await env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS}, web_bytes, master_key, master_bytes, master_mime, updated_at
     FROM songs ORDER BY sort_order`,
  ).all()

  return results.map((record) => ({
    ...toRow(record),
    webBytes: record.web_bytes,
    masterKey: record.master_key,
    masterBytes: record.master_bytes,
    masterMime: record.master_mime,
    updatedAt: record.updated_at,
  }))
}

export async function getVersion(env) {
  const row = await env.DB.prepare(`SELECT value FROM meta WHERE key = 'version'`).first()
  return row?.value ?? 'unknown'
}
