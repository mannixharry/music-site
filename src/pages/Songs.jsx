import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Placeholder from '../components/Placeholder'
import SongItem from '../components/SongItem'
import { useContent } from '../context/contentContext'
import { ANCHOR, HEADING, LIST, LIST_ITEM, SECTION, SECTION_FIRST } from '../rules'
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

function Songs() {
  usePageMeta({
    title: 'Songs',
    description:
      'The whole catalogue in one place — the singles, the snapshots from the musicals, and everything else.',
  })

  const { songs } = useContent()
  const [query, setQuery] = useState('')

  // Title and description, like the admin's search — and `title` here is the
  // composed one, so typing a musical's name finds all of its demos.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return songs

    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(needle) ||
        song.description.toLowerCase().includes(needle),
    )
  }, [songs, query])

  const groups = GROUPS.map((group) => ({
    ...group,
    songs: matches.filter((song) => song.kind === group.kind),
  })).filter((group) => group.songs.length > 0)

  const searching = query.trim().length > 0

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
            {searching && (
              <button type="button" onClick={() => setQuery('')} className="shrink-0 text-sm underline">
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* The quick links are a way around a long page; while searching, the
          page is short and the counts would be describing the search anyway. */}
      {groups.length > 1 && !searching && (
        <nav aria-label="Jump to a group" className="mt-6 border-t border-gray-300 pt-3">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {groups.map((group) => (
              <li key={group.slug}>
                <Link to={`#${group.slug}`} className="underline">
                  {group.title}
                </Link>{' '}
                <span className="text-gray-600">({group.songs.length})</span>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Announced, so the count reaches someone who cannot see the list shrink. */}
      {searching && (
        <p aria-live="polite" className="mt-4 text-sm text-gray-600">
          {matches.length === 0
            ? `Nothing matches “${query.trim()}”.`
            : `${matches.length} of ${songs.length} songs match “${query.trim()}”.`}
        </p>
      )}

      {songs.length === 0 && (
        <Placeholder label="No songs added yet — add one from /admin" className="mt-8 h-32" />
      )}

      {groups.map((group, i) => (
        <section
          key={group.slug}
          id={group.slug}
          className={`${i === 0 && !searching ? SECTION_FIRST : SECTION} ${ANCHOR}`}
        >
          <h2 className={HEADING}>{group.title}</h2>
          <div className={`mt-2 ${LIST}`}>
            {group.songs.map((song) => (
              <div key={song.id} className={LIST_ITEM}>
                <SongItem song={song} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default Songs
