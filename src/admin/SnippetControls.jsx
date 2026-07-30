import { formatTime } from './snippet'

// The switch that decides what the next upload does. Everything about *where*
// to cut is settled afterwards, in SnippetTrimmer, once there is a file to look
// at — there is nothing useful to ask before then.
//
// It has no effect on the file already on the site: the cut happens on the way
// up, so changing anything here means uploading the master again.
function SnippetControls({ enabled, onChange, current }) {
  return (
    <div className="mb-3 border border-gray-300 bg-gray-100 p-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span className="font-bold">Put only a preview on the website</span>
      </label>

      <p className="mt-1 text-xs text-gray-600">
        Upload the whole song either way — it is kept privately as the master, as always. With
        this ticked you choose the cut on the next screen, and only that cut is uploaded to the
        public bucket, so the full recording is never on the website to be found.
      </p>

      {enabled && (
        <p className="mt-2 text-xs text-gray-600">
          A preview is always re-encoded, even from an MP3, because there is no way to cut one
          without it. Only the seconds you keep get encoded, though — a half-minute preview
          takes a few seconds whether it came out of a three-minute song or a ten-minute one.
        </p>
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
