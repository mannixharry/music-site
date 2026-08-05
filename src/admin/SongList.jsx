import { useMemo, useState } from 'react'
import { formatTime } from '../format'

// One section per album, in the order the albums are arranged, with the songs
// belonging to none of them first. The same shape /songs draws, deliberately:
// this is the list Frank arranges and that is the list a visitor reads, so a
// heading he moves a song under should be a heading they see.
//
// It used to group by `kind`, which put all three shows under one heading
// reading "From the musicals". That was fine when a musical was the only kind
// of album; it stopped being fine when an ordinary record could exist, because
// its songs were filed under a heading saying they came from a musical. And it
// gave no way to see one show's running order on its own, which is the thing
// the arrows are for.
//
// A song whose album is missing entirely still gets a section, because a song
// that renders nowhere in the admin cannot be fixed from the admin.
function groupSongs(songs, albums) {
  const sections = [{ id: null, label: 'Not in an album', songs: [] }]
  const byId = new Map()

  for (const album of albums) {
    const section = {
      id: album.id,
      label: album.title,
      kind: album.kind,
      songs: [],
    }
    byId.set(album.id, section)
    sections.push(section)
  }

  for (const song of songs) {
    if (!song.albumId) {
      sections[0].songs.push(song)
      continue
    }

    let section = byId.get(song.albumId)
    if (!section) {
      section = { id: song.albumId, label: `${song.albumId} — album missing`, songs: [] }
      byId.set(song.albumId, section)
      sections.push(section)
    }
    section.songs.push(song)
  }

  return sections.filter((section) => section.songs.length > 0)
}

// The catalogue is one flat ordering, but this list and /songs both draw it in
// groups — and the groups interleave freely, so a song's neighbour in the flat
// order is very often one from another album that nobody can see between them.
//
// That is what made the arrows look broken. Moving a song "down" past its flat
// neighbour left it in exactly the same place within its own group, and did so
// for as many hidden songs as there were in the way. Arrows therefore move a
// song past its neighbour *in its own group*, which is the only movement
// either this list or the site can show.
//
// Grouped by album rather than by kind, matching the sections above. That is
// not a detail: this decides both the move and whether the arrow is enabled, so
// if it grouped differently from what is drawn the arrows would go back to
// looking like they did nothing.
function neighbourFor(songs, song, direction) {
  const group = songs.filter((candidate) => (candidate.albumId ?? null) === (song.albumId ?? null))
  const index = group.findIndex((candidate) => candidate.id === song.id)
  const target = index + direction
  if (target < 0 || target >= group.length) return undefined

  // Down: land straight after the next song in the group.
  if (direction > 0) return group[target].id

  // Up: land straight before the previous one — which means landing after
  // whatever precedes *it* in the flat order, whatever kind that turns out to
  // be, or first when there is nothing before it at all.
  const previous = group[target]
  const flatIndex = songs.findIndex((candidate) => candidate.id === previous.id)
  return flatIndex > 0 ? songs[flatIndex - 1].id : null
}

function SongList({ songs, albums = [], selectedId, onSelect, onMove, busy }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return songs
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(needle) ||
        song.description.toLowerCase().includes(needle),
    )
  }, [songs, query])

  const groups = useMemo(() => groupSongs(filtered, albums), [filtered, albums])

  // Against the full catalogue, not the filtered view — otherwise "move up"
  // while searching would jump a song past everything hidden, which is not what
  // the arrow appears to promise.
  function move(song, direction) {
    const after = neighbourFor(songs, song, direction)
    if (after === undefined) return
    onMove(song.id, after)
  }

  // Whether an arrow can do anything, worked out the same way the move is, so
  // the two cannot disagree. A song at the top of its group has nowhere up to
  // go, and an arrow that does nothing should say so rather than be pressed.
  const canMove = (song, direction) => neighbourFor(songs, song, direction) !== undefined

  return (
    <div>
      <input
        className="w-full border border-gray-400 bg-white px-2 py-1 text-sm"
        placeholder={`Search ${songs.length} songs…`}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />

      {filtered.length === 0 && (
        <p className="mt-4 border border-dashed border-gray-400 p-4 text-center text-sm">
          Nothing matches “{query}”.
        </p>
      )}

      {groups.map((section) => (
          <section key={section.id ?? 'none'} className="mt-5">
            <h3 className="flex items-baseline justify-between gap-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wide text-gray-600">
              <span className="min-w-0 truncate">{section.label}</span>
              {/* The count, and what the album is. Worth saying here because
                  the heading is now a title rather than a category, and
                  "Pigs" alone does not say whether it is a show or a record. */}
              <span className="shrink-0 font-normal normal-case">
                {section.kind === 'musical' ? 'musical · ' : section.kind === 'album' ? 'album · ' : ''}
                {section.songs.length}
              </span>
            </h3>
            <ul>
              {section.songs.map((song) => (
                <li
                  key={song.id}
                  className={`flex items-center gap-2 border-b border-gray-200 py-2 ${
                    song.id === selectedId ? 'bg-gray-200' : ''
                  }`}
                >
                  {/* A filled square reads as "live" at a glance in a long
                      list; an outline is a draft. */}
                  <span
                    aria-label={song.published ? 'Published' : 'Draft'}
                    title={song.published ? 'Published' : 'Draft'}
                    className={`h-2 w-2 shrink-0 border border-gray-600 ${
                      song.published ? 'bg-gray-700' : 'bg-white'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => onSelect(song.id)}
                    className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                  >
                    {song.title}
                    {/* Which songs the front page draws. It used to be exactly
                        the first section here, so the grouping said it; since
                        0007 a song in any album can be on the home page, and
                        nothing else in this list would show it. */}
                    {song.onHomepage && (
                      <span className="ml-2 text-xs text-gray-500">
                        {/* Said in one label rather than two, because the
                            second only ever qualifies the first: the song is
                            on the front page, and this section it is listed
                            under here is a section it is kept out of on the
                            site. Without it the list would draw a song exactly
                            where the site does not. */}
                        {song.hiddenInAlbum ? 'home page only' : 'home page'}
                      </span>
                    )}
                    {!song.webKey && <span className="ml-2 text-xs text-gray-500">no audio</span>}
                    {song.isSnippet && <span className="ml-2 text-xs text-gray-500">snapshot</span>}
                  </button>

                  <span className="shrink-0 font-mono text-xs text-gray-600">
                    {formatTime(song.duration, { blank: '—' })}
                  </span>

                  <span className="flex shrink-0">
                    <button
                      type="button"
                      aria-label={`Move ${song.title} up`}
                      disabled={busy || !canMove(song, -1)}
                      onClick={() => move(song, -1)}
                      className="border border-gray-300 px-1 text-xs disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${song.title} down`}
                      disabled={busy || !canMove(song, 1)}
                      onClick={() => move(song, 1)}
                      className="border border-l-0 border-gray-300 px-1 text-xs disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
      ))}
    </div>
  )
}

export default SongList
