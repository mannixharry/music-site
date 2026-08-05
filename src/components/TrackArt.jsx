import { useEffect, useRef, useState } from 'react'
import { useTrackControl } from './trackControl'
import { PRESS, SLIDE } from '../rules'
import { PauseIcon, PlayIcon } from './AudioPlayer'

// A song drawn as its sleeve, and the sleeve is the button.
//
// This is what replaced the transport every row used to carry. A row scrubber
// and the now-playing strip's scrubber are the same control twice on one
// screen — and with a dozen rows on a page it was a dozen times, which is what
// the site was told looked strange. Scrubbing now happens in one place, the
// strip, and a row's whole job is to start something.
//
// It owns no audio: the single element lives in PlaybackProvider, so a song
// carries on playing when you leave the page its row was on. And with no
// element per row there is no `preload` to get wrong — a page of a hundred
// songs costs no audio requests at all until one is pressed, which is what the
// old players needed a recorded `duration` and preload="none" to achieve.

// The badge is deliberately awkward to size: at 56px a square big enough to
// hold a 14px glyph comfortably covers a quarter of the sleeve and reads as a
// hole punched in the artwork. So it sits flush in the corner rather than
// floating inset — a tab on the picture rather than a button on top of it —
// and the glyph inside it is scaled down to match.
const SIZES = {
  // Beside a title in a list, on both of the site's layouts.
  row: {
    tile: 'w-14',
    label: 'text-[8px] p-1 pb-4',
    badge: 'h-4 w-4 [&_svg]:h-2.5 [&_svg]:w-2.5',
  },
  // The one song in a list that is playing. Double the row, which makes the
  // record you are hearing the largest picture on the page and answers "which
  // of these is it" without a word being read — the question a show with nine
  // demos actually raises.
  //
  // Only ever reached from `row`. The song's own page is already showing its
  // sleeve as the illustration, and there is nothing there to tell apart.
  playing: {
    tile: 'w-28',
    // Room for four lines rather than three, and legible rather than merely
    // present: at 112px the typographic fallback is the sleeve, not a marker.
    label: 'text-xs p-2 pb-6 [&>span]:line-clamp-4',
    badge: 'h-6 w-6 [&_svg]:h-3.5 [&_svg]:w-3.5',
  },
  // One song with a page to itself, where the sleeve is the illustration
  // rather than a marker in a column.
  // No extra bottom padding here, unlike the row: at 160px a title is one or
  // two centred lines with room to spare, and reserving a strip for the badge
  // only lifted it visibly off centre for a corner it was never going to reach.
  page: {
    tile: 'w-32 sm:w-40',
    label: 'text-xs sm:text-sm p-4',
    badge: 'h-7 w-7',
  },
}

// The picture, or what stands in for it.
//
// `coverSrc` is already the song's own art or, failing that, its album's —
// normalise.js does that inheritance, which is the point of giving a record a
// cover at all. So what is left to decide here is the song that has neither.
//
// Not a dashed placeholder and not an initial. A dashed box reads as a page
// that failed to load, which is the reason ReleaseItem used to draw nothing at
// all rather than an empty frame; and an initial collides — "Chérie je t'aime
// trop" and "Caught in the Wire" are both a C. The title itself, set small and
// centred, is a printed label: it says what the record is, which is what a
// sleeve is for, and it is never the same twice.
function Sleeve({ song, size, children }) {
  const s = SIZES[size]

  return (
    <span
      // The width is the only thing that changes between `row` and `playing`,
      // so it is worth easing rather than cutting: pressing through a list
      // otherwise makes the rows below jump by 56px on every track.
      className={`relative block aspect-square shrink-0 border border-gray-300 transition-[width] ${SLIDE} ${s.tile}`}
    >
      {song.coverSrc ? (
        // Decorative: the title is beside it and the button naming this song is
        // around it, so describing the image here reads the same words twice.
        <img
          src={song.coverSrc}
          alt=""
          width={1000}
          height={1000}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          // The bottom padding is what keeps the words off the badge in the
          // corner below them.
          className={`flex h-full w-full items-center justify-center overflow-hidden bg-gray-100 text-center font-bold uppercase leading-tight tracking-wide text-gray-500 ${s.label}`}
        >
          {/* Clamped, and on an element of its own: line-clamp is
              display:-webkit-box, which would replace the flex centring above
              if the two shared a span. Three lines is what a 56px square holds
              once the badge has its corner — "Halfway Back to My Dreams" wants
              four and spilled over both edges. */}
          <span className="line-clamp-3">{song.shortTitle}</span>
        </span>
      )}
      {children}
    </span>
  )
}

