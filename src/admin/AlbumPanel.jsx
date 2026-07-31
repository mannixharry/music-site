import { useState } from 'react'
import { api } from './api'
import UploadDropzone from './UploadDropzone'
import { useCoverUpload } from './useCoverUpload'
import { isUploading } from './upload'
import { toMediaSrc } from '../content/normalise'

const inputClass = 'w-full border border-gray-400 bg-white px-2 py-1 text-sm'

// Managing albums: the records and musicals songs are filed under.
//
// A grouping with a cover, and little else — the editorial copy for a musical
// (its synopsis, its downloads, and its notice if it has one) lives in
// src/content/musicals.js, matched to an album by id, because none of it is
// something Frank edits. So there is nothing here to write a synopsis in, and
// that is deliberate rather than missing.
//
// It sits under the song list rather than in a page of its own: albums are
// created rarely and read constantly, and having them on screen while editing a
// song is what makes the song form's album picker useful.
function AlbumPanel({ albums, mediaBase, capabilities, onChanged }) {
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function run(work) {
    setBusy(true)
    setError(null)
    try {
      await work()
      await onChanged()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-10 border-t border-gray-300 pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-widest text-gray-600">Albums</h2>
        <button
          type="button"
          onClick={() => {
            setCreating((open) => !open)
            setOpenId(null)
          }}
          disabled={busy}
          className="border border-gray-500 bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
        >
          {creating ? 'Cancel' : 'New album'}
        </button>
      </div>

      <p className="mt-2 text-sm text-gray-600">
        A record or a musical. Songs filed under one are listed together on the site and take its
        artwork unless they carry their own.
      </p>

      {error && <p className="mt-3 border border-gray-500 bg-gray-100 p-2 text-sm">{error}</p>}

      {creating && (
        <NewAlbum
          onCancel={() => setCreating(false)}
          onCreate={(input) =>
            run(async () => {
              const { album } = await api.createAlbum(input)
              setCreating(false)
              setOpenId(album.id)
            })
          }
        />
      )}

      {albums.length === 0 && !creating && (
        <p className="mt-4 text-sm text-gray-600">
          None yet. Every song is a single until there is one.
        </p>
      )}

      <div className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
        {albums.map((album, index) => (
          <AlbumRow
            key={album.id}
            album={album}
            open={openId === album.id}
            first={index === 0}
            last={index === albums.length - 1}
            busy={busy}
            mediaBase={mediaBase}
            capabilities={capabilities}
            onToggle={() => setOpenId((current) => (current === album.id ? null : album.id))}
            onPatch={(patch) => run(() => api.updateAlbum(album.id, patch))}
            onMove={(afterId) => run(() => api.moveAlbum(album.id, afterId))}
            onDelete={() => run(() => api.removeAlbum(album.id))}
            neighbourAbove={albums[index - 2]?.id ?? null}
            neighbourBelow={albums[index + 1]?.id ?? null}
            onChanged={onChanged}
          />
        ))}
      </div>
    </section>
  )
}

function NewAlbum({ onCreate, onCancel }) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('album')

  return (
    <div className="mt-4 border border-gray-400 bg-gray-100 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-sm">
          <span className="block text-xs uppercase tracking-wide text-gray-600">Title</span>
          <input
            autoFocus
            className={`${inputClass} mt-1`}
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
        </label>

        <label className="text-sm">
          <span className="block text-xs uppercase tracking-wide text-gray-600">Kind</span>
          <select
            className={`${inputClass} mt-1`}
            value={kind}
            onChange={(event) => setKind(event.currentTarget.value)}
          >
            <option value="album">Album</option>
            <option value="musical">Musical</option>
          </select>
        </label>

        <button
          type="button"
          disabled={!title.trim()}
          onClick={() => onCreate({ title: title.trim(), kind, published: false })}
          className="border border-gray-500 bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
        >
          Create
        </button>
        <button type="button" onClick={onCancel} className="text-sm underline">
          Cancel
        </button>
      </div>

      {/* Said before it is chosen rather than after: a musical picks its
          synopsis, downloads and notice out of the repo by matching this
          album's id, so the two have to be set up together and it is not
          something the admin can finish on its own. */}
      {kind === 'musical' && (
        <p className="mt-2 text-sm text-gray-600">
          A musical also needs its synopsis and downloads adding to
          <span className="font-mono"> src/content/musicals.js</span>, matched to this album&apos;s
          id — until then it appears on the songs page but not on{' '}
          <span className="font-mono">/musicals</span>.
        </p>
      )}
    </div>
  )
}

