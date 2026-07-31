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

export const transportClass = 'grid h-9 w-9 shrink-0 place-items-center border transition-colors'

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
function AudioPlayer({ id, src, title, duration: knownDuration = null }) {
  const playback = usePlayback()

  const isActive = playback.track?.id === id
  const isPlaying = isActive && playback.playing

  // Live values only while this is the loaded song; otherwise the row shows its
  // own length and a scrubber parked at the start.
  const duration = isActive ? playback.duration : (knownDuration ?? NaN)
  const currentTime = isActive ? playback.currentTime : 0
  const seekable = isActive && playback.hasMetadata && Number.isFinite(duration) && duration > 0
  const track = scrubberTrack(duration, currentTime, seekable)

  return (
    <div className="flex h-14 items-center gap-3 border border-gray-300 bg-gray-100 px-3">
      <button
        type="button"
        onClick={() =>
          isPlaying ? playback.pause() : playback.play({ id, src, title, duration: knownDuration })
        }
        aria-label={`${isPlaying ? 'Pause' : 'Play'} ${title}`}
        className={`${transportClass} ${
          isPlaying
            ? 'border-gray-500 bg-gray-300 text-gray-900'
            : 'border-gray-400 bg-white text-gray-600 hover:bg-gray-200 hover:text-gray-900'
        }`}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <input
        type="range"
        min="0"
        max={track.max}
        step="0.01"
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
