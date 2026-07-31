import { useEffect, useMemo } from 'react'
import { formatTime } from '../format'
import { usePlayback } from '../context/playbackContext'
import { TRANSPORT, TRANSPORT_ACTIVE, TRANSPORT_IDLE, scrubberTrack } from './transport'

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

// A transport for one song. It owns no audio — the single element lives in
// PlaybackProvider, so a song carries on playing when you leave the page this
// row was on. What this draws is either live state, when it is the song
// currently loaded, or the song's own recorded length when it is not.
//
// `duration` is that recorded length, and is what lets the whole thing stay
// preload="none": every row shows how long its song is without a byte being
// fetched, which on a page of a hundred songs is a hundred requests saved.
// `queue` is the list this row belongs to — its group's songs, or its
// musical's demos — which is what lets a show play through. A row without one
// still plays; it simply has nothing after it.
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

  // What to hand the provider. Taken from the queue where there is one, so the
  // album and artwork a lock screen shows travel with the track. The fallback
  // is for a player with no list around it: today, the admin's preview.
  //
  // Memoised because it is an effect dependency below, and a fresh object every
  // render would run that effect every render.
  const entry = useMemo(
    () =>
      queue?.find((item) => item.id === id) ?? {
        id,
        src,
        title,
        duration: knownDuration,
      },
    [queue, id, src, title, knownDuration],
  )

  // A song's audio can be replaced while this row is the one loaded — making a
  // preview swaps the public file and leaves the id alone. The provider is
  // still describing the old file until something tells it, and the row is the
  // only thing that knows.
  //
  // `entry` rather than a fresh object built from the props: the entry carries
  // the album and the artwork, and the replacement becomes the track the
  // provider hands to the Media Session API. Built by hand it lost both, so
  // making a preview blanked the lock screen down to a title.
  const { replaceLoaded } = playback
  useEffect(() => {
    if (isActive) replaceLoaded(entry)
  }, [isActive, replaceLoaded, entry])

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
        // `any` does two jobs. The value stays exact, so the thumb moves as
        // smoothly as the fill it sits on; and browsers derive a keyboard step
        // from the range itself — 1% of the track per arrow, 10% per Page Up.
        // Proportional beats any fixed number: ten presses cross a 27-second
        // snippet and a five-minute demo alike.
        step="any"
        value={currentTime}
        disabled={!seekable}
        aria-label={`Seek within ${title}`}
        onChange={(event) => playback.seek(Number(event.currentTarget.value))}
        style={track.style}
        className="scrubber h-6 min-w-0 flex-1"
      />

      {/* Total length, not elapsed: the bar already shows position, and a
          counter starting at zero on play reads like the track reset. */}
      <span className="shrink-0 text-xs tabular-nums">{formatTime(duration)}</span>
    </div>
  )
}

export default AudioPlayer
