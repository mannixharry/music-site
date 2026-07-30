import { useCallback, useEffect, useMemo, useState } from 'react'
import AudioPlayer from '../components/AudioPlayer'
import { toMediaSrc } from '../content/normalise'
import { api } from './api'
import SnippetControls from './SnippetControls'
import { formatTime, toRange } from './snippet'
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

// Thirty seconds from the top, which is what a preview usually wants to be.
// Deliberately not read back off the song: this describes the next upload, and
// a song that is already a preview is far more likely to be getting its full
// version than the same crop twice.
const NO_SNIPPET = { enabled: false, start: '0:00', length: '0:30' }

function SongForm({ song, musicals, capabilities, mediaBase, onChanged, onCancel }) {
  const [draft, setDraft] = useState(BLANK)
  const [snippet, setSnippet] = useState(NO_SNIPPET)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setDraft(song ? { ...BLANK, ...song, musicalSlug: song.musicalSlug ?? '' } : BLANK)
    setSnippet(NO_SNIPPET)
    setError(null)
  }, [song])

  // Memoised because useUpload holds it in a dependency list: rebuilding the
  // object on every keystroke would rebuild the upload callback with it.
  const range = useMemo(() => toRange(snippet), [snippet])

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

  const { status, start, reset } = useUpload({
    songId: song?.id,
    capabilities,
    patch,
    snippet: range,
  })
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
                snippet={snippet}
                range={range}
                onChange={setSnippet}
                current={
                  song.isSnippet && song.snippetStart !== null
                    ? { start: song.snippetStart, end: song.snippetEnd }
                    : null
                }
              />

              {/* Withheld rather than disabled while the times are unreadable.
                  A dropzone that takes the file and then publishes the whole
                  song because it could not work out where to cut would be the
                  one failure this feature must not have. */}
              {snippet.enabled && !range ? null : (
                <UploadDropzone
                  status={status}
                  onFile={start}
                  onReset={reset}
                  currentBytes={song.webBytes}
                  hasMaster={Boolean(song.masterKey)}
                  describe={
                    range
                      ? async () => `cut to ${formatTime(range.start)}–${formatTime(range.end)}`
                      : undefined
                  }
                />
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
