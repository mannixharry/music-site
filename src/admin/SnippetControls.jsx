import { formatTime } from '../format'

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
        <span className="font-bold">Only put a short preview on the website</span>
      </label>

      <p className="mt-1 text-xs text-gray-600">
        Your full recording stays private — only the part you choose goes on the website, so
        nobody can download the whole song.
      </p>

      {enabled && (
        <p className="mt-2 text-xs text-gray-600">
          Making the preview takes a few seconds.
        </p>
      )}

      {current && (
        <p className="mt-2 border-t border-gray-300 pt-2 font-mono text-xs text-gray-600">
          on the website now: {formatTime(current.start)}–{formatTime(current.end)} of the song
        </p>
      )}
    </div>
  )
}

export default SnippetControls
