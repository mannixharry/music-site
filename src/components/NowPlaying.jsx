import { useState } from 'react'
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

// Drawn too, and for a third reason on top of the other two: ▼ and ▲ are a
// different weight from each other in most faces, so a marker that flips would
// visibly change size as it did.
function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-2.5 w-2.5">
      <path d="M2 5h12L8 12z" />
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

// The sleeve at the head of the strip, and how far it opens.
//
// Flush: no padding above, below or to the left of it, so it reads as a record
// slotted into the bar rather than an icon floating on it. That is also what
// sets the strip's height — 48px against the 40px the transports alone came to,
// which is the whole of what this costs a page that never opens it.
//
// The strip is otherwise the size it always was, and deliberately: the artwork
// worth looking at is a press away, and until it is asked for nothing has been
// taken from the page.
const SLEEVE = 'h-12 w-12'
const OPEN_ART = 'w-44 sm:w-52'

// Named once: two controls point at it, and an aria-controls naming nothing is
// worse than none at all.
const DRAWER = 'now-playing-sleeve'

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

  // Shut until asked, which is the honest default for something that takes a
  // third of a phone's screen. It then stays however it was left, including
  // across a change of track: moving through a list with it open is exactly
  // when seeing the next sleeve is the point. Only closing the strip resets it.
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((shut) => !shut)

  if (!track) return null

  const seekable = hasMetadata && Number.isFinite(duration) && duration > 0
  const scrubber = scrubberTrack(duration, currentTime, seekable)

  // A song with no art of its own and none inherited from a record. The strip
  // then looks exactly as it did before this existed, rather than reserving a
  // square for a picture that is not coming.
  const art = track.artwork
  // A track restored from a session stored before either field existed.
  const name = track.shortTitle ?? track.title

  return (
    <div
      // A landmark you might jump to, not a section of the page you are reading.
      role="region"
      aria-label="Now playing"
      // A tone darker than the header above it, as the admin strip is: this is
      // a state the site is in rather than a part of the site.
      className="border-b border-gray-300 bg-gray-200"
    >
      <div className="mx-auto flex max-w-2xl items-stretch">
        {art && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={DRAWER}
            aria-label={`${open ? 'Hide' : 'Show'} the cover for ${track.title}`}
            className={`group/sleeve relative shrink-0 border-r border-gray-300 ${SLEEVE}`}
          >
            <img src={art} alt="" width={1000} height={1000} className="h-full w-full object-cover" />

            {/* The same corner tab a row's sleeve carries, for the same reason:
                on a phone there is no hover to discover with, so the marker
                that says this picture does something has to be there without
                one. */}
            <span className="absolute bottom-0 right-0 grid h-4 w-4 place-items-center bg-gray-900/70 text-white transition-transform group-hover/sleeve:bg-gray-900">
              <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>
                <ChevronIcon />
              </span>
            </span>
          </button>
        )}

        <div
          className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 py-1.5 pr-4 ${
            art ? 'pl-3' : 'pl-4'
          }`}
        >
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

          {/* The title opens the record too. It is the largest thing in the bar
              and the thing you are already looking at to find out what is
              playing, so making the sleeve the only way in put the affordance
              on the smallest target in the strip. Both drive the one piece of
              state, and both say so, which is what lets either be pressed to
              close it again.

              A plain paragraph when there is no artwork, because then there is
              nothing to open. */}
          {art ? (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-controls={DRAWER}
              className="min-w-0 flex-1 truncate text-left text-xs hover:underline"
            >
              <span className="text-gray-600">Playing</span>{' '}
              <span className="font-bold">{track.title}</span>
            </button>
          ) : (
            <p className="min-w-0 flex-1 truncate text-xs">
              <span className="text-gray-600">Playing</span>{' '}
              <span className="font-bold">{track.title}</span>
            </p>
          )}

          {/* On a phone it wraps to a line of its own, full width — the title is
              what the first line is for, and a scrubber squeezed in beside it at
              forty pixels is not a control. Above that it takes a share of the
              row rather than a fixed width: it was sized when this bar ran the
              full width of the screen, and left stranded in the middle of a
              narrower column. Capped so it cannot crowd out the title, which is
              the more important half. */}
          <input
            type="range"
            min="0"
            max={scrubber.max}
            // Exact value, proportional keyboard step — see transport.js, which
            // this shares with the admin's AudioPlayer.
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
            // Shut on the way out, or the next song to be started would open
            // against a drawer left over from the last one.
            onClick={() => {
              setOpen(false)
              clear()
            }}
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

      {/* The record itself. Only ever rendered open, so a page that is never
          asked pays nothing for it — not even the request for the full-size
          image, which is the same object the sleeve above already holds and so
          costs nothing the second time either.

          Its height is picked up by the ResizeObserver in Layout and published
          as --chrome, so every anchor on the site follows it open and shut. */}
      {open && art && (
        <div id={DRAWER} className="border-t border-gray-300">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 pb-5 pt-4 text-center sm:flex-row sm:items-start sm:text-left">
            <img
              src={art}
              alt=""
              width={1000}
              height={1000}
              className={`aspect-square shrink-0 border border-gray-300 object-cover ${OPEN_ART}`}
            />

            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-tight">{name}</h2>

              <p className="text-sm text-gray-600">
                {track.album ?? 'Single'}
                {Number.isFinite(track.duration) && track.duration > 0 && (
                  <span className="tabular-nums"> · {formatTime(track.duration)}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NowPlaying
