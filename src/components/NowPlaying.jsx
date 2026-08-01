import { useCallback, useState } from 'react'
import { formatTime } from '../format'
import { usePlayback } from '../context/playbackContext'
import { PRESS, SLIDE } from '../rules'
import { useCloseOnScroll } from '../useCloseOnScroll'
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
// It used to run flush into the corner of the bar — no padding above, below or
// to its left — on the idea that it would read as a record slotted in rather
// than an icon floating on. On a phone it read as neither. The bar is 60px tall
// there, because the scrubber wraps to a line of its own, and a 48px square
// pinned to the top of it with nothing either side is a picture stuck to the
// corner of the screen: it lines up with no edge the page has, and the page has
// a very obvious one four pixels away.
//
// So it sits in the column with everything else — the same px-4 the content and
// the footer use, which puts its left edge exactly under the sleeves in the
// list below — bordered on all four sides, and centred in whatever height the
// bar comes to rather than hanging from the top of it.
//
// 44px rather than 48 because the gutter has to come from somewhere and 44 is
// still a comfortable target; the bar itself is the height it always was.
const SLEEVE = 'h-11 w-11'
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

  // Whether the drawer has ever been opened, which is what decides if its
  // contents exist at all. Separate from `open` because it never goes back:
  // see the drawer below.
  const [opened, setOpened] = useState(false)

  const toggle = () => {
    setOpened(true)
    setOpen((shut) => !shut)
  }

  // Scrolling the page is the reader going back to it, and the sleeve is a
  // third of a phone's screen sat on top of what they are going back to. The
  // strip itself stays where it is — the transport is what it is pinned for.
  const shut = useCallback(() => setOpen(false), [])
  useCloseOnScroll(open, shut)

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
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-1.5">
        {art && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={DRAWER}
            aria-label={`${open ? 'Hide' : 'Show'} the cover for ${track.title}`}
            className={`group/sleeve relative shrink-0 border border-gray-300 ${SLEEVE} ${PRESS} active:scale-95`}
          >
            <img src={art} alt="" width={1000} height={1000} className="h-full w-full object-cover" />

            {/* The same corner tab a row's sleeve carries, for the same reason:
                on a phone there is no hover to discover with, so the marker
                that says this picture does something has to be there without
                one. */}
            <span
              className={`absolute bottom-0 right-0 grid h-4 w-4 place-items-center bg-gray-900/70 text-white group-hover/sleeve:bg-gray-900 ${PRESS}`}
            >
              {/* Turned over rather than swapped for a second glyph, so the
                  thing that says which way this opens is the thing that moves.
                  Slower than a press: it is travelling half a turn. */}
              <span
                className={`transition-transform ${SLIDE} ${open ? 'rotate-180' : ''}`}
              >
                <ChevronIcon />
              </span>
            </span>
          </button>
        )}

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
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

          {/* The bar and the numbers it is counting, kept together — which is
              what puts them both on the second line on a phone.

              They used to be two items in the wrap, and only the bar carried
              `basis-full`: the clock stayed up on the first line and took 68
              pixels of it, which on a 393px screen is most of the room the
              title had. "Playing Chérie je t'aime trop" was drawn as "Playing
              …". The clock is a caption to the bar rather than to the title, so
              it belongs on the line the bar went to.

              Above that they take a share of the row rather than a fixed width:
              it was sized when this bar ran the full width of the screen, and
              left stranded in the middle of a narrower column. Capped so it
              cannot crowd out the title, which is the more important half. */}
          <div className="order-last flex w-full min-w-0 basis-full items-center gap-3 sm:order-none sm:w-auto sm:max-w-xs sm:flex-1 sm:basis-auto">
            <input
              type="range"
              min="0"
              max={scrubber.max}
              // Exact value, proportional keyboard step — see transport.js,
              // which this shares with the admin's AudioPlayer.
              step="any"
              value={currentTime}
              disabled={!seekable}
              aria-label={`Seek within ${track.title}`}
              style={scrubber.style}
              className="scrubber h-4 min-w-0 flex-1"
              onChange={(event) => seek(Number(event.currentTarget.value))}
            />

            <span className="shrink-0 text-xs tabular-nums text-gray-600">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

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

      {/* The record itself, opening and shutting rather than appearing and
          vanishing — it is a third of a phone's screen arriving, and arriving
          instantly reads as the page having jumped.

          The frame is a one-row grid whose row goes 0fr → 1fr, which is the one
          way to transition a height that is `auto` at one end: the row is
          measured from the content, and the fraction of it that is drawn is
          what animates. Hence the overflow-hidden on both halves — the outer
          clips what the closed row cannot show, the inner needs min-h-0 or a
          grid item refuses to be shorter than its content.

          What is *inside* it is still only built once it has been asked for, so
          a strip that is never opened is two empty elements rather than a
          record's worth of markup. After the first open it stays, because a
          drawer that empties itself on the way shut has nothing to animate
          shut. Nothing is fetched either way: the image here is the same object
          the sleeve above is already showing.

          `inert` while shut, so a keyboard does not tab into a drawer of zero
          height and nothing the reader can see takes focus.

          Its height is picked up by the ResizeObserver in Layout and published
          as --chrome, so every anchor on the site follows it open and shut —
          now continuously, through the animation, which is why that observer
          may not do anything expensive. */}
      {art && (
        <div
          id={DRAWER}
          className={`grid overflow-hidden transition-[grid-template-rows] ${SLIDE} ${
            open ? 'grid-rows-[1fr] border-t border-gray-300' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="min-h-0 overflow-hidden" inert={!open}>
            {opened && (
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NowPlaying
