import { useEffect, useRef, useState } from 'react'
import { formatTime } from '../format'
import { usePlayback } from '../context/playbackContext'

// Drawn rather than typed: the ▶ and ❚❚ characters have emoji presentations,
// so the system font decides their colour (blue on Windows) and their weight.
// An inline SVG inherits currentColor and stays put.
function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
      <path d="M5 3v10l8.5-5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
      <rect x="4" y="3" width="3" height="10" />
      <rect x="9" y="3" width="3" height="10" />
    </svg>
  )
}

// Transport only — the visible track title is rendered by the parent, so this
// stays the same width on a phone as on a desktop. `title` is here for the
// screen-reader labels.
//
// `duration` is the length recorded when the track was uploaded. It is what
// lets the element be `preload="none"`: the readout can be right from the first
// paint without fetching anything, which on a page of a hundred songs is the
// difference between one request and a hundred.
function AudioPlayer({ id, src, title, duration: knownDuration = null }) {
  const audioRef = useRef(null)
  const { playingId, play, stop } = usePlayback()
  const [duration, setDuration] = useState(knownDuration ?? NaN)
  const [currentTime, setCurrentTime] = useState(0)
  // Tracked separately from `duration`, which is now known before the media is:
  // seeking a track the browser hasn't loaded throws InvalidStateError, so the
  // scrubber has to wait for the element even though the length is on screen.
  const [hasMetadata, setHasMetadata] = useState(false)

  // The track under a player can be swapped for a different one without the
  // player being replaced — the admin does exactly that when a song is cut down
  // to a preview or put back whole, and the id, and so the component, stays the
  // same. Without this the readout kept the old length and the scrubber its old
  // position until something forced the element to load, which with
  // preload="none" meant pressing play.
  useEffect(() => {
    setDuration(knownDuration ?? NaN)
    setCurrentTime(0)
    setHasMetadata(false)
  }, [src, knownDuration])

  const isActive = playingId === id

  // The provider decides who plays; this syncs the element to that decision.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isActive) {
      // Autoplay policies and rapid play/pause both reject here; giving up the
      // slot keeps the button in sync with what the element actually did.
      audio.play().catch(() => stop(id))
    } else {
      audio.pause()
    }
  }, [isActive, id, stop])

  const seekable = hasMetadata && Number.isFinite(duration) && duration > 0

  return (
    <div className="flex h-14 items-center gap-3 border border-gray-300 bg-gray-100 px-3">
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onLoadedMetadata={(event) => {
          // Overwrite the recorded length with the file's own, so a stale
          // duration in the database can never outlive the first play.
          setDuration(event.currentTarget.duration)
          setHasMetadata(true)
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => stop(id)}
      />

      <button
        type="button"
        onClick={() => (isActive ? stop(id) : play(id))}
        aria-label={`${isActive ? 'Pause' : 'Play'} ${title}`}
        className={`grid h-9 w-9 shrink-0 place-items-center border transition-colors ${
          isActive
            ? 'border-gray-500 bg-gray-300 text-gray-900'
            : 'border-gray-400 bg-white text-gray-600 hover:bg-gray-200 hover:text-gray-900'
        }`}
      >
        {isActive ? <PauseIcon /> : <PlayIcon />}
      </button>

      <input
        type="range"
        min="0"
        max={seekable ? duration : 0}
        step="0.01"
        value={currentTime}
        disabled={!seekable}
        aria-label={`Seek within ${title}`}
        onChange={(event) => {
          const time = Number(event.currentTarget.value)
          setCurrentTime(time)
          if (audioRef.current) audioRef.current.currentTime = time
        }}
        className="h-6 min-w-0 flex-1 accent-gray-700"
      />

      {/* Total length, not elapsed — the scrub bar already shows position, and
          swapping to a counter on play reads like the track reset itself. */}
      <span className="shrink-0 font-mono text-xs tabular-nums">{formatTime(duration)}</span>
    </div>
  )
}

export default AudioPlayer
