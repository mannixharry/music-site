import { useCallback, useEffect, useState } from 'react'
import { formatBytes } from '../format'
import { api } from './api'

function when(iso) {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return 'at some point'

  const days = Math.floor((Date.now() - at.getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return at.toLocaleDateString()
}

// Deleting a song has always been soft — the row keeps its title, its links and
// the keys of its audio — but nothing ever showed you that, so the recoverable
// half was true and unreachable. This is the half that was missing.
//
// It is also where the storage figures above get their explanation: a deleted
// song's files still count, deliberately, and this is the only place to decide
// they should stop.
function DeletedSongs({ onRestored }) {
  const [deleted, setDeleted] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setDeleted((await api.deleted()).deleted)
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function restore(song) {
    setBusyId(song.id)
    setError(null)
    try {
      const result = await api.restore(song.id)
      setDeleted(result.deleted)
      // The song is back in the catalogue, so the list beside this is stale.
      await onRestored()
    } catch (restoreError) {
      setError(restoreError.message)
    } finally {
      setBusyId(null)
    }
  }

  async function purge(song) {
    // eslint-disable-next-line no-alert
    const sure = window.confirm(
      `Permanently delete “${song.title}”?\n\n` +
        `The song and its ${formatBytes(song.bytes)} of audio and artwork — including the ` +
        `master — are removed for good. This cannot be undone.`,
    )
    if (!sure) return

    setBusyId(song.id)
    setError(null)
    try {
      setDeleted((await api.purge(song.id)).deleted)
    } catch (purgeError) {
      setError(purgeError.message)
    } finally {
      setBusyId(null)
    }
  }

  if (!deleted || deleted.length === 0) {
    return null
  }

  return (
    <section className="mt-10 border-t border-gray-300 pt-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-600">Recently deleted</h2>
      <p className="mt-2 text-xs text-gray-600">
        These are off the site already. Their files are still stored, which is what makes putting
        one back possible — a restored song comes back as a draft, never straight in front of
        visitors.
      </p>

      {error && <p className="mt-2 border border-gray-500 bg-gray-100 p-2 text-xs">{error}</p>}

      <ul className="mt-3">
        {deleted.map((song) => (
          <li
            key={song.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-200 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">{song.title}</span>
            <span className="shrink-0 text-xs text-gray-600">deleted {when(song.deletedAt)}</span>
            <span className="shrink-0 font-mono text-xs text-gray-600">
              {formatBytes(song.bytes)}
            </span>

            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busyId === song.id}
                onClick={() => restore(song)}
                className="border border-gray-500 bg-gray-200 px-2 py-0.5 text-xs disabled:opacity-50"
              >
                Restore
              </button>
              <button
                type="button"
                disabled={busyId === song.id}
                onClick={() => purge(song)}
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
