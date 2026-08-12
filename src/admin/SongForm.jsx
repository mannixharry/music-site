import { useCallback, useEffect, useRef, useState } from 'react'
import AudioPlayer from '../components/AudioPlayer'
import { toMediaSrc } from '../content/normalise'
import { formatTime } from '../format'
import { api } from './api'
import SnippetTrimmer from './SnippetTrimmer'
import UploadDropzone from './UploadDropzone'
import { isUploading } from './upload'
import { useUpload } from './useUpload'
import { useCoverUpload } from './useCoverUpload'

// A new song starts off the home page. It used to start on it, on the grounds
// that every song added so far had been a single; the catalogue since filled up
// with musicals' demos, so the common case is now a song that belongs in its
// record and nowhere else. The two mistakes are not the same size either — a
// song that should be on the front page and is not waits there quietly, while
// one that should not be is published to the first thing every visitor sees.
// The tick box is right there to set.
//
// An existing song's own value always wins — this is only the blank slate. Note
// that the D1 column already defaults to 0, so this is now the same answer from
// both ends rather than the form overriding the schema.
const BLANK = {
  title: '',
  kind: 'single',
  albumId: '',
  description: '',
  status: 'released',
  links: [],
  onHomepage: false,
  hiddenInAlbum: false,
  published: false,
  showSnippetTag: false,
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

// The preview, and everything you can do to it.
//
// Three states, because a song is in exactly one of them. The point of the
// middle one is that a preview is no longer a one-way door: both actions work
// from the master, which is the only copy of the full song there is, and which
// nothing else on the site can reach.
function PreviewControls({ song, fetching, transferring, onMake, onEdit, onRestore }) {
  // `transferring` as well as `fetching`: these buttons all end in start(),
  // and one already running means a second upload racing the first for the same
  // song's web_key. Whichever lost would leave its object behind.
  const busy = Boolean(fetching) || transferring

  if (!song.webKey) return null

  if (song.isSnippet) {
    return (
      <div className="mt-3 border border-gray-400 bg-white p-3">
        <p className="text-sm font-bold">The website is showing a snapshot of this song.</p>
        {song.snippetStart !== null && (
          <p className="mt-1 font-mono text-xs text-gray-600">
            {formatTime(song.snippetStart)}–{formatTime(song.snippetEnd)} of the full recording
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="border border-gray-500 bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
          >
            {fetching === 'edit' ? 'Loading your recording…' : 'Change the snapshot'}
          </button>
          <button
            type="button"
            onClick={onRestore}
            disabled={busy}
            className="border border-gray-500 bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
          >
            {fetching === 'full' ? 'Loading your recording…' : 'Put the whole song back'}
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-600">
          Both work from your original recording, which is saved and untouched — so you can
          change your mind as often as you like.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 border border-gray-400 bg-white p-3">
      <button
        type="button"
        onClick={onMake}
        disabled={busy}
        className="border border-gray-500 bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
      >
        {fetching === 'preview' ? 'Loading the audio…' : 'Put only a snapshot on the website'}
      </button>
      <p className="mt-2 text-xs text-gray-600">
        You choose which part. Only that part goes on the website, so nobody can download the
        whole song — and you can undo it afterwards.
      </p>
    </div>
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

// Whether "hide it inside the album" is a question worth asking. It only means
// anything for a song that is in an album *and* shown somewhere else: hiding a
// song from its record when the record is the only place it appears is simply
// unpublishing it, by a name that does not say so.
const canHide = (draft) => Boolean(draft.albumId) && draft.onHomepage

function SongForm({
  song,
  justCreated,
  albums,
  capabilities,
  mediaBase,
  onChanged,
  onCreated,
  onCancel,
}) {
  const [draft, setDraft] = useState(BLANK)
  // Audio pulled back down and waiting to be cut, with where the handles should
  // open. Nothing else ever waits here: an ordinary upload has nothing left to
  // decide, so it goes straight up.
  const [pending, setPending] = useState(null)
  // null | 'preview' | 'edit' | 'full' — which button is fetching, so only that
  // one says so.
  const [fetching, setFetching] = useState(null)
  // 'idle' | 'saving' | 'saved'. Saving is usually quicker than the eye, so
  // without the third state the button flickers and the change looks like it
  // may not have happened — which is the whole reason people press Save twice.
  //
  // A song that has just been created arrives already saved: the form is
  // re-keyed onto the new row the moment it exists, so the confirmation has to
  // start here rather than being set by the save that caused the remount.
  const [saveState, setSaveState] = useState(justCreated ? 'saved' : 'idle')
  const [error, setError] = useState(null)

  const savedTimer = useRef(null)
  useEffect(() => () => clearTimeout(savedTimer.current), [])

  // Keyed on the id, not the object. Every upload patches the song and
  // refreshes the list, which hands this a new object for the same song — and
  // resetting the draft on that threw away anything typed and not yet saved.
  // Nothing an upload writes belongs to this form anyway: it deals in titles,
  // links and flags, never in keys or durations.
  useEffect(() => {
    setDraft(song ? { ...BLANK, ...song, albumId: song.albumId ?? '' } : BLANK)
    setPending(null)
    setFetching(null)
    setError(null)
    // saveState is deliberately not reset here: this effect also runs on mount,
    // and a just-created song mounts already showing its confirmation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id])

  useEffect(() => {
    if (!justCreated) return
    const timer = setTimeout(() => setSaveState('idle'), 2500)
    return () => clearTimeout(timer)
  }, [justCreated])

  // Fetching audio back out of the catalogue so it can be worked on.
  //
  // Two sources, and which one matters. The published copy is small and is the
  // whole song *while the song is not a preview* — fine to cut from, and a few
  // megabytes. Once it is a preview the published copy is the cut, and the only
  // remaining copy of the full song is the master, which nothing but
  // /api/admin/master can reach. That is what makes a preview undoable.
  async function fetchAudio(what, url) {
    setFetching(what)
    setError(null)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Could not load the audio (${response.status})`)

      const blob = await response.blob()
      const name = url.split('/').pop() || 'audio'
      return new File([blob], name, { type: blob.type || 'audio/mpeg' })
    } catch (fetchError) {
      setError(fetchError.message)
      return null
    } finally {
      setFetching(null)
    }
  }

  const publishedUrl = () =>
    song.webKey.startsWith('/') ? song.webKey : `/api/media/${song.webKey}`

  const masterUrl = () => `/api/admin/master/${song.masterKey}`

  // Not yet a preview: the published copy is the whole song, so cut from that
  // rather than pulling down a master that may be ten times the size.
  async function makePreview() {
    const file = await fetchAudio('preview', publishedUrl())
    if (file) setPending({ file, initialRange: null })
  }

  // Already a preview: only the master still has the parts that were cut away.
  // The handles open where they were left.
  async function editPreview() {
    const file = await fetchAudio('edit', masterUrl())
    if (!file) return
    setPending({
      file,
      initialRange:
        song.snippetStart === null ? null : { start: song.snippetStart, end: song.snippetEnd },
    })
  }

  // Straight back to the whole thing — no trimmer, nothing to decide. Goes
  // through the ordinary upload path, so a master that is already streamable is
  // published as-is and anything else is converted.
  async function restoreWholeSong() {
    const file = await fetchAudio('full', masterUrl())
    if (file) start(file, null, { archiveMaster: false })
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

  // Neither Save nor Delete while bytes are still moving.
  //
  // Deleting is the one that loses something: the bytes are already in R2, and
  // the patch that was going to record them fails on a row that is no longer
  // there, leaving a file nothing points at.
  //
  // Saving writes different columns, so it cannot corrupt the row — but an
  // upload finishing patches the song and refetches it, and a Save landing in
  // the middle of that says "Saved ✓" over a song whose file has not arrived.
  // The confirmation is the thing at stake: it should mean the song is as it
  // appears, and while a file is in flight it does not.
  //
  // Cancelling stays available throughout: the upload carries on and records
  // itself either way.
  const transferring = isUploading(status) || isUploading(cover.status)

  async function save() {
    clearTimeout(savedTimer.current)
    setSaveState('saving')
    setError(null)
    try {
      const payload = {
        title: draft.title,
        albumId: draft.albumId || null,
        description: draft.description,
        status: draft.status,
        links: draft.links.filter((link) => link.label && link.href),
        onHomepage: draft.onHomepage,
        // Written out rather than left alone, for the reason NOT_A_SNIPPET
        // exists in useUpload: the tick box below is only offered while the
        // song is in an album and on the home page, so a song taken off the
        // home page — or out of the album — would otherwise keep a flag saying
        // its record leaves it out, and disappear from that record the day it
        // was put back.
        hiddenInAlbum: canHide(draft) && draft.hiddenInAlbum,
        published: draft.published,
        showSnippetTag: draft.showSnippetTag,
      }

      // Creating hands the form straight on to the song it just made, rather
      // than closing and leaving you to find it in the list — the audio and
      // artwork sections only exist once the row does, so the moment after
      // saving is exactly when they are wanted.
      if (!song) {
        const { song: created } = await api.create(payload)
        // Before handing over, so the new row is in the list by the time the
        // selection points at it — otherwise the form blinks out and back.
        await onChanged()
        return onCreated(created.id)
      }

      await api.update(song.id, payload)
      await onChanged()

      // Held long enough to be read, then back to Save so the button never
      // sits there claiming something that has since been edited again.
      setSaveState('saved')
      savedTimer.current = setTimeout(() => setSaveState('idle'), 2500)
    } catch (saveError) {
      setError(saveError.message)
      setSaveState('idle')
    }
  }

  async function remove() {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${song.title}"? It can be restored from the database.`)) return
    setSaveState('saving')
    try {
      await api.remove(song.id)
      await onChanged()
      onCancel()
    } catch (deleteError) {
      setError(deleteError.message)
      setSaveState('idle')
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

        {/* What the song belongs to, and only that. It used to be the answer to
            two questions — the home page showed whatever was in no album — so
            putting a track from a record on the front page meant taking it out
            of the record. "Show on the home page" below is now the other
            question, and the two no longer have to agree. */}
        <Field label="Album" hint="a musical is an album too — leave it blank for a standalone song">
          <select
            className={inputClass}
            value={draft.albumId}
            onChange={(event) => set({ albumId: event.currentTarget.value })}
          >
            <option value="">No album — a song on its own</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.title}
                {album.kind === 'musical' ? ' (musical)' : ''}
                {album.published ? '' : ' — draft'}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description" hint="optional — appears under the title on the Songs page">
          <textarea
            rows={3}
            className={inputClass}
            value={draft.description}
            onChange={(event) => set({ description: event.currentTarget.value })}
          />
        </Field>

        {/* "Coming soon" is drawn by the home page's rows and nowhere else, so
            this follows the home page rather than the album — it used to be
            gated on `kind === 'single'`, which was the same set of songs until
            0007 and is not any more. */}
        {draft.onHomepage && (
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

        <Field label="Links" hint="Spotify, Apple Music, anywhere else">
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
                      This is the snapshot. Your full recording is safe.
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

              {/* Either the trimmer is open, or it is not. When it is, it is
                  the only thing here: choosing a cut is a decision that wants
                  the whole block, not a corner of it. */}
              {pending ? (
                <SnippetTrimmer
                  file={pending.file}
                  initialRange={pending.initialRange}
                  onCancel={() => setPending(null)}
                  onConfirm={(range) => {
                    const { file } = pending
                    setPending(null)
                    // Never archived as a master: this audio came *from* the
                    // catalogue, and filing it as the original would replace a
                    // pointer to Frank's recording with one to a copy of itself.
                    start(file, range, { archiveMaster: false })
                  }}
                />
              ) : (
                <>
                  <UploadDropzone
                    status={status}
                    onFile={start}
                    onReset={reset}
                    currentBytes={song.webBytes}
                    hasMaster={Boolean(song.masterKey)}
                  />

                  {/* Only once there is a master to work from. Without one
                      there is no full song to cut down or put back, and
                      offering either would be a button that cannot work. */}
                  {song.masterKey && (
                    <PreviewControls
                      song={song}
                      fetching={fetching}
                      transferring={transferring}
                      onMake={makePreview}
                      onEdit={editPreview}
                      onRestore={restoreWholeSong}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <p className="border border-gray-300 bg-gray-100 p-3 text-xs">
              Save the song first, then you can add the audio.
            </p>
          )}
        </Block>

        {/* Offered whatever the song belongs to: every listing on the site
            draws a sleeve now, so there is no longer a type of song for which
            this would go unused. Without one, the album's cover is shown. */}
        <Field
          label="Cover art"
          hint="optional — a song without its own uses its album's"
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
              Save the song first, then you can add the artwork.
            </p>
          )}
        </Field>

        {/* Where the song is shown, which is no longer decided by what it
            belongs to. A track from a record can be on the front page and stay
            in the record — /songs still files it under the album either way. */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.onHomepage}
            onChange={(event) => set({ onHomepage: event.currentTarget.checked })}
          />
          <span className="font-bold">Show on the home page</span>
          <span className="text-xs text-gray-600">
            in the Music list, whatever album it is in
          </span>
        </label>

        {/* The other half of the question above, and only asked once the answer
            to it is yes: a snapshot cut from a record can go on the front page
            without appearing in the record beside the whole track it came from.
            Indented under it because it is a qualification of that tick, not a
            setting of its own — and it disappears with it, which is also what
            the payload does with the value. The song still belongs to the
            album, is still named under it, and the now-playing strip still
            offers the way through. */}
        {canHide(draft) && (
          <label className="ml-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.hiddenInAlbum}
              onChange={(event) => set({ hiddenInAlbum: event.currentTarget.checked })}
            />
            <span className="whitespace-nowrap font-bold">Hide it in the album</span>
            <span className="text-xs text-gray-600">
              keeps it out of the album’s own list of songs
            </span>
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(event) => set({ published: event.currentTarget.checked })}
          />
          <span className="font-bold">Published</span>
          <span className="text-xs text-gray-600">unticked, only you can see it</span>
        </label>

        {/* Only for a song that is actually a preview — on anything else it
            would be a switch with nothing behind it. Off by default, so a demo
            everyone already understands to be an extract is not labelled as
            one, and a single cut to thirty seconds can be. */}
        {song?.isSnippet && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.showSnippetTag}
              onChange={(event) => set({ showSnippetTag: event.currentTarget.checked })}
            />
            <span className="font-bold">Mark it as a snapshot</span>
            <span className="text-xs text-gray-600">
              shows a small “Snapshot” label beside the title
            </span>
          </label>
        )}

        {error && <p className="border border-gray-500 bg-gray-100 p-2 text-sm">{error}</p>}

        <div className="flex items-center gap-3 border-t border-gray-300 pt-4">
          <button
            type="button"
            onClick={save}
            disabled={saveState === 'saving' || transferring || !draft.title.trim()}
            // Said on the button rather than left to a hover: a control that
            // has gone grey with no reason given reads as broken, and this one
            // goes grey exactly when someone has just done something.
            title={transferring ? 'Wait for the upload to finish first' : undefined}
            className={`border px-3 py-1 text-sm disabled:opacity-50 ${
              saveState === 'saved'
                ? 'border-gray-700 bg-gray-700 text-white'
                : 'border-gray-500 bg-gray-200'
            }`}
          >
            {transferring
              ? 'Waiting for the upload…'
              : ({ saving: 'Saving…', saved: 'Saved ✓' }[saveState] ?? 'Save')}
          </button>
          <button type="button" onClick={onCancel} className="text-sm underline">
            Cancel
          </button>
          {song && (
            <button
              type="button"
              onClick={remove}
              disabled={transferring}
              title={transferring ? 'Wait for the upload to finish first' : undefined}
              className="ml-auto text-sm underline disabled:no-underline disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SongForm
