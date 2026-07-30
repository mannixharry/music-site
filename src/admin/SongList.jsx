import { useMemo, useState } from 'react'

const GROUPS = [
  ['single', 'Singles'],
  ['demo', 'From the musicals'],
  ['other', 'Other'],
]

// The catalogue is one flat ordering, but both this list and /songs draw it in
// these groups — and the kinds interleave freely, so a single's neighbour in
// the flat order is very often a demo nobody can see between them.
//
// That is what made the arrows look broken. Moving a single "down" past its
// flat neighbour left it in exactly the same place among the singles, and did
// so for as many presses as there were demos in the way. Arrows therefore move
// a song past its neighbour *in its own group*, which is the only movement
// either this list or the site can show.
function neighbourFor(songs, song, direction) {
  const group = songs.filter((candidate) => candidate.kind === song.kind)
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

function formatDuration(seconds) {
  if (!seconds) return '—'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function SongList({ songs, selectedId, onSelect, onMove, busy }) {
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

      {GROUPS.map(([kind, label]) => {
        const group = filtered.filter((song) => song.kind === kind)
        if (group.length === 0) return null

        return (
          <section key={kind} className="mt-5">
            <h3 className="border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wide text-gray-600">
              {label}
            </h3>
            <ul>
              {group.map((song) => (
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
                    {!song.webKey && <span className="ml-2 text-xs text-gray-500">no audio</span>}
                    {song.isSnippet && <span className="ml-2 text-xs text-gray-500">preview</span>}
                  </button>

                  <span className="shrink-0 font-mono text-xs text-gray-600">
                    {formatDuration(song.duration)}
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
        )
      })}
    </div>
  )
}

export default SongList
