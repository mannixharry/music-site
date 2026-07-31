import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlaybackContext } from '../context/playbackContext'
// The fallback lock-screen artwork: a song with no cover of its own still shows
// a photograph of the person who wrote it rather than a browser icon.
import portrait from '../images/frank-kirwan-672.jpg'

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
// `remember` is opt-in, and only the public site opts in. The admin mounts its
// own provider for the preview player inside the song form, and restoring a
// half-played demo into that on every page load would be noise in a place that
// is meant to be a workbench.
const REMEMBER_KEY = 'playback'

function PlaybackProvider({ children, remember = false }) {
  const audioRef = useRef(null)
  const frameRef = useRef(0)
  // What the element is actually pointed at, kept in a ref as well as in state.
  // The ref is the one the handlers read, because they have to know *now* — see
  // the note on play() below.
  const trackRef = useRef(null)
  // Which track the <audio> element is actually pointed at, which is not always
  // the one being displayed: a restored session shows a track before anything
  // has been loaded, and the first press of play is what loads it.
  const loadedIdRef = useRef(null)
  // Where to move to once the file has enough of itself to be moved. Seeking an
  // element that has not loaded throws, so a restored position has to wait.
  const pendingSeekRef = useRef(null)
  // The list the current track was started from, so there is something for
  // "next" to mean.
  const queueRef = useRef([])

  // The whole track, not just its id — the bar at the bottom has to name what
  // is playing after you have left the page the row was on.
  const [track, setTrack] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(NaN)
  // Seeking a track the browser has not fetched throws InvalidStateError, so
  // the scrubber waits for the element even when the length is already known.
  const [hasMetadata, setHasMetadata] = useState(false)
  // In state as well as in the ref because the strip's next and previous
  // buttons have to redraw when the list changes under them.
  const [queue, setQueue] = useState([])

  // rAF rather than timeupdate, which fires about four times a second and makes
  // the scrubber visibly step — but not a React update on every frame.
  //
  // Measured on a 6×-throttled phone: playing one song cost a quarter of the
  // main thread, and only about a sixth of that was the twenty other players on
  // the page re-rendering. The rest was this loop asking React to render sixty
  // times a second so a bar could move. It does not need to. A scrub bar is a
  // few hundred pixels wide, so the shortest song here moves the thumb about
  // eleven pixels a second and a full-length demo moves it one — an update
  // every 80ms is under a pixel of travel either way, which is invisible, and a
  // fifth of the work.
  //
  // Still driven by rAF rather than an interval, because rAF stops while the
  // tab is in the background and an interval keeps burning battery there. The
  // frame callback still runs sixty times a second; most of those times all it
  // does is compare two numbers.
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
  const play = useCallback((next, nextQueue) => {
    const element = audioRef.current
    if (!element) return

    // The list this was started from, if the caller knows one. Kept when it is
    // not given, so pressing play on the bar does not empty the queue the row
    // set up.
    if (nextQueue) {
      queueRef.current = nextQueue
      setQueue(nextQueue)
    }

    // A song the element is not pointed at: point it there and start from the
    // top. One it is already pointed at: carry on from where it was, which is
    // what makes pressing play on the bar and on the row the same button.
    //
    // Compared against what is *loaded* rather than what is displayed. After a
    // reload the strip shows a track the element has never seen, and comparing
    // against the displayed one would skip the load and play silence.
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
    const target = queueRef.current[at() + 1]
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
    const target = queueRef.current[at() - 1]
    if (target) play(target)
    else seek(0)
  }, [at, play, seek])

  // Remembering where you were.
  //
  // A refresh, or a link out and back, used to stop the music and forget it
  // entirely. What is written down is the track, the list it came from and the
  // position — enough to put the strip back exactly as it was, paused.
  //
  // sessionStorage rather than localStorage on purpose: this is meant to
  // survive a reload and an accidental back button, not to greet someone a week
  // later with a half-played demo they have forgotten starting.
  //
  // It restores paused, and cannot do otherwise: no browser will start audio on
  // a page the reader has not touched yet. So the strip comes back showing the
  // song and the position, and the first press of play carries on from there.
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
        // Private browsing, a full quota, a browser that has switched it off.
        // Losing the position is not worth breaking the page over.
      }
    }

    // pagehide rather than beforeunload: it is the one iOS Safari reliably
    // fires, and this is a phone feature more than a desktop one.
    window.addEventListener('pagehide', write)
    // And on the way into the background, because a phone may never come back
    // to fire pagehide at all.
    document.addEventListener('visibilitychange', write)

    return () => {
      write()
      window.removeEventListener('pagehide', write)
      document.removeEventListener('visibilitychange', write)
    }
  }, [remember])

  // Space to play and pause, which is the one shortcut everybody tries.
  //
  // Ignored while the reader is inside anything that has its own idea of what
  // a space bar means — a search box, or a button, where space is how you press
  // it. preventDefault only after that, so the page still scrolls with space
  // everywhere else on the site.
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
  const hasPrevious = index > 0

  // The controls that are not on the page.
  //
  // A pinch on a pair of AirPods, the play button on a car stereo, the lock
  // screen of a phone, the media keys on a keyboard: all of them talk to the
  // Media Session API and none of them can see the site. Without this they do
  // nothing at all, or — worse on iOS — they act on whatever the browser last
  // decided was the media on the page, which is a guess.
  //
  // Telling the operating system what is playing is the other half of it. A
  // phone showing "frankkirwan.com" on its lock screen is a browser tab; one
  // showing the song, Frank's name and the musical it comes from is a record.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    const session = navigator.mediaSession

    if (!track) {
      session.metadata = null
      session.playbackState = 'none'
      return
    }

    // Absolute, because this leaves the page: it is handed to the OS, which has
    // no notion of where the document it came from was.
    const artwork = track.artwork ?? portrait
    session.metadata = new MediaMetadata({
      title: track.title,
      artist: 'Frank Kirwan',
      // The musical for a demo; the site for a single, so the field is never
      // blank and never wrong.
      album: track.album ?? 'frankkirwan.com',
      artwork: [{ src: new URL(artwork, window.location.origin).href }],
    })

    session.playbackState = playing ? 'playing' : 'paused'
  }, [track, playing])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    const session = navigator.mediaSession

    // Every one of these is wrapped, because a browser that does not implement
    // an action throws when you try to register it, and one unsupported action
    // should not cost the others.
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

    // Registered as null when there is nowhere to go, which is how the platform
    // is told to grey the button out rather than offer a control that does
    // nothing. Previous is always live: at the top of a list it restarts.
    set('previoustrack', previous)
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

  // Where the lock screen's own scrub bar should sit. The browser keeps this in
  // step with a real <audio> element on its own most of the time; setting it
  // explicitly is what makes it right immediately after a seek rather than at
  // the next update.
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
      // Some engines are stricter than others about the numbers. A lock screen
      // scrubber that lags is not worth an exception.
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
      hasPrevious,
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
      hasPrevious,
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
          // On to the next one in the list this was started from. Nine demos
          // from one musical are meant to be heard in order, and pressing play
          // nine times is not listening to a show, it is operating a website.
          // The last track in a list simply stops.
          next()
        }}
        onLoadedMetadata={(event) => {
          // The file's own length replaces the recorded one, so a stale
          // duration in the database cannot outlive the first play.
          setDuration(event.currentTarget.duration)
          setHasMetadata(true)

          // A position restored from the last visit, applied at the first
          // moment the element is able to accept it.
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