function AlbumRow({
  album,
  open,
  first,
  last,
  busy,
  mediaBase,
  capabilities,
  onToggle,
  onPatch,
  onMove,
  onDelete,
  neighbourAbove,
  neighbourBelow,
  onChanged,
}) {
  const [confirming, setConfirming] = useState(false)

  // The song pipeline, unchanged: the original to the private bucket, a resized
  // copy to the public one. The path segment is prefixed because an album and a
  // song may share a slug — there is an album called "pigs" and a song called
  // "Pigs" — and `covers/pigs/…` would then say nothing about which is which.
  const cover = useCoverUpload({
    songId: `album-${album.id}`,
    capabilities,
    patch: async (fields) => {
      await api.updateAlbum(album.id, fields)
      await onChanged()
    },
  })

  const transferring = isUploading(cover.status)

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          // Same hover as a song row in SongList. These two lists sit one above
          // the other and behave identically — a row you click to open — so
          // only one of them saying so was the sort of difference that reads as
          // carelessness without being obvious enough to name.
          className="min-w-0 flex-1 text-left text-sm hover:underline"
        >
          <span className="font-bold">{album.title}</span>{' '}
          <span className="text-gray-600">
            {album.kind === 'musical' ? 'musical' : 'album'}
            {album.published ? '' : ' · draft'}
            {album.coverKey ? '' : ' · no artwork'}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`Move ${album.title} up`}
            disabled={busy || first}
            onClick={() => onMove(neighbourAbove)}
            className="border border-gray-400 bg-white px-2 text-xs disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Move ${album.title} down`}
            disabled={busy || last}
            onClick={() => onMove(neighbourBelow)}
            className="border border-gray-400 bg-white px-2 text-xs disabled:opacity-30"
          >
            ↓
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3 border-l-2 border-gray-300 pl-3">
          <label className="text-sm">
            <span className="block text-xs uppercase tracking-wide text-gray-600">Title</span>
            <input
              className={`${inputClass} mt-1`}
              defaultValue={album.title}
              onBlur={(event) => {
                const title = event.currentTarget.value.trim()
                if (title && title !== album.title) onPatch({ title })
              }}
            />
          </label>

          <label className="text-sm">
            <span className="block text-xs uppercase tracking-wide text-gray-600">
              Subtitle <span className="normal-case text-gray-600">— optional, shown under the title</span>
            </span>
            <input
              className={`${inputClass} mt-1`}
              defaultValue={album.subtitle}
              onBlur={(event) => {
                const subtitle = event.currentTarget.value
                if (subtitle !== album.subtitle) onPatch({ subtitle })
              }}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={album.published}
              onChange={(event) => onPatch({ published: event.currentTarget.checked })}
            />
            On the website
          </label>

          <div>
            <span className="block text-xs uppercase tracking-wide text-gray-600">Artwork</span>
            <p className="mt-1 text-sm text-gray-600">
              Every song in this album shows this unless it has its own.
            </p>
            {album.coverKey && (
              <div className="mt-2 flex items-start gap-3">
                <img
                  src={toMediaSrc(album.coverKey, mediaBase)}
                  alt={`Cover art for ${album.title}`}
                  className="aspect-square w-24 shrink-0 border border-gray-300 object-cover"
                />
                <button type="button" onClick={cover.clear} className="text-sm underline">
                  Remove
                </button>
              </div>
            )}

            <div className="mt-2">
              <UploadDropzone
                variant="image"
                status={cover.status}
                onFile={cover.start}
                onReset={cover.reset}
                currentBytes={album.coverBytes}
                hasMaster={Boolean(album.coverMasterKey)}
                masterLabel="original"
              />
            </div>
          </div>

          {confirming ? (
            <p className="text-sm">
              Delete <span className="font-bold">{album.title}</span>? Its songs are kept and become
              singles.{' '}
              <button
                type="button"
                disabled={busy || transferring}
                onClick={() => onDelete()}
                className="underline disabled:opacity-50"
              >
                Delete it
              </button>{' '}
              <button type="button" onClick={() => setConfirming(false)} className="underline">
                Keep it
              </button>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy || transferring}
              title={transferring ? 'Wait for the upload to finish first' : undefined}
              className="self-start text-sm underline disabled:no-underline disabled:opacity-50"
            >
              Delete album
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default AlbumPanel
