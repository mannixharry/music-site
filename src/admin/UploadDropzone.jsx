import { useRef, useState } from 'react'
import { formatBytes } from '../format'
import { ACCEPTED, canUseDirectly, isUploading } from './upload'
import { ACCEPTED_IMAGES } from './cover'

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
    hint: 'JPEG, PNG, WebP or AVIF. Upload it full size — it is cropped square for the website and your original is kept.',
    describe: async () => 'will be cropped square',
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
      <div
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
        onClick={() => !busy && inputRef.current?.click()}
        className={`cursor-pointer border border-dashed p-4 text-center text-sm ${
          over ? 'border-gray-600 bg-gray-200' : 'border-gray-400 bg-gray-100'
        } ${busy ? 'cursor-wait opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => choose(event.currentTarget.files[0])}
        />

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
      </div>

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
