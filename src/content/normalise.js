// Turns a stored song row — from the committed snapshot, or from /api/content,
// which return the same shape — into the object the components render.
//
// The row is deliberately dumb: it holds a storage key rather than a URL, and a
// bare title rather than a composed one. Both are resolved here, so moving the
// audio to R2 (or renaming a musical) touches one file.

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

// `albums` is a Map from id to the normalised album, so a song can be told the
// title it belongs under and can fall back to its album's artwork.
function toSong(row, mediaBase = '', albums = new Map()) {
  const album = row.albumId ? (albums.get(row.albumId) ?? null) : null

  return {
    id: row.id,
    // `title` carries the album's name, for everywhere a song is named away
    // from its album: a lock screen, the now-playing strip, a tab title, and
    // the search on /songs, where it is what makes typing "Pigs" find all five
    // of its demos. "Musical snapshot" on its own says nothing in any of those.
    title: album ? `${album.title} — ${row.title}` : row.title,
    // `shortTitle` is the bare stored title, for when the album's name is
    // already the heading above it — which is every listing on the site, since
    // both /songs and a musical's section draw their songs under one.
    shortTitle: row.title,
    description: row.description ?? '',
    audioSrc: toMediaSrc(row.webKey, mediaBase),
    // A song's own art, or its album's. The inheritance is the point of giving
    // an album a cover at all: twelve songs on one record share one picture,
    // and only the one that differs needs its own.
    coverSrc: toMediaSrc(row.coverKey, mediaBase) ?? album?.coverSrc ?? null,
    // Whether the art above is the album's rather than this song's, which is
    // the difference between "no artwork yet" and "the record's artwork".
    hasOwnCover: Boolean(row.coverKey),
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
    albumId: row.albumId ?? null,
    // Whether the home page shows it, which is now a question of its own rather
    // than "belongs to no album" — see migrations/0007_home_page.sql. The
    // fallback is the rule it replaced, so a snapshot taken before that column
    // existed still draws the home page it was taken from.
    onHomepage: row.onHomepage ?? !row.albumId,
    // Whether the album's own listing leaves it out — see 0008. The song still
    // belongs to the album, is still named under it, and is still reachable
    // from it; it is only held out of the list. A snapshot from a record can
    // therefore sit on the home page without appearing beside the full track it
    // was cut from. Absent from a snapshot taken before the column existed,
    // which reads as false: everything was listed then.
    hiddenInAlbum: row.hiddenInAlbum === true,
    // The whole album, so a caller has its title and kind without a second
    // lookup — and null for a single, which is a state worth being able to test
    // for directly.
    album,
  }
}

// An album as the site renders it. `isMusical` rather than passing `kind`
// around: every caller wants the question, not the string.
export function toAlbum(row, mediaBase = '') {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    isMusical: row.kind === 'musical',
    subtitle: row.subtitle ?? '',
    coverSrc: toMediaSrc(row.coverKey, mediaBase),
    sortOrder: row.sortOrder,
  }
}

export function toAlbums(rows, mediaBase = '') {
  return (rows ?? [])
    .filter((row) => row.published !== false)
    .map((row) => toAlbum(row, mediaBase))
}

// Unpublished rows exist so the admin can hold a draft; they never reach a
// visitor. /api/content filters them too — this is the second lock.
export function toSongs(rows, mediaBase = '', albumRows = []) {
  const albums = new Map(toAlbums(albumRows, mediaBase).map((album) => [album.id, album]))
  return rows
    .filter((row) => row.published !== false)
    .map((row) => toSong(row, mediaBase, albums))
}

// What an album lists, which since 0008 is not quite what it contains: a
// snapshot put on the home page can be held out of the record it was cut from
// while still belonging to it. Used by every view that draws an album's songs —
// /songs and a musical's demos — so the two cannot disagree about which of them
// a record has.
export function listedIn(songs, albumId) {
  return songs.filter((song) => song.albumId === albumId && !song.hiddenInAlbum)
}

// The playable part of a list of songs, in the order it is shown, which is what
// PlaybackProvider needs to move from one to the next. Songs with no audio are
// dropped rather than skipped over later — a queue entry that cannot be played
// is a gap that "next" would have to know about.
//
// This is also the one definition of what a playing track *is*, which now
// matters beyond this site: `album` and `artwork` are what a phone's lock
// screen, a car stereo and a pair of headphones display. They are carried on
// every entry rather than looked up later, because by the time the operating
// system asks, the page that knew about musicals may be long gone.
export function toQueue(songs) {
  return songs
    .filter((song) => song.audioSrc)
    .map((song) => ({
      id: song.id,
      src: song.audioSrc,
      title: song.title,
      // The bare title, for the strip's drawer, which names a record the way a
      // listing does — under its album rather than with the album's name folded
      // into the title. Carried here for the same reason `album` and `artwork`
      // are: by the time the strip is asked, the page that knew has gone.
      shortTitle: song.shortTitle,
      duration: song.duration,
      album: song.album?.title ?? null,
      // The record itself, so the strip can offer the way back to it. Two
      // fields rather than the album object: everything in a queue entry is
      // stored to sessionStorage on the way out of the page, so it is kept to
      // what is actually read. `albumIsMusical` only decides the wording — a
      // show is not "the album" in the site's own language — and both are
      // absent from a session stored before this existed, which is why
      // NowPlaying guards on the id rather than assuming one.
      albumId: song.album?.id ?? null,
      albumIsMusical: song.album?.isMusical ?? false,
      artwork: song.coverSrc ?? null,
    }))
}
