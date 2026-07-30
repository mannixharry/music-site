import { useState } from 'react'
import { formatBytes } from '../format'
import { api } from './api'

const DAY = 86400000

function daysSince(iso) {
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? null : Math.floor((Date.now() - at.getTime()) / DAY)
}

function when(days) {
  if (days === null) return ''
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

// The countdown, said the way a person would. Rounded down, so it never
// promises a day that has already half gone.
function remaining(days, binDays) {
  if (days === null) return ''
  const left = binDays - days
  if (left <= 0) return 'going shortly'
  if (left === 1) return 'goes tomorrow'
  return `${left} days left`
}

// Deleting a song has always kept everything — the title, the links, the audio
// — so that it could be undone. Nothing ever showed you that, which made the
// recoverable half true and unreachable. This is the half that was missing.
//
// Presentational: Admin owns the data, because these rows and the storage
// figures below them move together and reading them apart let one go stale.
function DeletedSongs({ deleted, binDays, onChanged }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  if (deleted.length === 0) return null

  async function act(song, run) {
    setBusyId(song.id)
    setError(null)
    try {
      await run()
      await onChanged()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusyId(null)
    }
  }

  function remove(song) {
    // eslint-disable-next-line no-alert
    const sure = window.confirm(
      `Permanently delete “${song.title}”?\n\n` +
        `Everything stored for it goes — ${song.files} file${song.files === 1 ? '' : 's'}, ` +
        `${formatBytes(song.bytes)}, including your original recording, the website copy and ` +
        `any preview made from it. This cannot be undone.`,
    )
    if (sure) act(song, () => api.purge(song.id))
  }

  return (
    <section className="mt-10 border-t border-gray-300 pt-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-600">Recently deleted</h2>
      <p className="mt-2 text-xs text-gray-600">
        Already off the website. The files are still here, so you can put a song back — it comes
        back as a draft, so you decide when it goes live again.
        {binDays ? ` Anything left here is deleted for good after ${binDays} days, and its storage freed.` : ''}{' '}
        Deleting one yourself does the same thing now: your recording, the website copy and any
        preview all go.
      </p>

      {error && <p className="mt-2 border border-gray-500 bg-gray-100 p-2 text-xs">{error}</p>}

      <ul className="mt-3">
        {deleted.map((song) => (
          <li
            key={song.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-200 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">{song.title}</span>
            <span className="shrink-0 text-xs text-gray-600">
              deleted {when(daysSince(song.deletedAt))}
              {binDays ? ` · ${remaining(daysSince(song.deletedAt), binDays)}` : ''}
            </span>
            <span className="shrink-0 font-mono text-xs text-gray-600">
              {song.files} · {formatBytes(song.bytes)}
            </span>

            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busyId === song.id}
                onClick={() => act(song, () => api.restore(song.id))}
                className="border border-gray-500 bg-gray-200 px-2 py-0.5 text-xs disabled:opacity-50"
              >
                Put back
              </button>
              <button
                type="button"
                disabled={busyId === song.id}
                onClick={() => remove(song)}
                className="text-xs underline disabled:opacity-50"
              >
                {busyId === song.id ? 'Working…' : 'Delete for good'}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default DeletedSongs
