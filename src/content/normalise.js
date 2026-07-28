// Turns a stored song row — from the committed snapshot, or from /api/content,
// which return the same shape — into the object the components render.
//
// The row is deliberately dumb: it holds a storage key rather than a URL, and a
// bare title rather than a composed one. Both are resolved here, so moving the
// audio to R2 (or renaming a musical) touches one file.

import { musicals } from './musicals'

const musicalTitles = new Map(musicals.map((musical) => [musical.slug, musical.title]))

// A leading slash means a file still sitting in public/; anything else is an R2
// object key to be hung off the media domain. This is what lets the same
// snapshot survive the move to R2 without a flag day.
function toAudioSrc(webKey, mediaBase) {
  if (!webKey) return null
  if (webKey.startsWith('/') || webKey.startsWith('http')) return webKey
  return `${mediaBase}/${webKey}`
}

export function toSong(row, mediaBase = '') {
  const musicalTitle = row.kind === 'demo' ? musicalTitles.get(row.musicalSlug) : null

  return {
    id: row.id,
    // `title` carries the musical's name for demos, because /songs lists the
    // whole catalogue flat and "Musical snapshot" alone says nothing there.
    title: musicalTitle ? `${musicalTitle} — ${row.title}` : row.title,
    // `shortTitle` is the bare stored title, for when the musical's name is
    // already the heading above it.
    shortTitle: row.title,
    description: row.description ?? '',
    audioSrc: toAudioSrc(row.webKey, mediaBase),
    duration: row.duration ?? null,
    links: row.links ?? [],
    status: row.status ?? 'released',
    kind: row.kind,
    musicalSlug: row.musicalSlug ?? null,
  }
}

// Unpublished rows exist so the admin can hold a draft; they never reach a
// visitor. /api/content filters them too — this is the second lock.
export function toSongs(rows, mediaBase = '') {
  return rows.filter((row) => row.published !== false).map((row) => toSong(row, mediaBase))
}
