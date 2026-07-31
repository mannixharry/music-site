import { formatTime } from '../format'
import { usePlayback } from '../context/playbackContext'
import { PauseIcon, PlayIcon } from './AudioPlayer'
import { TRANSPORT, TRANSPORT_ACTIVE, TRANSPORT_IDLE, scrubberTrack } from './transport'

// Drawn, like the play and pause icons, and for the same reason.
function SkipIcon({ back = false }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={`h-3.5 w-3.5 ${back ? 'rotate-180' : ''}`}
    >
      <path d="M3 3v10l7-5z" />
      <rect x="11" y="3" width="2" height="10" />
    </svg>
  )
}

// A slim strip under the header, once something is playing.
//
// It rides with the header rather than sitting against the bottom of the
// viewport, which is the one edge a page cannot see: Windows draws its taskbar
// over a window that overhangs the work area, and env(safe-area-inset-*)
// describes iOS cutouts and reports zero there. Identical at every width, so
// there is no second layout to keep working.
// Smaller than a row's: this bar rides with the header, and every pixel of it
// is taken off every page.
const BUTTON = `${TRANSPORT} h-7 w-7`

function NowPlaying() {
  const {
    track,
    playing,
    currentTime,
    duration,
    hasMetadata,
    hasNext,
    play,
    pause,
    clear,
    seek,
    next,
    previous,
  } = usePlayback()

  if (!track) return null

  const seekable = hasMetadata && Number.isFinite(duration) && duration > 0
  const scrubber = scrubberTrack(duration, currentTime, seekable)

  return (
    <div
      // A landmark you might jump to, not a section of the page you are reading.
      role="region"
      aria-label="Now playing"
      // A tone darker than the header above it, as the admin strip is: this is
      // a state the site is in rather than a part of the site.
      className="border-b border-gray-300 bg-gray-200"
    >
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
        {/* Back to the start of this track, or to the one before it if you are
            barely into it. Never disabled: at the top of a list it restarts. */}
        <button
          type="button"
          onClick={previous}
          aria-label="Previous"
          title="Previous"
          className={`${BUTTON} ${TRANSPORT_IDLE}`}
        >
          <SkipIcon back />
        </button>

        <button
          type="button"
          onClick={() => (playing ? pause() : play(track))}
          aria-label={`${playing ? 'Pause' : 'Play'} ${track.title}`}
          className={`${BUTTON} ${playing ? TRANSPORT_ACTIVE : TRANSPORT_IDLE}`}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Disabled rather than hidden at the end of a list, so the row does
            not change width as you move through one. */}
        <button
          type="button"
          onClick={next}
          disabled={!hasNext}
          aria-label="Next"
          title="Next"
          className={`${BUTTON} ${
            hasNext ? TRANSPORT_IDLE : 'border-gray-400 bg-white text-gray-400'
          }`}
        >
          <SkipIcon />
        </button>

        <p className="min-w-0 flex-1 truncate text-xs">
          <span className="text-gray-600">Playing</span>{' '}
          <span className="font-bold">{track.title}</span>
        </p>

        {/* Hidden altogether on a phone: the title is what this is for, and a
            scrubber squeezed to forty pixels is not a control.
            Above that it takes a share of the row rather than a fixed width —
            it was sized when this bar ran the full width of the screen, and
            left stranded in the middle of a narrower column. Capped so it
            cannot crowd out the title, which is the more important half. */}
        <input
          type="range"
          min="0"
          max={scrubber.max}
          // Exact value, proportional keyboard step — see the row players.
          step="any"
          value={currentTime}
          disabled={!seekable}
          aria-label={`Seek within ${track.title}`}
          style={scrubber.style}
          className="scrubber order-last h-4 w-full basis-full sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:basis-auto sm:max-w-xs"
          onChange={(event) => seek(Number(event.currentTarget.value))}
        />

        <span className="shrink-0 text-xs tabular-nums text-gray-600">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <button
          type="button"
          onClick={clear}
          aria-label="Stop and close"
          // A full square, like the others: this is on screen at every scroll
          // position and its neighbour is a play button you did not mean to
          // press.
          className={`${BUTTON} ${TRANSPORT_IDLE} text-xs`}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default NowPlaying
