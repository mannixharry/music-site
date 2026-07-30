import { useState } from 'react'
import { formatBytes } from '../format'
import { api } from './api'

// Files in the buckets that no song names any more.
//
// Every write now removes the object it replaced, so in normal use this finds
// nothing. It exists for what accumulated before that did, and for the one gap
// bookkeeping cannot close: an upload that reaches R2 and then fails to record
// itself leaves an object nothing has ever pointed at.
//
// Deliberately two steps. Counting is safe and destroying is not, and the
// second should never be a thing that happened while looking at the first.
function StorageTidy() {
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [swept, setSwept] = useState(null)

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      const result = await action()
      setFound(result.orphans)
      if (result.deleted !== undefined) setSwept(result.deleted)
    } catch (runError) {
      setError(runError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-10 border-t border-gray-300 pt-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-600">Storage</h2>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(api.orphans)}
          className="border border-gray-500 bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Check for unreferenced files'}
        </button>

        {found?.length > 0 && swept === null && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              // eslint-disable-next-line no-alert
              if (!window.confirm(`Delete ${found.length} unreferenced file(s)? This cannot be undone.`)) return
              run(api.sweepOrphans)
            }}
            className="border border-gray-500 bg-gray-200 px-3 py-1 text-sm font-bold disabled:opacity-50"
          >
            Delete {found.length}
          </button>
        )}
      </div>

      {error && <p className="mt-2 border border-gray-500 bg-gray-100 p-2 text-xs">{error}</p>}

      {swept !== null && (
        <p className="mt-2 text-xs">Removed {swept} file{swept === 1 ? '' : 's'}.</p>
      )}

      {found !== null && swept === null && (
        <div className="mt-2 text-xs">
          {found.length === 0 ? (
            <p>Nothing unreferenced — every file in both buckets belongs to a song.</p>
          ) : (
            <>
              <p>
                {found.length} file{found.length === 1 ? '' : 's'} no song points at,{' '}
                {formatBytes(found.reduce((total, o) => total + o.size, 0))} in total. Songs you
                have deleted still count as using theirs, so nothing here is a deleted song&apos;s
                audio.
              </p>
              <ul className="mt-1 font-mono text-gray-600">
                {found.map((orphan) => (
                  <li key={orphan.key}>
                    {orphan.key} · {formatBytes(orphan.size)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}

export default StorageTidy
