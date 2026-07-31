import { formatTime } from '../format'
import { usePlayback } from '../context/playbackContext'

// Drawn rather than typed: the ▶ and ❚❚ characters have emoji presentations,
// so the system font decides their colour (blue on Windows) and their weight.
// An inline SVG inherits currentColor and stays put.
export function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
      <path d="M5 3v10l8.5-5z" />
    </svg>
  )
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
      <rect x="4" y="3" width="3" height="10" />
      <rect x="9" y="3" width="3" height="10" />
    </svg>
  )
}

// The look of every transport button on the site, in one place: the row
// players, and the four in the now-playing strip. Size is left to the caller
// because the strip's are smaller than a row's.
export const TRANSPORT = 'grid shrink-0 place-items-center border transition-colors'
export const TRANSPORT_IDLE =
  'border-gray-400 bg-white text-gray-600 hover:bg-gray-200 hover:text-gray-900'
export const TRANSPORT_ACTIVE = 'border-gray-500 bg-gray-300 text-gray-900'

// The two numbers a scrub bar needs, worked out in one place because there are
// two of these — the row players and the now-playing strip — and they were
// close enough to drift apart without anyone noticing.
//
// `max` is never zero. It used to be, for every row that was not the song
// currently loaded: min="0" max="0" is a control with no range at all, and what
// a browser draws for one is undefined and differs by engine. That is the most
// likely source of the dark line reported along the top of some of these bars in
// Safari, and it is worth not doing regardless of whether it was the cause. The
// row still cannot be dragged before there is audio to seek in — `disabled` is
// what does that, and always was.
//
// `--played` is how far along the bar is filled. A range with its native
// appearance removed has no idea of a "played" side, so the track is painted as
// a two-stop gradient and this is where the stop goes.
export function scrubberTrack(duration, currentTime, seekable) {
  const max = Number.isFinite(duration) && duration > 0 ? duration : 1
  const played = seekable ? Math.min(100, Math.max(0, (currentTime / max) * 100)) : 0
  return { max, style: { '--played': `${played}%` } }
}

// A transport for one song. It owns no audio — the single element lives in
// PlaybackProvider, so a song carries on playing when you leave the page this
// row was on. What this draws is either live state, when it is the song
// currently loaded, or the song's own recorded length when it is not.
//
// `duration` is that recorded length, and is what lets the whole thing stay
// preload="none": every row shows how long its song is without a byte being
// fetched, which on a page of a hundred songs is a hundred requests saved.
// `queue` is the list this row belongs to — the songs in its group, the demos
// of its musical. It is what gives "next" something to mean, and what lets a
// musical play through rather than stopping after every track. A row without
// one still plays; it simply has nothing after it.
function AudioPlayer({ id, src, title, duration: knownDuration = null, queue }) {
  const playback = usePlayback()

  const isActive = playback.track?.id === id
  const isPlaying = isActive && playback.playing

  // Live values only while this is the loaded song; otherwise the row shows its
  // own length and a scrubber parked at the start.
  const duration = isActive ? playback.duration : (knownDuration ?? NaN)
  const currentTime = isActive ? playback.currentTime : 0
  const seekable = isActive && playback.hasMetadata && Number.isFinite(duration) && duration > 0
  const track = scrubberTrack(duration, currentTime, seekable)

  // What to hand the provider when this row is pressed. Taken from the queue
  // when there is one, so the musical's name and the cover art travel with the
  // track — those are what a lock screen shows, and toQueue is the one place
  // that decides what a playable track carries. The fallback is for a player
  // with no list around it, which today means the admin's preview.
  const entry = queue?.find((item) => item.id === id) ?? {
    id,
    src,
    title,
    duration: knownDuration,
  }

  return (
    <div className="flex h-14 items-center gap-3 border border-gray-300 bg-gray-100 px-3">
      <button
        type="button"
        onClick={() =>
          isPlaying
            ? playback.pause()
            : playback.play(entry, queue)
        }
        aria-label={`${isPlaying ? 'Pause' : 'Play'} ${title}`}
        className={`${TRANSPORT} h-9 w-9 ${isPlaying ? TRANSPORT_ACTIVE : TRANSPORT_IDLE}`}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <input
        type="range"
        min="0"
        max={track.max}
        // `any`, which is doing two jobs.
        //
        // `step` is not only the precision of the value, it is also how far one
        // arrow key moves. It was 0.01, which meant a keyboard user needed 2,775
        // presses to cross a twenty-seven second song and Page Up advanced a
        // tenth of a second — the control was unusable without a mouse. Setting
        // it to 1 fixed that and broke something else: a range snaps its value
        // to its step, so the thumb began jumping a whole second at a time,
        // about eleven pixels, while the filled part of the track (which is
        // drawn from the real time, not the snapped one) slid smoothly under it.
        //
        // `any` has neither problem. The value stays exact, so the thumb moves
        // as smoothly as the fill; and browsers size a keyboard step for it from
        // the range itself — measured at 1% of the track per arrow and 10% per
        // Page Up. That is better than any fixed number could be, because it is
        // the same ten presses to cross a 27-second snippet and a five-minute
        // demo.
        step="any"
        value={currentTime}
        disabled={!seekable}
        aria-label={`Seek within ${title}`}
        onChange={(event) => playback.seek(Number(event.currentTarget.value))}
        style={track.style}
        className="scrubber h-6 min-w-0 flex-1"
      />

      {/* Total length, not elapsed — the scrub bar already shows position, and
          swapping to a counter on play reads like the track reset itself. */}
      <span className="shrink-0 text-xs tabular-nums">{formatTime(duration)}</span>
    </div>
  )
}

export default AudioPlayer
