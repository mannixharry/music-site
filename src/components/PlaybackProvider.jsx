import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlaybackContext } from '../context/playbackContext'

// One <audio> element for the entire site, owned here.
//
// This is the whole point of the change. Each row used to render its own
// element, which meant the element belonged to a page — and navigating away
// unmounted it and cut the song off mid-bar. React moves nothing between
// parents, so the only way for a sound to survive a page change is for the
// thing making it to live above the router. It does now, and the rows became
// controls that describe what they would like it to play.
//
// preload="none" survives intact, and matters more than before: there is one
// element and it has no src at all until something is asked for, so a page of a
// hundred songs still costs zero audio requests until someone presses play.
function PlaybackProvider({ children }) {
  const audioRef = useRef(null)
  const frameRef = useRef(0)
  // What the element is actually pointed at, kept in a ref as well as in state.
  // The ref is the one the handlers read, because they have to know *now* — see
  // the note on play() below.
  const trackRef = useRef(null)

  // The whole track, not just its id — the bar at the bottom has to name what
  // is playing after you have left the page the row was on.
  const [track, setTrack] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(NaN)
  // Seeking a track the browser has not fetched throws InvalidStateError, so
  // the scrubber waits for the element even when the length is already known.
  const [hasMetadata, setHasMetadata] = useState(false)

  // rAF rather than timeupdate, which fires about four times a second and makes
  // the scrubber visibly step.
  const tick = useCallback(() => {
    const element = audioRef.current
    if (!element) return
    setCurrentTime(element.currentTime)
    frameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  // Everything that touches the element happens here, synchronously, in the
  // click that asked for it. Both halves of that matter.
  //
  // Synchronously, because this was written with the src assignment inside a
  // setTrack updater — and React runs updaters during the *next render*, not
  // when you call them. So play() ran first, against whatever the element was
  // pointed at before: nothing on the first press, the previous song after
  // that. It looked like random songs failing and a reload fixing some while
  // breaking others, because a reload changes which one is loaded. A state
  // updater is also allowed to run more than once, which is reason enough not
  // to put an assignment in one.
  //
  // In the click, because a phone will only start audio from a gesture, and
  // anything awaited first loses that.
  const play = useCallback((next) => {
    const element = audioRef.current
    if (!element) return

    // A different song: point the element at it and start from the top. The
    // same one: carry on from where it was, which is what makes pressing play
    // on the bar and on the row the same button.
    if (trackRef.current?.id !== next.id) {
      trackRef.current = next
      element.src = next.src
      // Tells the element to pick the new source up now rather than at some
      // point of its choosing, which phones are markedly less relaxed about.
      element.load()

      setTrack(next)
      setCurrentTime(0)
      setDuration(next.duration ?? NaN)
      setHasMetadata(false)
    }

    // Rejects under autoplay policy and on rapid play/pause. Either way the
    // element did not start, so nothing should claim it did.
    element.play().catch(() => setPlaying(false))
  }, [])

  const pause = useCallback(() => audioRef.current?.pause(), [])

  // Only whoever owns the slot may give it up, so a stale call from a row that
  // has already lost it cannot stop the song that took it. Reads the ref for
  // the same reason play() does: the answer is needed now, not next render.
  const stop = useCallback((id) => {
    if (id !== undefined && trackRef.current?.id !== id) return
    audioRef.current?.pause()
  }, [])

  // Ends playback outright and empties the bar, which is what its close button
  // means and what pressing play on a row does not.
  const clear = useCallback(() => {
    const element = audioRef.current
    if (element) {
      element.pause()
      element.removeAttribute('src')
      element.load()
    }
    trackRef.current = null
    setTrack(null)
    setPlaying(false)
    setCurrentTime(0)
    setHasMetadata(false)
  }, [])

  const seek = useCallback((time) => {
    const element = audioRef.current
    if (!element) return
    element.currentTime = time
    setCurrentTime(time)
  }, [])

  const value = useMemo(
    () => ({
      track,
      playing,
      currentTime,
      duration,
      hasMetadata,
      play,
      pause,
      stop,
      clear,
      seek,
    }),
    [track, playing, currentTime, duration, hasMetadata, play, pause, stop, clear, seek],
  )

  return (
    <PlaybackContext.Provider value={value}>
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => {
          setPlaying(true)
          cancelAnimationFrame(frameRef.current)
          frameRef.current = requestAnimationFrame(tick)
        }}
        onPause={() => {
          setPlaying(false)
          cancelAnimationFrame(frameRef.current)
        }}
        onEnded={() => {
          setPlaying(false)
          setCurrentTime(0)
        }}
        onLoadedMetadata={(event) => {
          // The file's own length replaces the recorded one, so a stale
          // duration in the database cannot outlive the first play.
          setDuration(event.currentTarget.duration)
          setHasMetadata(true)
        }}
      />
      {children}
    </PlaybackContext.Provider>
  )
}

export default PlaybackProvider
