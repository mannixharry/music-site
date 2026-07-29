import { useCallback, useEffect, useState } from 'react'
import AudioPlayer from '../components/AudioPlayer'
import { toAudioSrc } from '../content/normalise'
import { api } from './api'
import UploadDropzone from './UploadDropzone'
import { useUpload } from './useUpload'

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

const inputClass = 'w-full border border-gray-400 bg-white px-2 py-1 text-sm'

function SongForm({ song, musicals, capabilities, mediaBase, onChanged, onCancel }) {
  const [draft, setDraft] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setDraft(song ? { ...BLANK, ...song, musicalSlug: song.musicalSlug ?? '' } : BLANK)
    setError(null)
  }, [song])

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

        <Field label="Audio">
          {song ? (
            <>
              {song.webKey && (
                <div className="mb-2">
                  <AudioPlayer
                    id={`admin-${song.id}`}
                    src={toAudioSrc(song.webKey, mediaBase)}
                    title={song.title}
                    duration={song.duration}
                  />
                </div>
              )}
              <UploadDropzone
                status={status}
                onFile={start}
                onReset={reset}
                currentBytes={song.webBytes}
                hasMaster={Boolean(song.masterKey)}
              />
            </>
          ) : (
            <p className="border border-gray-300 bg-gray-100 p-3 text-xs">
              Save the song first — the audio is filed under its name, so that has to exist
              before there is anywhere to put it.
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
