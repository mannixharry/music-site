import { useRef, useState } from 'react'
import { ACCEPTED, canUseDirectly } from './upload'
import { ACCEPTED_IMAGES } from './cover'

function formatBytes(bytes) {
  if (!bytes) return '—'
  const mb = bytes / 1024 / 1024
  return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`
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
    hint: 'MP3, M4A, WAV, AIFF, FLAC or OGG. Upload the best version you have — a smaller one is made for the website automatically.',
    describe: async (file) => (canUseDirectly(file) ? 'used as-is' : 'converted'),
  },
  // Same file, different promise: this one goes to the trimmer rather than
  // straight to the bucket, and saying so is the difference between the next
  // step being obvious and the panel looking like it did nothing.
  'audio-preview': {
    accept: ACCEPTED,
    prompt: 'Drop the whole song here to cut a preview from it',
    hint: 'Nothing is uploaded yet — you choose the cut on the next screen, and only that cut is published.',
    describe: async () => 'you choose the cut next',
  },
  image: {
    accept: ACCEPTED_IMAGES,
    prompt: 'Drop the cover art here, or click to choose it',
    hint: 'JPEG, PNG, WebP or AVIF. Upload it at full size — a square 1000px copy is made for the website, and the original is kept.',
    describe: async () => 'resized to 1000px square',
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

  const busy =
    status.phase === 'uploading' || status.phase === 'transcoding' || status.phase === 'resizing'

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
          <p className="font-bold">Could not use that file</p>
          <p className="mt-1">{status.error}</p>
          {/* Browsers differ over AIFF, ALAC and some WAV variants, and the
              original is already stored by the time a decode fails — so this is
              a detour, not a dead end. */}
          {hasMaster && (
            <p className="mt-2">
              The original is saved. Try another browser, or upload
              {variant === 'image' ? ' a JPEG or PNG' : ' an MP3'} to use for the website.
            </p>
          )}
          <button type="button" onClick={onReset} className="mt-2 underline">
            Try again
          </button>
        </div>
      )}

      {currentBytes ? (
        <p className="mt-2 font-mono text-xs text-gray-600">
          on the site: {formatBytes(currentBytes)}
          {hasMaster ? ` · ${masterLabel} held` : ` · no ${masterLabel} held`}
        </p>
      ) : null}
    </div>
  )
}

export default UploadDropzone
