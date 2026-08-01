import { useState } from 'react'
import { formatBytes } from '../format'
import { api } from './api'

// What each prefix actually holds, said the way Frank would say it. The Worker
// answers in prefixes because prefixes are what decide the bucket; naming them
// is a presentation job and belongs here.
const LABELS = {
  'web/': 'Audio on the website',
  'masters/': 'Your original recordings',
  'covers/': 'Artwork on the website',
  'cover-masters/': 'Your original artwork',
}

// Plain figures rather than any kind of chart — no series, no trend, nothing to
// compare against each other — and no colour beyond the greys the rest of the
// admin is built from.
//
// The one thing that does get drawn is the proportion of the allowance used,
// because that is a magnitude and a bar answers "how close am I" faster than a
// percentage does. It only appears where there is a limit to be a proportion of.
function Stat({ label, value, note, used, limit }) {
  const share = limit ? Math.min(1, used / limit) : null

  return (
    <div className="border border-gray-400 bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>

      {share !== null && (
        <div className="mt-2 h-1.5 w-full border border-gray-400 bg-white">
          <div
            className="h-full bg-gray-700"
            style={{ width: `${Math.max(share * 100, share > 0 ? 1 : 0)}%` }}
          />
        </div>
      )}

      {note && <p className="mt-1 text-xs text-gray-600">{note}</p>}
    </div>
  )
}

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

// "of 10 GB", with the percentage only once there is one worth reading — at a
// tenth of a percent it is noise, and "0%" beside a real number reads as broken.
function share(used, limit) {
  if (!limit) return ''
  const gb = `${Math.round(limit / 1024 / 1024 / 1024)} GB`
  const percent = Math.round((used / limit) * 100)
  return percent >= 1 ? `${percent}% of ${gb}` : `under 1% of ${gb}`
}

// Presentational, like DeletedSongs: Admin owns the data, because emptying the
// bin changes these figures and reading them apart let one go stale.
function StoragePanel({ storage, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const { database, buckets, orphans, limits } = storage
  const files = buckets.reduce((total, group) => total + group.count, 0)
  const bytes = buckets.reduce((total, group) => total + group.bytes, 0)

  const drafts = database.songs - database.published
  const breakdown = [`${database.published} on the website`, plural(drafts, 'draft')]
  if (database.previews) breakdown.push(plural(database.previews, 'snapshot'))

  async function tidy() {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${plural(orphans.length, 'file')} that no song uses?`)) return

    setBusy(true)
    setError(null)
    try {
      await api.sweepStorage()
      await onChanged()
    } catch (sweepError) {
      setError(sweepError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-10 border-t border-gray-300 pt-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-600">Storage</h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Songs" value={database.songs} note={breakdown.join(' · ')} />
        <Stat
          label="Audio &amp; artwork"
          value={formatBytes(bytes)}
          used={bytes}
          limit={limits?.r2}
          note={`${plural(files, 'file')} · ${share(bytes, limits?.r2)}`}
        />
        <Stat
          label="Song details"
          value={database.bytes === null ? '—' : formatBytes(database.bytes)}
          used={database.bytes ?? 0}
          limit={limits?.d1}
          note={`titles and ordering · ${share(database.bytes ?? 0, limits?.d1)}`}
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

      {error && <p className="mt-2 border border-gray-500 bg-gray-100 p-2 text-xs">{error}</p>}

      <p className="mt-3 text-xs text-gray-600">
        These are the free allowances, and the site will not let you past them — an upload that
        would go over is refused rather than charged for. Songs in the bin above still count
        towards it, since their files are kept so a delete can be undone.
      </p>

      {orphans.length > 0 ? (
        <div className="mt-3 border border-gray-500 bg-gray-100 p-3 text-xs">
          <p className="font-bold">
            {plural(orphans.length, 'file')} left over that no song uses,{' '}
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
            onClick={tidy}
            className="mt-2 border border-gray-500 bg-gray-200 px-3 py-1 disabled:opacity-50"
          >
            {busy ? 'Deleting…' : `Delete ${orphans.length}`}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-600">
          Everything stored belongs to a song — nothing to tidy up. Songs in the bin above still
          count, so their files are safe until you delete them for good.
        </p>
      )}
    </section>
  )
}

export default StoragePanel
