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
//
// Audio and cover art are both public objects in the same bucket, so both
// resolve through here.
export function toMediaSrc(key, mediaBase) {
  if (!key) return null
  if (key.startsWith('/') || key.startsWith('http')) return key
  return `${mediaBase}/${key}`
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
    audioSrc: toMediaSrc(row.webKey, mediaBase),
    // Only the singles render this today, but every kind of song may carry it —
    // so a song promoted to a single shows the art it already has, rather than
    // asking for the file a second time.
    coverSrc: toMediaSrc(row.coverKey, mediaBase),
    duration: row.duration ?? null,
    // Whether audioSrc is a cut of the song rather than the whole of it, which
    // is the one thing the site says about it. A snapshot taken before previews
    // existed simply has no such songs, so the default is the honest one.
    isSnippet: row.isSnippet === true,
    // Whether the site says so. Opt-in per song, so a snapshot from a musical
    // is not labelled as an extract when everyone already knows it is one.
    showSnippetTag: row.showSnippetTag === true,
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
