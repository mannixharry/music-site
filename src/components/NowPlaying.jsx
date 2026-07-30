import { PauseIcon, PlayIcon, transportClass } from './AudioPlayer'
import { formatTime } from '../format'
import { usePlayback } from '../context/playbackContext'

// The bar along the bottom, once something is playing.
//
// It exists because the audio outliving the page is only useful if you can tell
// that it has: without this, leaving /songs mid-song leaves a sound with no
// visible source and no way to stop it. It names the track, and carries the
// same transport the row does.
//
// Fixed rather than sticky, and the same on a phone as on a desktop — the
// layout is one column at every width, so there is nothing to rearrange. Layout
// gives <main> a matching bottom padding while this is up, so it never covers
// the last thing on a page.
function NowPlaying() {
  const { track, playing, currentTime, duration, hasMetadata, play, pause, clear, seek } =
    usePlayback()

  if (!track) return null

  const seekable = hasMetadata && Number.isFinite(duration) && duration > 0

  return (
    <>
      {/* In the flow, matching the bar's height, so the fixed bar can never sit
          on top of the last thing on the page. Coloured like the footer it
          extends, rather than leaving a white band under it. */}
      <div aria-hidden className="h-20 bg-gray-100" />

      <div
        // aria-label rather than a heading: it is a landmark you may want to
        // jump to, not a section of the page you are reading.
        role="region"
        aria-label="Now playing"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-400 bg-gray-100"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
          <button
            type="button"
            onClick={() => (playing ? pause() : play(track))}
            aria-label={`${playing ? 'Pause' : 'Play'} ${track.title}`}
            className={`${transportClass} ${
              playing
                ? 'border-gray-500 bg-gray-300 text-gray-900'
                : 'border-gray-400 bg-white text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{track.title}</p>

            <div className="mt-0.5 flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={seekable ? duration : 0}
                step="0.01"
                value={currentTime}
                disabled={!seekable}
                aria-label={`Seek within ${track.title}`}
                onChange={(event) => seek(Number(event.currentTarget.value))}
                className="h-4 min-w-0 flex-1 accent-gray-700"
              />
              <span className="shrink-0 font-mono text-xs tabular-nums text-gray-600">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={clear}
            aria-label="Stop and close"
            className="shrink-0 border border-gray-400 bg-white px-2 py-1 text-xs"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  )
}

export default NowPlaying
