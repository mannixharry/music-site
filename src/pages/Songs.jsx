import { useMemo, useState } from 'react'
import Placeholder from '../components/Placeholder'
import SongItem from '../components/SongItem'
import { useContent } from '../context/contentContext'
import { toQueue } from '../content/normalise'
import { musicals } from '../content/musicals'
import { useSectionNav } from '../context/sectionNavContext'
import { ANCHOR, HEADING, LIST, LIST_ITEM, SECTION } from '../rules'
import { usePageMeta } from '../usePageMeta'

// The three kinds the catalogue already sorts itself into — the same split the
// admin's list uses, and the one the paragraph below has always described. It
// was only ever the rendering that ignored it.
//
// Order matters here and is not the storage order: this is the order the groups
// appear in, and the catalogue's own `sortOrder` still decides what happens
// inside each one.
const GROUPS = [
  { kind: 'single', slug: 'singles', title: 'Singles' },
  { kind: 'demo', slug: 'from-the-musicals', title: 'From the musicals' },
  { kind: 'other', slug: 'other', title: 'Other' },
]

// Used twice — once for what is drawn, once for what the pinned row lists — so
// the two can never disagree about which groups exist or how many are in them.
function groupSongs(list) {
  return GROUPS.map((group) => ({
    ...group,
    songs: list.filter((song) => song.kind === group.kind),
  })).filter((group) => group.songs.length > 0)
}

function Songs() {
  usePageMeta({
    title: 'Songs',
    description:
      'The whole catalogue in one place — the singles, the snapshots from the musicals, and everything else.',
  })

  const { songs } = useContent()
  const [query, setQuery] = useState('')
  // Which show to narrow to, or null for everything. Most of the catalogue is
  // demos from three musicals; the search finds them by name, but only if a
  // reader guesses that it will. This says so out loud.
  const [show, setShow] = useState(null)

  // Only the shows that actually have something in the catalogue, with counts,
  // so the row cannot offer a filter that leads to an empty page.
  const shows = useMemo(
    () =>
      musicals
        .map((musical) => ({
          slug: musical.slug,
          title: musical.title,
          count: songs.filter((song) => song.musicalSlug === musical.slug).length,
        }))
        .filter((musical) => musical.count > 0),
    [songs],
  )

  // Title and description, like the admin's search — and `title` here is the
  // composed one, so typing a musical's name finds all of its demos.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const narrowed = show ? songs.filter((song) => song.musicalSlug === show) : songs
    if (!needle) return narrowed

    return narrowed.filter(
      (song) =>
        song.title.toLowerCase().includes(needle) ||
        song.description.toLowerCase().includes(needle),
    )
  }, [songs, query, show])

  const groups = groupSongs(matches)
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
        : groupSongs(songs).map((group) => ({
            slug: group.slug,
            label: group.title,
            count: group.songs.length,
          })),
    [songs, searching],
  )

  useSectionNav(sections)

  return (
    <div className={`${ANCHOR} py-8`}>
      <h1 className="text-4xl font-bold">Songs</h1>
      <p className="mt-2 text-sm leading-relaxed">
        The whole catalogue in one place — the singles, the snapshots from the musicals, and
        everything else.
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
          <span className="text-sm text-gray-600">From a musical:</span>
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

      {groups.map((group) => {
        // Once per group, not once per row. The group is also the list that
        // plays on: reaching the end of the singles does not carry the listener
        // into the musicals' demos.
        const queue = toQueue(group.songs)

        return (
          <section key={group.slug} id={group.slug} className={`${SECTION} ${ANCHOR}`}>
            <h2 className={HEADING}>{group.title}</h2>
            <div className={`mt-2 ${LIST}`}>
              {group.songs.map((song) => (
                <div key={song.id} className={LIST_ITEM}>
                  <SongItem song={song} queue={queue} />
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default Songs
