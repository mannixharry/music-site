import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlaybackContext } from '../context/playbackContext'
// Fallback lock-screen artwork, for a song with no cover of its own.
import portrait from '../images/frank-kirwan-672.jpg'

// One <audio> element for the entire site, owned here and mounted above the
// router. React moves nothing between parents, so a sound can only survive a
// page change if the thing making it lives above the pages; the rows are
// controls that ask this to play something, and own no audio themselves.
//
// preload="none" and no src until something is asked for, so a page of a
// hundred songs costs zero audio requests until someone presses play.
const REMEMBER_KEY = 'playback'

function PlaybackProvider({ children, remember = false }) {
  const audioRef = useRef(null)
  const frameRef = useRef(0)
  // The displayed track, in a ref as well as in state: handlers need the answer
  // now, not on the next render.
  const trackRef = useRef(null)
  // Which track the element is pointed at, which is not always the displayed
  // one — a restored session shows a track before anything has been loaded.
  const loadedIdRef = useRef(null)
  // A restored position, applied once the file can accept a seek. Seeking an
  // element that has not loaded throws.
  const pendingSeekRef = useRef(null)
  // The list the current track was started from, so "next" has a meaning.
  const queueRef = useRef([])

  // The whole track, not just its id: the strip has to name what is playing
  // after you have left the page its row was on.
  const [track, setTrack] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(NaN)
  // Seeking a track the browser has not fetched throws InvalidStateError, so
  // the scrubber waits for the element even when the length is already known.
  const [hasMetadata, setHasMetadata] = useState(false)
  // In state as well as in the ref so the strip's next button redraws when the
  // list changes under it.
  const [queue, setQueue] = useState([])

  // Driven by rAF, throttled to one React update every 80ms.
  //
  // rAF rather than the element's own timeupdate, which fires about four times
  // a second and makes the thumb visibly step; rAF rather than an interval,
  // because it stops while the tab is in the background. Throttled because a
  // scrub bar a few hundred pixels wide moves under a pixel in 80ms, and
  // rendering every frame instead cost a quarter of the main thread on a
  // 6×-throttled phone against about seven per cent for this.
  const lastPaintRef = useRef(0)

  const tick = useCallback(() => {
    const element = audioRef.current
    if (!element) return

    const now = performance.now()
    if (now - lastPaintRef.current >= 80) {
      lastPaintRef.current = now
      setCurrentTime(element.currentTime)
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  // Everything that touches the element happens here, synchronously, inside the
  // click that asked for it. Both halves matter.
  //
  // Synchronously: assigning src from inside a state updater would run on the
  // next render, so play() would fire against whatever was loaded before. A
  // state updater may also run more than once, which is reason enough never to
  // put an assignment in one.
  //
  // Inside the click: a phone will only start audio from a gesture, and
  // anything awaited first loses it.
  const play = useCallback((next, nextQueue) => {
    const element = audioRef.current
    if (!element) return

    // Kept when the caller does not supply one, so pressing play on the strip
    // does not empty the queue a row set up.
    if (nextQueue) {
      queueRef.current = nextQueue
      setQueue(nextQueue)
    }

    // A song the element is not pointed at: point it there and start from the
    // top. One it already is: carry on, which is what makes the strip's play
    // button and the row's the same button.
    //
    // Compared against what is loaded, not what is displayed: after a reload
    // the strip shows a track the element has never seen, and comparing against
    // the displayed one would skip the load and play silence.
    if (loadedIdRef.current !== next.id) {
      loadedIdRef.current = next.id
      trackRef.current = next
      element.src = next.src
      // Tells the element to pick the new source up now rather than at some
      // point of its choosing, which phones are markedly less relaxed about.
      element.load()

      setTrack(next)
      setCurrentTime(pendingSeekRef.current ?? 0)
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
    loadedIdRef.current = null
    pendingSeekRef.current = null
    queueRef.current = []
    setQueue([])
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

  // Where the current track sits in the list it was started from. -1 when there
  // is no list, which is what makes next and previous inert rather than wrong.
  const at = useCallback(
    () => queueRef.current.findIndex((item) => item.id === trackRef.current?.id),
    [],
  )

  const next = useCallback(() => {
    const i = at()
    // -1 means the track is not in this list at all, and -1 + 1 would address
    // its first entry — a "next" that jumps to the top of a list you are not in.
    if (i === -1) return
    const target = queueRef.current[i + 1]
    if (target) play(target)
  }, [at, play])

  // Back to the start of this track if you are into it, the previous one if you
  // are not — which is what every other transport does, and the reason the
  // button is never dead: at the top of a list it restarts rather than nothing.
  const previous = useCallback(() => {
    const element = audioRef.current
    if (element && element.currentTime > 3) {
      seek(0)
      return
    }
    const i = at()
    const target = i > 0 ? queueRef.current[i - 1] : null
    if (target) play(target)
    else seek(0)
  }, [at, play, seek])

  // Remembering where you were: the track, its list and the position.
  //
  // sessionStorage rather than localStorage, so this survives a reload and an
  // accidental back button without greeting someone a week later with a
  // half-played demo.
  //
  // Restores paused, and cannot do otherwise — no browser starts audio on a
  // page the reader has not touched. The first press of play carries on from
  // the restored position.
  useEffect(() => {
    if (!remember) return

    let saved = null
    try {
      saved = JSON.parse(sessionStorage.getItem(REMEMBER_KEY) ?? 'null')
    } catch {
      return
    }
    if (!saved?.track?.id || !saved.track.src) return

    trackRef.current = saved.track
    pendingSeekRef.current = saved.position ?? 0
    setTrack(saved.track)
    setDuration(saved.track.duration ?? NaN)
    setCurrentTime(saved.position ?? 0)

    if (Array.isArray(saved.queue)) {
      queueRef.current = saved.queue
      setQueue(saved.queue)
    }
  }, [remember])

  useEffect(() => {
    if (!remember) return

    const write = () => {
      try {
        if (!trackRef.current) {
          sessionStorage.removeItem(REMEMBER_KEY)
          return
        }
        sessionStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({
            track: trackRef.current,
            queue: queueRef.current,
            position: audioRef.current?.currentTime ?? 0,
          }),
        )
      } catch {
        // Private browsing, a full quota, storage switched off. Losing the
        // position is not worth breaking the page over.
      }
    }

    // pagehide rather than beforeunload: the one iOS Safari reliably fires.
    // visibilitychange too, because a phone may never come back to fire it.
    window.addEventListener('pagehide', write)
    document.addEventListener('visibilitychange', write)

    return () => {
      write()
      window.removeEventListener('pagehide', write)
      document.removeEventListener('visibilitychange', write)
    }
  }, [remember])

  // Space to play and pause. Ignored inside anything with its own idea of what
  // a space bar means — a search box, or a button, where space is how you press
  // it — and preventDefault only after that, so space still scrolls the page.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== ' ' && event.code !== 'Space') return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const el = document.activeElement
      const tag = el?.tagName
      if (
        el?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        tag === 'BUTTON' ||
        tag === 'A'
      ) {
        return
      }

      if (!trackRef.current) return

      event.preventDefault()
      if (audioRef.current?.paused) play(trackRef.current)
      else audioRef.current?.pause()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play])

  const index = queue.findIndex((item) => item.id === track?.id)
  const hasNext = index !== -1 && index < queue.length - 1

  // The controls that are not on the page: a pinch on a pair of AirPods, a car
  // stereo, a lock screen, the media keys on a keyboard. All of them talk to
  // the Media Session API and none of them can see the site.
  //
  // The metadata is the other half. A lock screen showing "frankkirwan.com" is
  // a browser tab; one showing the song, Frank and the musical is a record.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    const session = navigator.mediaSession

    if (!track) {
      session.metadata = null
      session.playbackState = 'none'
      return
    }

    // Absolute: this is handed to the OS, which has no notion of the document
    // it came from.
    const artwork = track.artwork ?? portrait
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: 'Frank Kirwan',
      // The musical for a demo, the site for a single: never blank, never wrong.
      album: track.album ?? 'frankkirwan.com',
      artwork: [{ src: new URL(artwork, window.location.origin).href }],
    })

    session.playbackState = playing ? 'playing' : 'paused'
  }, [track, playing])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    const session = navigator.mediaSession

    // Wrapped because registering an action a browser does not implement
    // throws, and one unsupported action should not cost the others.
    const set = (action, handler) => {
      try {
        session.setActionHandler(action, handler)
      } catch {
        // Not supported here. The button simply stays inert, as it did before.
      }
    }

    set('play', () => trackRef.current && play(trackRef.current))
    set('pause', () => audioRef.current?.pause())
    set('stop', clear)

    set('previoustrack', previous)
    // null tells the platform to grey the button out rather than offer a
    // control that does nothing. Previous is always live: at the top of a list
    // it restarts.
    set('nexttrack', hasNext ? next : null)

    set('seekbackward', (details) => {
      const element = audioRef.current
      if (element) seek(Math.max(0, element.currentTime - (details?.seekOffset ?? 10)))
    })

    set('seekforward', (details) => {
      const element = audioRef.current
      if (!element) return
      const to = element.currentTime + (details?.seekOffset ?? 10)
      seek(Number.isFinite(element.duration) ? Math.min(to, element.duration) : to)
    })

    // Dragging the scrubber on a lock screen or in a car.
    set('seekto', (details) => {
      if (typeof details?.seekTime !== 'number') return
      if (details.fastSeek && audioRef.current?.fastSeek) {
        audioRef.current.fastSeek(details.seekTime)
        return
      }
      seek(details.seekTime)
    })

    return () => {
      for (const action of [
        'play',
        'pause',
        'stop',
        'previoustrack',
        'nexttrack',
        'seekbackward',
        'seekforward',
        'seekto',
      ]) {
        set(action, null)
      }
    }
  }, [play, clear, previous, next, seek, hasNext])

  // Where the lock screen's own scrub bar sits. The browser keeps this in step
  // with a real <audio> element most of the time; setting it explicitly makes
  // it right immediately after a seek rather than at the next update.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    if (!navigator.mediaSession.setPositionState) return
    if (!track || !Number.isFinite(duration) || duration <= 0) return

    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audioRef.current?.playbackRate ?? 1,
        // Clamped: the spec rejects a position past the duration, and the two
        // can disagree by a frame at the very end of a track.
        position: Math.min(Math.max(currentTime, 0), duration),
      })
    } catch {
      // Engines differ on how strict they are about these numbers, and a lock
      // screen scrubber that lags is not worth an exception.
    }
  }, [track, duration, currentTime])


  const value = useMemo(
    () => ({
      track,
      playing,
      currentTime,
      duration,
      hasMetadata,
      hasNext,
      play,
      pause,
      stop,
      clear,
      seek,
      next,
      previous,
    }),
    [
      track,
      playing,
      currentTime,
      duration,
      hasMetadata,
      hasNext,
      play,
      pause,
      stop,
      clear,
      seek,
      next,
      previous,
    ],
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
          // On through the list. Nine demos from one musical are meant to be
          // heard in order; the last track simply stops.
          next()
        }}
        onLoadedMetadata={(event) => {
          // The file's own length replaces the recorded one, so a stale
          // duration in the database cannot outlive the first play.
          setDuration(event.currentTarget.duration)
          setHasMetadata(true)

          // A restored position, applied at the first moment it can be.
          if (pendingSeekRef.current !== null) {
            const to = Math.min(pendingSeekRef.current, event.currentTarget.duration - 0.5)
            pendingSeekRef.current = null
            if (to > 0) {
              event.currentTarget.currentTime = to
              setCurrentTime(to)
            }
          }
        }}
      />
      {children}
    </PlaybackContext.Provider>
  )
}

export default PlaybackProvider
