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
//
// Since the rows lost their transports this is the only scrubber on the site,
// which changed what it has to be. It used to compete with the title for room
// on one line and was hidden altogether on a phone, where forty pixels of bar
// is not a control. Now it runs the full width of the viewport along the
// bottom edge of the strip, where the strip's own border used to be — no
// wider anywhere, and no shorter on a phone than on a desktop.
//
// Smaller than a row's: this bar rides with the header, and every pixel of it
// is taken off every page.
const BUTTON = `${TRANSPORT} h-7 w-7`

// Skipping is what hovering reveals. Held back rather than dropped because a
// strip this narrow has room for either three buttons or a legible title, and
// the title is what tells you what you are hearing.
//
// `hidden` alone as the base, and every rule that undoes it a variant, so this
// never depends on which of two plain display utilities Tailwind emits last.
// `contents` rather than `block`, so the buttons stay children of the flex row.
//
// pointer-coarse is not a nicety: a phone has no hover, and without it these
// would be permanently out of reach there. It is the same question asked the
// other way round — show them unless there is a pointer that can reveal them.
const ON_HOVER =
  'hidden group-hover/strip:contents group-focus-within/strip:contents pointer-coarse:contents'

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
      //
      // Named group, because TrackArt has one of its own and a row can be
      // inside neither, either or both.
      className="group/strip bg-gray-200"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-x-3 px-4 pt-1.5 pb-1">
        <span className={ON_HOVER}>
          {/* Back to the start of this track, or to the one before it if you
              are barely into it. Never disabled: at the top of a list it
              restarts. */}
          <button
            type="button"
            onClick={previous}
            aria-label="Previous"
            title="Previous"
            className={`${BUTTON} ${TRANSPORT_IDLE}`}
          >
            <SkipIcon back />
          </button>
        </span>

        <button
          type="button"
          onClick={() => (playing ? pause() : play(track))}
          aria-label={`${playing ? 'Pause' : 'Play'} ${track.title}`}
          className={`${BUTTON} ${playing ? TRANSPORT_ACTIVE : TRANSPORT_IDLE}`}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <span className={ON_HOVER}>
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
        </span>

        <p className="min-w-0 flex-1 truncate text-xs">
          <span className="text-gray-600">Playing</span>{' '}
          <span className="font-bold">{track.title}</span>
        </p>

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

      {/* Full-bleed rather than inside the column the rest of the strip keeps
          to, because it is doing the job of the border that used to close the
          strip off as well as its own — and a played line that stops short of
          the edge reads as a bar that has finished rather than as a rule.
          In flow, not absolute: overhanging the strip by even a few pixels put
          an invisible slider over the top of the page scrolling underneath. */}
      <input
        type="range"
        min="0"
        max={scrubber.max}
        // Exact value, proportional keyboard step — see transport.js.
        step="any"
        value={currentTime}
        disabled={!seekable}
        aria-label={`Seek within ${track.title}`}
        style={scrubber.style}
        className="scrubber block h-3 w-full"
        onChange={(event) => seek(Number(event.currentTarget.value))}
      />
    </div>
  )
}

export default NowPlaying
