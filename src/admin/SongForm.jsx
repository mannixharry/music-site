import { useCallback, useEffect, useState } from 'react'
import AudioPlayer from '../components/AudioPlayer'
import { toMediaSrc } from '../content/normalise'
import { api } from './api'
import SnippetControls from './SnippetControls'
import SnippetTrimmer from './SnippetTrimmer'
import UploadDropzone from './UploadDropzone'
import { useUpload } from './useUpload'
import { useCoverUpload } from './useCoverUpload'

const BLANK = {
  title: '',
  kind: 'single',
  musicalSlug: '',
  description: '',
  status: 'released',
  links: [],
  published: false,
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      {hint && <span className="ml-2 text-xs text-gray-600">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  )
}

// Field's twin, as a <div>. For a block that carries its own labelled controls
// — nesting a label inside a label is invalid, and leaves which one a click
// activates up to the browser.
function Block({ label, hint, children }) {
  return (
    <div>
      <span className="text-sm font-bold">{label}</span>
      {hint && <span className="ml-2 text-xs text-gray-600">{hint}</span>}
      <div className="mt-1">{children}</div>
    </div>
  )
}

const inputClass = 'w-full border border-gray-400 bg-white px-2 py-1 text-sm'

function SongForm({ song, musicals, capabilities, mediaBase, onChanged, onCancel }) {
  const [draft, setDraft] = useState(BLANK)
  // Whether the next upload publishes a cut. Deliberately not read back off the
  // song: a song that is already a preview is far likelier to be getting its
  // full version than the same crop a second time.
  const [cropping, setCropping] = useState(false)
  // A file chosen but not sent, and where it came from. Only previews wait
  // here — an ordinary upload has nothing left to decide, so it goes straight
  // up. `archiveMaster` is false for the site's own copy, which must not be
  // filed as if it were Frank's original.
  const [pending, setPending] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setDraft(song ? { ...BLANK, ...song, musicalSlug: song.musicalSlug ?? '' } : BLANK)
    setCropping(false)
    setPending(null)
    setError(null)
  }, [song])

  // Loads the audio already published for this song into the trimmer, so a
  // preview can be cut without hunting down the original file again — which is
  // the usual case, since every song here already has audio on the site.
  //
  // Fetched from /api/media/, not from the media domain: that is same-origin in
  // both environments, so no CORS rule has to exist for it, and it serves the
  // same public bucket the site already reads.
  async function trimWhatIsOnTheSite() {
    setFetching(true)
    setError(null)
    try {
      const key = song.webKey
      const response = await fetch(key.startsWith('/') ? key : `/api/media/${key}`)
      if (!response.ok) throw new Error(`Could not fetch the site's copy (${response.status})`)

      const blob = await response.blob()
      const name = key.split('/').pop() || 'audio.mp3'
      setPending({
        file: new File([blob], name, { type: blob.type || 'audio/mpeg' }),
        archiveMaster: false,
      })
    } catch (fetchError) {
      setError(fetchError.message)
    } finally {
      setFetching(false)
    }
  }

  const set = (fields) => setDraft((current) => ({ ...current, ...fields }))

  // Uploads patch the song directly rather than waiting for Save, because the
  // point of recording the master early is that it survives everything after it.
  const patch = useCallback(
    async (fields) => {
      await api.update(song.id, fields)
      await onChanged()
    },
    [song, onChanged],
  )

  const { status, start, reset } = useUpload({ songId: song?.id, capabilities, patch })
  const cover = useCoverUpload({ songId: song?.id, capabilities, patch })

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: draft.title,
        kind: draft.kind,
        musicalSlug: draft.kind === 'demo' ? draft.musicalSlug : null,
        description: draft.description,
        status: draft.status,
        links: draft.links.filter((link) => link.label && link.href),
        published: draft.published,
      }

      if (song) await api.update(song.id, payload)
      else await api.create(payload)

      await onChanged()
      if (!song) onCancel()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${song.title}"? It can be restored from the database.`)) return
    setSaving(true)
    try {
      await api.remove(song.id)
      await onChanged()
      onCancel()
    } catch (deleteError) {
      setError(deleteError.message)
      setSaving(false)
    }
  }

  return (
    <div className="border border-gray-400 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{song ? 'Edit song' : 'New song'}</h2>
        {song && <span className="font-mono text-xs text-gray-600">{song.id}</span>}
      </div>

      <div className="mt-4 space-y-4">
        <Field label="Title">
          <input
            className={inputClass}
            value={draft.title}
            onChange={(event) => set({ title: event.currentTarget.value })}
          />
        </Field>

        <Field label="Type">
          <div className="flex gap-4 text-sm">
            {[
              ['single', 'Single'],
              ['demo', 'From a musical'],
              ['other', 'Other'],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="kind"
                  checked={draft.kind === value}
                  onChange={() => set({ kind: value })}
                />
                {label}
              </label>
            ))}
          </div>
        </Field>

        {draft.kind === 'demo' && (
          <Field label="Musical">
            <select
              className={inputClass}
              value={draft.musicalSlug}
              onChange={(event) => set({ musicalSlug: event.currentTarget.value })}
            >
              <option value="">Choose one…</option>
              {musicals.map((musical) => (
                <option key={musical.slug} value={musical.slug}>
                  {musical.title}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Description" hint="optional — shown under the title on /songs">
          <textarea
            rows={3}
            className={inputClass}
            value={draft.description}
            onChange={(event) => set({ description: event.currentTarget.value })}
          />
        </Field>

        {draft.kind === 'single' && (
          <Field label="Status">
            <select
              className={inputClass}
              value={draft.status}
              onChange={(event) => set({ status: event.currentTarget.value })}
            >
              <option value="released">Released</option>
              <option value="coming-soon">Coming soon</option>
            </select>
          </Field>
        )}

        <Field label="Links" hint="Spotify, Bandcamp, anywhere else">
          <div className="space-y-2">
            {draft.links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className={`${inputClass} w-32`}
                  placeholder="Label"
                  value={link.label}
                  onChange={(event) => {
                    const links = [...draft.links]
                    links[index] = { ...link, label: event.currentTarget.value }
                    set({ links })
                  }}
                />
                <input
                  className={inputClass}
                  placeholder="https://…"
                  value={link.href}
                  onChange={(event) => {
                    const links = [...draft.links]
                    links[index] = { ...link, href: event.currentTarget.value }
                    set({ links })
                  }}
                />
                <button
                  type="button"
                  className="border border-gray-400 px-2 text-sm"
                  onClick={() => set({ links: draft.links.filter((_, i) => i !== index) })}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm underline"
              onClick={() => set({ links: [...draft.links, { label: 'Spotify', href: '' }] })}
            >
              Add a link
            </button>
          </div>
        </Field>

        <Block label="Audio">
          {song ? (
            <>
              {song.webKey && (
                <div className="mb-3">
                  {song.isSnippet && (
                    <p className="mb-1 text-xs text-gray-600">
                      What is on the site is a preview. The master is whole.
                    </p>
                  )}
                  <AudioPlayer
                    id={`admin-${song.id}`}
                    src={toMediaSrc(song.webKey, mediaBase)}
                    title={song.title}
                    duration={song.duration}
                  />
                </div>
              )}

              <SnippetControls
                enabled={cropping}
                onChange={(next) => {
                  setCropping(next)
                  // Turning it off with a file waiting would otherwise leave
                  // that file stranded behind a trimmer nothing renders.
                  setPending(null)
                }}
                current={
                  song.isSnippet && song.snippetStart !== null
                    ? { start: song.snippetStart, end: song.snippetEnd }
                    : null
                }
              />

              {pending ? (
                <SnippetTrimmer
                  file={pending.file}
                  onCancel={() => setPending(null)}
                  onConfirm={(range) => {
                    setPending(null)
                    start(pending.file, range, { archiveMaster: pending.archiveMaster })
                  }}
                />
              ) : (
                <>
                  {/* The common case by a distance: the song already has audio,
                      and re-cutting it should not mean finding the original
                      file again. Offered first, because being sent to a
                      dropzone for a file the site already holds is what made
                      this look broken. */}
                  {cropping && song.webKey && !song.isSnippet && (
                    <div className="mb-3 border border-gray-400 bg-white p-3">
                      <button
                        type="button"
                        onClick={trimWhatIsOnTheSite}
                        disabled={fetching}
                        className="border border-gray-500 bg-gray-200 px-3 py-1 text-sm font-bold disabled:opacity-50"
                      >
                        {fetching ? 'Fetching…' : 'Cut a preview from the audio already here'}
                      </button>
                      <p className="mt-2 text-xs text-gray-600">
                        Uses the copy on the site, so there is nothing to find or re-upload. It
                        gets encoded a second time, which costs a little quality — drop the
                        master below instead if you want the best the preview can sound. The
                        master on file is left exactly as it is either way.
                      </p>
                    </div>
                  )}

                  {cropping && song.isSnippet && (
                    <p className="mb-3 border border-gray-400 bg-white p-3 text-xs">
                      The site only holds the preview for this song, so there is nothing here to
                      re-cut. Drop the full song below to choose a different preview from it.
                    </p>
                  )}

                  <UploadDropzone
                    // A preview stops at the trimmer. Everything else is
                    // already decided, so it goes straight up as it always has.
                    variant={cropping ? 'audio-preview' : 'audio'}
                    status={status}
                    onFile={(file) =>
                      cropping ? setPending({ file, archiveMaster: true }) : start(file)
                    }
                    onReset={reset}
                    currentBytes={song.webBytes}
                    hasMaster={Boolean(song.masterKey)}
                  />
                </>
              )}
            </>
          ) : (
            <p className="border border-gray-300 bg-gray-100 p-3 text-xs">
              Save the song first — the audio is filed under its name, so that has to exist
              before there is anywhere to put it.
            </p>
          )}
        </Block>

        {/* Offered whatever the song's type is, and the hint says why: only the
            home page draws covers, but art uploaded now survives a song being
            changed into a single later. */}
        <Field
          label="Cover art"
          hint={
            draft.kind === 'single'
              ? 'optional — shown beside the song on the home page'
              : 'optional — kept, but only shown once this is a single'
          }
        >
          {song ? (
            <>
              {song.coverKey && (
                <div className="mb-2 flex items-start gap-3">
                  <img
                    src={toMediaSrc(song.coverKey, mediaBase)}
                    alt={`Cover art for ${song.title}`}
                    className="aspect-square w-24 shrink-0 border border-gray-300 object-cover"
                  />
                  <button
                    type="button"
                    onClick={cover.clear}
                    className="text-sm underline"
                  >
                    Remove
                  </button>
                </div>
              )}
              <UploadDropzone
                variant="image"
                status={cover.status}
                onFile={cover.start}
                onReset={cover.reset}
                currentBytes={song.coverBytes}
                hasMaster={Boolean(song.coverMasterKey)}
                masterLabel="original"
              />
            </>
          ) : (
            <p className="border border-gray-300 bg-gray-100 p-3 text-xs">
              Save the song first — the art is filed under its name, same as the audio.
            </p>
          )}
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(event) => set({ published: event.currentTarget.checked })}
          />
          <span className="font-bold">Published</span>
          <span className="text-xs text-gray-600">unticked, only you can see it</span>
        </label>

        {error && <p className="border border-gray-500 bg-gray-100 p-2 text-sm">{error}</p>}

        <div className="flex items-center gap-3 border-t border-gray-300 pt-4">
          <button
            type="button"
            onClick={save}
            disabled={saving || !draft.title.trim()}
            className="border border-gray-500 bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="text-sm underline">
            Cancel
          </button>
          {song && (
            <button type="button" onClick={remove} className="ml-auto text-sm underline">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SongForm