// How long the accent sits over the sleeve when a song is started or stopped.
//
// A press has to answer, and on a phone this is the only thing that can: there
// is no hover to bring the wash up, and on the row that has just grown to twice
// its size, the whole of what changes under the finger is a 16px badge in a
// corner it is probably covering. So the press flashes the accent over the
// artwork and it fades out again — which is what the sleeve used to do and
// hold, before the loaded row started growing instead.
//
// A quarter of a second, and no longer. Every animation on this site is on the
// path between a press and what it does; this one is over before the audio
// starts, which is when the row has other ways of saying so.
const FLASH_MS = 260

function TrackArt({ song, queue, size = 'row' }) {
  // Shared with the title beside it, so the two controls in a row are one
  // press. See trackControl.js.
  const { playback, isActive, isPlaying, entry, toggle, label } = useTrackControl(song, queue)

  // A row grows into the loaded song's sleeve; every other size is left alone.
  const drawn = size === 'row' && isActive ? 'playing' : size
  const s = SIZES[drawn]

  // A song's audio can be replaced while this row is the one loaded — making a
  // preview swaps the public file and leaves the id alone. The provider is
  // still describing the old file until something tells it, and the row is the
  // only thing that knows.
  //
  // It stays here rather than in the shared hook: the sleeve is drawn wherever
  // a title is, so this runs exactly once per row either way, and two copies of
  // it would be two components racing to re-describe the same track.
  const { replaceLoaded } = playback
  useEffect(() => {
    if (isActive) replaceLoaded(entry)
  }, [isActive, replaceLoaded, entry])

  // The press, showing. Cleared on a timer rather than on transitionend: the
  // wash is off entirely under prefers-reduced-motion (index.css cuts every
  // transition on the site), and an event that never fires would leave the
  // accent sitting there permanently.
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef(null)
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  const press = () => {
    clearTimeout(flashTimer.current)
    setFlash(true)
    flashTimer.current = setTimeout(() => setFlash(false), FLASH_MS)
    toggle()
  }

  // No recording yet, so nothing to press. The sleeve still draws — a single
  // announced before its audio arrives is still a release.
  if (!song.audioSrc) return <Sleeve song={song} size={drawn} />

  // The accent wash marks the loaded song everywhere it is drawn small. On the
  // row that has grown it would cover the whole of the thing the growing was
  // for, so there the picture stays and the corner badge — which is showing a
  // pause glyph, and is the size of the old sleeve's quarter — says what state
  // it is in instead. Hovering still brings the wash, where it means press to
  // pause rather than "this is playing".
  const washed = isActive && drawn !== 'playing'

  // Either reason to be showing it. The flash is the press answering back and
  // is the one that reaches a phone, where the row that grows is exactly the
  // row that stops being washed.
  const lit = washed || flash

  return (
    <button
      type="button"
      onClick={press}
      aria-label={label}
      // The press, on the sleeve rather than on the tile inside it: the tile is
      // already animating its width when a row becomes the loaded one, and two
      // transforms on one element fight over the same property.
      className={`group/art shrink-0 ${PRESS} active:scale-95`}
    >
      <Sleeve song={song} size={drawn}>
        {/* Two states over the picture, and the small one is not decoration.
            A sleeve with the glyph only on hover is, on a phone, a photograph
            with no sign that it does anything — there is no hover to find it
            with. So the badge is always there, and giving way to the full
            wash is what hovering adds. */}
        <span
          className={`absolute bottom-0 left-0 grid place-items-center bg-gray-900/70 text-white ${PRESS} ${s.badge} ${
            lit ? 'opacity-0' : 'opacity-100 group-hover/art:opacity-0'
          }`}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </span>

        <span
          // Translucent over a picture, so the sleeve is still readable under
          // the wash — and solid over the fallback, where what is underneath is
          // the title in grey and showing it through leaves the same words
          // twice, one of them upside down in tone.
          className={`absolute inset-0 grid place-items-center text-white ${PRESS} ${
            song.coverSrc ? 'bg-accent/85' : 'bg-accent'
          } ${
            lit
              ? 'opacity-100'
              : 'opacity-0 group-hover/art:opacity-100 group-focus-visible/art:opacity-100'
          }`}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </span>
      </Sleeve>
    </button>
  )
}

export default TrackArt
