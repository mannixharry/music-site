import { useCallback, useEffect, useState } from 'react'
import { formatBytes } from '../format'
import { api } from './api'

// What each prefix actually holds, in the words Frank would use. The Worker
// answers in prefixes because prefixes are what decide the bucket; naming them
// is a presentation job and belongs here.
const LABELS = {
  'web/': 'Audio on the site',
  'masters/': 'Masters (private)',
  'covers/': 'Cover art on the site',
  'cover-masters/': 'Cover originals (private)',
}

// Four numbers with no series, no trend and nothing to compare against each
// other — so plain figures rather than any kind of chart, and no colour beyond
// the greys the rest of the admin is built from. A number this size wants to be
// legible, not decorated.
function Stat({ label, value, note }) {
  return (
    <div className="border border-gray-400 bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-gray-600">{note}</p>}
    </div>
  )
}

function StoragePanel() {
  const [storage, setStorage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [swept, setSwept] = useState(null)

  const load = useCallback(async () => {
    try {
      setStorage(await api.storage())
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [])

  // Read on arrival: it is one request, it walks two buckets holding a few
  // dozen objects, and a figure you have to ask for is a figure nobody looks at.
  useEffect(() => {
    load()
  }, [load])

  async function sweep() {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${orphans.length} unreferenced file(s)? This cannot be undone.`)) {
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await api.sweepStorage()
      setSwept(result.deleted)
      await load()
    } catch (sweepError) {
      setError(sweepError.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !storage) {
    return (
      <section className="mt-10 border-t border-gray-300 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-600">Storage</h2>
        <p className="mt-2 border border-gray-500 bg-gray-100 p-2 text-xs">{error}</p>
      </section>
    )
  }

  if (!storage) {
    return (
      <section className="mt-10 border-t border-gray-300 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-600">Storage</h2>
        <p className="mt-2 text-sm text-gray-600">Measuring…</p>
      </section>
    )
  }

  const { database, buckets, orphans } = storage
  const files = buckets.reduce((total, group) => total + group.count, 0)
  const bytes = buckets.reduce((total, group) => total + group.bytes, 0)

  const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

  const drafts = database.songs - database.published
  const breakdown = [`${database.published} published`, plural(drafts, 'draft')]
  if (database.previews) breakdown.push(plural(database.previews, 'preview'))

  return (
    <section className="mt-10 border-t border-gray-300 pt-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-600">Storage</h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Songs" value={database.songs} note={breakdown.join(' · ')} />
        <Stat
          label="Files (R2)"
          value={formatBytes(bytes)}
          note={`${plural(files, 'file')} across both buckets`}
        />
        <Stat
          label="Database (D1)"
          value={database.bytes === null ? '—' : formatBytes(database.bytes)}
          note={
            database.deleted
              ? `${plural(database.total, 'row')}, ${database.deleted} deleted`
              : plural(database.total, 'row')
          }
        />
      </div>

      <table className="mt-4 w-full text-xs">
        <tbody>
          {buckets.map((group) => (
            <tr key={group.prefix} className="border-b border-gray-200">
              <td className="py-1">{LABELS[group.prefix] ?? group.prefix}</td>
              <td className="py-1 text-right tabular-nums text-gray-600">{group.count}</td>
              <td className="w-24 py-1 text-right font-mono tabular-nums">
                {formatBytes(group.bytes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-xs text-gray-600">
        Cloudflare&apos;s free tier allows 10 GB in R2 and 5 GB in D1. Deleted songs still count —
        their files are kept so the delete can be undone.
      </p>

      {error && <p className="mt-2 border border-gray-500 bg-gray-100 p-2 text-xs">{error}</p>}

      {swept !== null && (
        <p className="mt-2 text-xs">
          Removed {swept} file{swept === 1 ? '' : 's'}.
        </p>
      )}

      {orphans.length > 0 ? (
        <div className="mt-3 border border-gray-500 bg-gray-100 p-3 text-xs">
          <p className="font-bold">
            {orphans.length} file{orphans.length === 1 ? '' : 's'} no song points at,{' '}
            {formatBytes(orphans.reduce((total, orphan) => total + orphan.size, 0))} in total.
          </p>
          <ul className="mt-1 font-mono text-gray-600">
            {orphans.map((orphan) => (
              <li key={orphan.key}>
                {orphan.key} · {formatBytes(orphan.size)}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busy}
            onClick={sweep}
            className="mt-2 border border-gray-500 bg-gray-200 px-3 py-1 disabled:opacity-50"
          >
            {busy ? 'Deleting…' : `Delete ${orphans.length}`}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-600">
          Nothing unreferenced — every file in both buckets belongs to a song.
        </p>
      )}
    </section>
  )
}

export default StoragePanel
