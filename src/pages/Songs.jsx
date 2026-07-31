import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Placeholder from '../components/Placeholder'
import SongItem from '../components/SongItem'
import AlbumCover from '../components/AlbumCover'
import { useContent } from '../context/contentContext'
import { toQueue } from '../content/normalise'
import { useSectionNav } from '../context/sectionNavContext'
import { ANCHOR, HEADING, LIST, LIST_ITEM, SECTION } from '../rules'
import { usePageMeta } from '../usePageMeta'

// The catalogue in the shape it is read in: the singles first, then one section
// per album in the order the albums are arranged.
//
// Singles are not a kind of song, they are songs in no album — which is why an
// album can be dissolved without anything being reclassified. Its songs simply
// arrive here instead.
//
// Used twice, once for what is drawn and once for what the pinned row lists, so
// the two can never disagree about which sections exist or how many are in them.
const SINGLES = { id: 'singles', title: 'Singles', album: null }

function groupSongs(list, albums) {
  const sections = [
    { ...SINGLES, songs: list.filter((song) => !song.albumId) },
    ...albums.map((album) => ({
      id: album.id,
      title: album.title,
      album,
      songs: list.filter((song) => song.albumId === album.id),
    })),
  ]

  return sections.filter((section) => section.songs.length > 0)
}

function Songs() {
  usePageMeta({
    title: 'Songs',
    description:
      'The whole catalogue in one place — the singles, and everything that belongs to an album or a musical.',
  })

  const { songs, albums } = useContent()
  const [query, setQuery] = useState('')
  // Which album to narrow to, or null for everything. The search finds an
  // album's songs by name, but only if a reader guesses that it will. This says
  // so out loud.
  const [show, setShow] = useState(null)

  // Only the albums that actually have something in the catalogue, with counts,
  // so the row cannot offer a filter that leads to an empty page.
  const shows = useMemo(
    () =>
      albums
        .map((album) => ({
          slug: album.id,
          title: album.title,
          isMusical: album.isMusical,
          count: songs.filter((song) => song.albumId === album.id).length,
        }))
        .filter((album) => album.count > 0),
    [songs, albums],
  )

  // Title and description, like the admin's search — and `title` here is the
  // composed one, so typing a musical's name finds all of its demos.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const narrowed = show ? songs.filter((song) => song.albumId === show) : songs
    if (!needle) return narrowed

    return narrowed.filter(
      (song) =>
        song.title.toLowerCase().includes(needle) ||
        song.description.toLowerCase().includes(needle),
    )
  }, [songs, query, show])

  // The queue is built here rather than in the map below, and memoised with the
  // grouping it belongs to. Built inline it was a new array of new objects on
  // every render — every keystroke in the search box — which every player in
  // the group then took as a new list. Harmless, and a lot of garbage for a
  // page that can hold the whole catalogue.
  //
  // Once per group, not once per row. The group is also the list that plays on:
  // reaching the end of the singles does not carry the listener into the
  // musicals' demos.
  const groups = useMemo(
    () =>
      groupSongs(matches, albums).map((group) => ({ ...group, queue: toQueue(group.songs) })),
    [matches, albums],
  )

  const searching = query.trim().length > 0 || show !== null

  // Handed to Layout, which pins it under the header — the same row the musicals
  // page gets, and for the same reason: this page runs to a few dozen entries.
  //
  // Null while narrowed. The page is short then, and a pinned row of links to
  // sections a search has emptied is worse than no row at all.
  const sections = useMemo(
    () =>
      searching
        ? null
        : groupSongs(songs, albums).map((group) => ({
            slug: group.id,
            label: group.title,
            count: group.songs.length,
          })),
    [songs, albums, searching],
  )

  useSectionNav(sections)

  return (
    <div className={`${ANCHOR} py-8`}>
      <h1 className="text-4xl font-bold">Songs</h1>
      <p className="mt-2 text-sm leading-relaxed">
        The whole catalogue in one place — the singles, and everything that belongs to an album or
        a musical.
      </p>

      {/* Only worth offering once there is enough here to lose something in. */}
      {songs.length > 8 && (
        <div className="mt-6">
          <label htmlFor="song-search" className="sr-only">
            Search the songs
          </label>
          <div className="flex items-center gap-3">
            <input
              id="song-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={`Search ${songs.length} songs…`}
              className="w-full border border-gray-400 bg-white px-3 py-2 text-sm"
            />
            {/* type="search" gives a clear button in some browsers and not
                others, and it is the one control here worth being sure of. */}
            {/* Tied to the text, not to `searching`, which also covers a
                chosen musical: a Clear beside an empty box would be a lie. */}
            {query.trim().length > 0 && (
              <button type="button" onClick={() => setQuery('')} className="shrink-0 text-sm underline">
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Buttons rather than links: this filters the page in place, and a
          control that does not go anywhere should not look like a way off. */}
      {shows.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">
            {shows.some((album) => album.isMusical) && shows.some((album) => !album.isMusical)
              ? 'From an album or musical:'
              : shows.every((album) => album.isMusical)
                ? 'From a musical:'
                : 'From an album:'}
          </span>
          {shows.map((musical) => {
            const on = show === musical.slug
            return (
              <button
                key={musical.slug}
                type="button"
                // The chosen one turns itself off, so there is always a way
                // back to everything without hunting for a reset.
                onClick={() => setShow(on ? null : musical.slug)}
                aria-pressed={on}
                className={`border px-2 py-1 text-sm ${
                  on
                    ? 'border-accent bg-accent text-white'
                    : 'border-gray-400 bg-white hover:bg-gray-200'
                }`}
              >
                {musical.title}{' '}
                <span className={on ? 'text-gray-200' : 'text-gray-600'}>({musical.count})</span>
              </button>
            )
          })}
          {show && (
            <button type="button" onClick={() => setShow(null)} className="text-sm underline">
              Show everything
            </button>
          )}
        </div>
      )}

      {/* Announced, so the count reaches someone who cannot see the list shrink. */}
      {searching && (
        <p aria-live="polite" className="mt-4 text-sm text-gray-600">
          {matches.length === 0
            ? `Nothing here matches${query.trim() ? ` “${query.trim()}”` : ''}.`
            : `${matches.length} of ${songs.length} songs${
                query.trim() ? ` match “${query.trim()}”` : ''
              }.`}
        </p>
      )}

      {songs.length === 0 && (
        <Placeholder label="No songs added yet — add one from /admin" className="mt-8 h-32" />
      )}

      {groups.map((group) => (
        <section key={group.id} id={group.id} className={`${SECTION} ${ANCHOR}`}>
          <div className="flex items-start gap-4">
            {/* The record's own picture, at the head of its songs. Singles
                have no album and so no cover of their own here. */}
            {group.album && <AlbumCover album={group.album} />}
            <div className="min-w-0">
              <h2 className={HEADING}>{group.title}</h2>
              {group.album?.subtitle && (
                <p className="mt-1 text-sm text-gray-600">{group.album.subtitle}</p>
              )}
              {group.album?.isMusical && (
                <Link to={`/musicals#${group.album.id}`} className="mt-1 inline-block text-sm underline">
                  About this musical
                </Link>
              )}
            </div>
          </div>
          <div className={`mt-4 ${LIST}`}>
            {group.songs.map((song) => (
              <div key={song.id} className={LIST_ITEM}>
                <SongItem song={song} queue={group.queue} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default Songs
