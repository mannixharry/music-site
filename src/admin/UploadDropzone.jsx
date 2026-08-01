import { useId, useRef, useState } from 'react'
import { formatBytes } from '../format'
import { ACCEPTED, canUseDirectly, isUploading } from './upload'
import { ACCEPTED_IMAGES, TARGET_SIZE } from './cover'

// The dimensions of the picture that comes out the other end, read from the
// resizer rather than typed here — asking for a size the code does not produce
// is worse than saying nothing. It is a centre crop to a square, and it never
// upscales, so anything shorter than this on its narrow edge ends up smaller
// than the site is built to draw.
const COVER_SPEC = `${TARGET_SIZE}×${TARGET_SIZE}px`

// What a chosen image actually is, and whether that is enough. Answered by
// decoding it, which is why `describe` is async.
async function describeImage(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    bitmap.close()

    const edge = Math.min(width, height)
    const note = `${width}×${height}`

    // The one thing worth warning about. Cropping and shrinking are invisible;
    // being handed a 400px picture to draw at 1000 is not, and it is the only
    // case that cannot be fixed after the fact without the original file.
    if (edge < TARGET_SIZE) {
      return `${note} — smaller than ${COVER_SPEC}, so it will look soft`
    }
    return width === height ? `${note} — square already` : `${note} — will be cropped square`
  } catch {
    // Some AVIFs and progressive JPEGs refuse to decode here and upload fine.
    return 'will be cropped square'
  }
}

function Bar({ ratio }) {
  return (
    <div className="mt-2 h-2 w-full border border-gray-400 bg-white">
      <div className="h-full bg-gray-600" style={{ width: `${Math.round(ratio * 100)}%` }} />
    </div>
  )
}

// The two things Frank uploads differ in the wording and in what "already fine
// as it is" means, and in nothing else — so they share the component and differ
// by this table rather than by conditionals scattered through the markup.
//
// `describe` is async for images, where answering it means decoding the file to
// read its dimensions. Audio can answer from the name and size alone, but both
// are awaited so there is only one path through the code.
const VARIANTS = {
  audio: {
    accept: ACCEPTED,
    prompt: 'Drop an audio file here, or click to choose one',
    hint: 'MP3, M4A, WAV, AIFF, FLAC or OGG. Upload the best quality you have — a smaller version is made for the website automatically.',
    describe: async (file) => (canUseDirectly(file) ? 'ready to use' : 'will be converted'),
  },
  image: {
    accept: ACCEPTED_IMAGES,
    prompt: 'Drop the cover art here, or click to choose it',
    hint: `Square, ${COVER_SPEC} or larger. JPEG, PNG, WebP or AVIF. A picture that is not square is cropped from the centre, and a larger one is scaled down — so bigger is safe and smaller is not. Your original is kept either way.`,
    describe: describeImage,
  },
}

function UploadDropzone({
  variant = 'audio',
  status,
  onFile,
  onReset,
  currentBytes,
  hasMaster,
  masterLabel = 'master',
}) {
  const { accept, prompt, hint, describe } = VARIANTS[variant]

  const inputRef = useRef(null)
  // Two dropzones sit on the same page — audio and artwork — so the id that
  // ties this label to its input has to be unique per instance.
  const inputId = useId()
  const [over, setOver] = useState(false)
  const [pending, setPending] = useState(null)
  const [note, setNote] = useState('')

  const busy = isUploading(status)

  function choose(file) {
    if (!file) return
    setPending(file)
    setNote('')
    // Best-effort: the note is a courtesy, and a file this cannot describe is
    // still a file the upload may well handle.
    describe(file).then(setNote, () => setNote(''))
    onFile(file)
  }

  return (
    <div>
      {/* A label pointing at the input, rather than a div calling .click() on
          it, and the difference is not cosmetic — it is the whole of a bug that
          was deleting artwork.

          Opening the picker from inside a click handler splits the gesture:
          Chrome delivers the mousedown, the handler opens a modal dialog, and
          the mouseup is held until that dialog closes. Dismissing it releases
          the mouseup, which becomes a SECOND trusted click at the same
          coordinates — by which time the form has reflowed and those
          coordinates are over the Remove button beside the artwork. Its handler
          clears cover_key and cover_master_key, and the Worker then deletes
          both objects. Pressing Cancel in the file picker destroyed the cover
          and the original behind it, with no confirmation and nothing to
          restore from.

          A label opens the picker as part of the browser's own handling of the
          gesture, so there is no second click to land anywhere. Verified: one
          trusted click, no stray dispatch, artwork intact. */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => choose(event.currentTarget.files[0])}
      />

      <label
        htmlFor={busy ? undefined : inputId}
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          if (!busy) choose(event.dataTransfer.files[0])
        }}
        className={`block cursor-pointer border border-dashed p-4 text-center text-sm ${
          over ? 'border-gray-600 bg-gray-200' : 'border-gray-400 bg-gray-100'
        } ${busy ? 'cursor-wait opacity-60' : ''}`}
      >
        {busy ? (
          <>
            <p>{status.message}</p>
            <Bar ratio={status.ratio} />
            <p className="mt-1 font-mono text-xs">{Math.round(status.ratio * 100)}%</p>
          </>
        ) : (
          <>
            <p>{prompt}</p>
            <p className="mt-1 text-xs text-gray-600">{hint}</p>
          </>
        )}
      </label>

      {pending && !busy && (
        <p className="mt-2 font-mono text-xs">
          {pending.name} · {formatBytes(pending.size)}
          {note && ` · ${note}`}
        </p>
      )}

      {status.phase === 'done' && <p className="mt-2 text-xs">{status.message}</p>}

      {status.phase === 'error' && (
        <div className="mt-2 border border-gray-500 bg-gray-100 p-3 text-xs">
          <p className="font-bold">That file could not be used</p>
          <p className="mt-1">{status.error}</p>
          {/* Browsers differ over AIFF, ALAC and some WAV variants, and the
              original is already stored by the time a decode fails — so this is
              a detour, not a dead end. */}
          {hasMaster && (
            <p className="mt-2">
              Your original is safely saved. Try another browser, or upload
              {variant === 'image' ? ' a JPEG or PNG' : ' an MP3'} for the website to use.
            </p>
          )}
          <button type="button" onClick={onReset} className="mt-2 underline">
            Try again
          </button>
        </div>
      )}

      {currentBytes ? (
        <p className="mt-2 font-mono text-xs text-gray-600">
          on the website: {formatBytes(currentBytes)}
          {hasMaster ? ` · ${masterLabel} saved` : ` · no ${masterLabel} saved`}
        </p>
      ) : null}
    </div>
  )
}

export default UploadDropzone
