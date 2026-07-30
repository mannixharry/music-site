import { formatTime } from './snippet'

const timeInputClass = 'w-24 border border-gray-400 bg-white px-2 py-1 font-mono text-sm'

// Sits above the audio dropzone and decides what the next upload does. It has
// no effect on the file already on the site: the crop happens on the way up, so
// changing anything here means uploading the master again.
//
// `range` is what the two fields currently add up to, or null if they do not
// add up to anything — the form uses that to decide whether it can accept a
// file at all, rather than quietly publishing a whole song.
function SnippetControls({ snippet, range, onChange, current }) {
  const set = (fields) => onChange({ ...snippet, ...fields })

  return (
    <div className="mb-3 border border-gray-300 bg-gray-100 p-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={snippet.enabled}
          onChange={(event) => set({ enabled: event.currentTarget.checked })}
        />
        <span className="font-bold">Put only a preview on the website</span>
      </label>

      <p className="mt-1 text-xs text-gray-600">
        Upload the whole song either way — it is kept privately as the master, as always. With
        this ticked, only the cut below is uploaded to the public bucket, so the full recording
        is never on the website to be found.
      </p>

      {snippet.enabled && (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs font-bold">Start</span>
              <input
                className={`${timeInputClass} mt-1 block`}
                value={snippet.start}
                placeholder="0:00"
                inputMode="numeric"
                onChange={(event) => set({ start: event.currentTarget.value })}
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold">Length</span>
              <input
                className={`${timeInputClass} mt-1 block`}
                value={snippet.length}
                placeholder="0:30"
                inputMode="numeric"
                onChange={(event) => set({ length: event.currentTarget.value })}
              />
            </label>

            <p className="pb-1 text-xs text-gray-600">
              {range
                ? `${formatTime(range.start)}–${formatTime(range.end)} of the master`
                : 'Minutes and seconds, or just seconds.'}
            </p>
          </div>

          {/* The dropzone is withheld while this is true, so it has to say why. */}
          {!range && (
            <p className="mt-2 border border-gray-500 bg-white p-2 text-xs">
              Those are not two times this can read, so there is nothing to cut to yet. Try
              &ldquo;0:30&rdquo; and &ldquo;0:20&rdquo;.
            </p>
          )}

          <p className="mt-2 text-xs text-gray-600">
            A preview always gets converted, even from an MP3 — there is no way to cut one
            without re-encoding it, so this is slower than an ordinary upload.
          </p>
        </>
      )}

      {current && (
        <p className="mt-2 border-t border-gray-300 pt-2 font-mono text-xs text-gray-600">
          on the site now: {formatTime(current.start)}–{formatTime(current.end)} of the master
        </p>
      )}
    </div>
  )
}

export default SnippetControls
