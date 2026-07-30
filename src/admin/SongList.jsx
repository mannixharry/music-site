import { useMemo, useState } from 'react'

const GROUPS = [
  ['single', 'Singles'],
  ['demo', 'From the musicals'],
  ['other', 'Other'],
]

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

  // Position is computed against the full ordering, not the filtered view —
  // otherwise "move up" while searching would jump a song past everything
  // hidden, which is not what the arrow appears to promise.
  function move(song, direction) {
    const index = songs.findIndex((candidate) => candidate.id === song.id)
    const target = index + direction
    if (target < 0 || target >= songs.length) return
    onMove(song.id, direction < 0 ? (songs[index - 2]?.id ?? null) : songs[index + 1].id)
  }

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
                      disabled={busy}
                      onClick={() => move(song, -1)}
                      className="border border-gray-300 px-1 text-xs disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${song.title} down`}
                      disabled={busy}
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
