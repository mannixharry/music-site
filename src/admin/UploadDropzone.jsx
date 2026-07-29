import { useRef, useState } from 'react'
import { ACCEPTED, canUseDirectly } from './upload'

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

function UploadDropzone({ status, onFile, onReset, currentBytes, hasMaster }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)
  const [pending, setPending] = useState(null)

  const busy = status.phase === 'uploading' || status.phase === 'transcoding'

  function choose(file) {
    if (!file) return
    setPending(file)
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
          accept={ACCEPTED}
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
            <p>Drop an audio file here, or click to choose one</p>
            <p className="mt-1 text-xs text-gray-600">
              MP3, M4A, WAV, AIFF, FLAC or OGG. Upload the best version you have — a smaller
              one is made for the website automatically.
            </p>
          </>
        )}
      </div>

      {pending && !busy && (
        <p className="mt-2 font-mono text-xs">
          {pending.name} · {formatBytes(pending.size)}
          {canUseDirectly(pending) ? ' · used as-is' : ' · converted'}
        </p>
      )}

      {status.phase === 'done' && <p className="mt-2 text-xs">{status.message}</p>}

      {status.phase === 'error' && (
        <div className="mt-2 border border-gray-500 bg-gray-100 p-3 text-xs">
          <p className="font-bold">Could not use that file</p>
          <p className="mt-1">{status.error}</p>
          {/* Browsers differ over AIFF, ALAC and some WAV variants, and the
              master is already stored by the time a decode fails — so this is
              a detour, not a dead end. */}
          {hasMaster && (
            <p className="mt-2">
              The original is saved. Try another browser, or upload an MP3 to use for the
              website player.
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
          {hasMaster ? ' · master held' : ' · no master held'}
        </p>
      ) : null}
    </div>
  )
}

export default UploadDropzone
