import { useCallback, useEffect, useRef, useState } from 'react'
import { formatTime } from '../format'
import { decodeForWaveform, drawWaveform } from './waveform'

const BUCKETS = 800
const MIN_LENGTH_S = 1
const DEFAULT_LENGTH_S = 30

// Dragging a handle plays from it, so you hear where the cut lands. Seeking on
// every pointer event would make the seeking itself the sound; a tenth of a
// second is often enough to follow the handle and slow enough to be audio.
const SCRUB_SEEK_MS = 100

// Arrow keys for the same job as the mouse, since placing a cut to the quarter
// second by dragging is luck. Shift covers ground.
const NUDGE_S = 0.25
const NUDGE_COARSE_S = 2

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

function Transport({ label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border border-gray-500 bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
    >
      {label}
    </button>
  )
}

// The file has been chosen but nothing has been uploaded yet — this is where
// the cut gets decided, and nothing leaves the browser until "Upload this
// preview".
function SnippetTrimmer({ file, onCancel, onConfirm }) {
  const audioRef = useRef(null)
  const trackRef = useRef(null)
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  // Where playback should stop, for auditioning just the selection. Null means
  // "play on to the end of the file".
  const stopAtRef = useRef(null)
  const lastSeekRef = useRef(0)
  const dragRef = useRef(null)

  const [url, setUrl] = useState(null)
  const [audio, setAudio] = useState({ phase: 'decoding', peaks: null, duration: 0, error: null })
  const [range, setRange] = useState({ start: 0, end: 0 })
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  // Bumped by the resize observer purely to force a redraw at the new width.
  const [resized, setResized] = useState(0)

  const { duration } = audio
  const ready = audio.phase === 'ready'

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  useEffect(() => {
    let cancelled = false
    setAudio({ phase: 'decoding', peaks: null, duration: 0, error: null })

    decodeForWaveform(file, BUCKETS).then(
      ({ peaks, duration: length }) => {
        if (cancelled) return
        setAudio({ phase: 'ready', peaks, duration: length, error: null })
        setRange({ start: 0, end: Math.min(DEFAULT_LENGTH_S, length) })
      },
      (error) => {
        if (cancelled) return
        // Browsers disagree about AIFF, ALAC and some WAVs. The upload would
        // fail on the same file for the same reason, so say so here instead.
        setAudio({
          phase: 'error',
          peaks: null,
          duration: 0,
          error: error?.message ?? 'That file could not be decoded.',
        })
      },
    )

    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    if (!ready) return
    drawWaveform(canvasRef.current, audio.peaks, { duration, range, playhead })
  }, [ready, audio.peaks, duration, range, playhead, resized])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setResized((count) => count + 1))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [ready])

  const tick = useCallback(() => {
    const element = audioRef.current
    if (!element) return

    setPlayhead(element.currentTime)

    if (stopAtRef.current !== null && element.currentTime >= stopAtRef.current) {
      element.pause()
      return
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  // `from` of null means "carry on from wherever it is".
  const play = useCallback((from, stopAt = null) => {
    const element = audioRef.current
    if (!element) return

    stopAtRef.current = stopAt
    if (from !== null) {
      element.currentTime = from
      setPlayhead(from)
    }
    // Rejects under autoplay policy and on rapid play/pause; both are
    // recoverable by pressing the button again, and neither is worth a message.
    element.play().catch(() => {})
  }, [])

  const pause = useCallback(() => audioRef.current?.pause(), [])

  function timeAt(clientX) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect?.width) return 0
    return clamp(((clientX - rect.left) / rect.width) * duration, 0, duration)
  }

  function beginDrag(event, kind) {
    if (!ready) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    dragRef.current = { kind, grabbedAt: timeAt(event.clientX), from: range }
    lastSeekRef.current = 0
    // The scrub: hearing the moment you are placing is the whole reason this
    // beat typing two times into a box.
    play(kind === 'end' ? range.end : range.start)
  }

  function onDragMove(event) {
    const drag = dragRef.current
    if (!drag) return

    const at = timeAt(event.clientX)
    let next

    if (drag.kind === 'start') {
      next = { start: clamp(at, 0, range.end - MIN_LENGTH_S), end: range.end }
    } else if (drag.kind === 'end') {
      next = { start: range.start, end: clamp(at, range.start + MIN_LENGTH_S, duration) }
    } else {
      // The whole window, keeping its length — this is the move that finds the
      // same phrase a bar later.
      const length = drag.from.end - drag.from.start
      const start = clamp(drag.from.start + (at - drag.grabbedAt), 0, duration - length)
      next = { start, end: start + length }
    }

    setRange(next)

    const now = performance.now()
    if (now - lastSeekRef.current > SCRUB_SEEK_MS) {
      lastSeekRef.current = now
      const element = audioRef.current
      if (element) element.currentTime = drag.kind === 'end' ? next.end : next.start
    }
  }

  function endDrag(event) {
    if (!dragRef.current) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    pause()
  }

  function nudge(kind, delta) {
    setRange((current) =>
      kind === 'start'
        ? { ...current, start: clamp(current.start + delta, 0, current.end - MIN_LENGTH_S) }
        : { ...current, end: clamp(current.end + delta, current.start + MIN_LENGTH_S, duration) },
    )
  }

  function onHandleKeyDown(event, kind) {
    const step = event.shiftKey ? NUDGE_COARSE_S : NUDGE_S
    if (event.key === 'ArrowLeft') nudge(kind, -step)
    else if (event.key === 'ArrowRight') nudge(kind, step)
    else return
    event.preventDefault()
  }

  if (audio.phase === 'decoding') {
    return (
      <div className="border border-gray-400 bg-gray-100 p-4 text-sm">
        Loading the audio…
      </div>
    )
  }

  if (audio.phase === 'error') {
    return (
      <div className="border border-gray-500 bg-gray-100 p-3 text-sm">
        <p className="font-bold">That audio could not be read</p>
        <p className="mt-1 text-xs">{audio.error}</p>
        <p className="mt-1 text-xs">
          Some formats only work in some browsers. Try again in a different browser, or upload
          an MP3 version of the song.
        </p>
        <button type="button" onClick={onCancel} className="mt-2 text-sm underline">
          Go back
        </button>
      </div>
    )
  }

  const percent = (at) => `${(at / duration) * 100}%`
  const length = range.end - range.start

  const handleClass =
    'absolute inset-y-0 z-10 w-3 -translate-x-1/2 cursor-ew-resize border border-gray-900 bg-gray-800 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900'

  return (
    <div className="border border-gray-400 bg-white p-3">
      <audio
        ref={audioRef}
        src={url ?? undefined}
        preload="auto"
        onPlay={() => {
          setPlaying(true)
          cancelAnimationFrame(frameRef.current)
          frameRef.current = requestAnimationFrame(tick)
        }}
        onPause={() => {
          setPlaying(false)
          cancelAnimationFrame(frameRef.current)
        }}
        onEnded={() => setPlaying(false)}
      />

      <p className="font-mono text-xs text-gray-600">
        {file.name} · {formatTime(duration)}
      </p>

      <div className="relative mt-2 select-none">
        <canvas ref={canvasRef} className="block h-24 w-full border border-gray-400 bg-white" />

        {/* Sits over the canvas and owns every pointer event, so the drawing
            below stays a drawing and never has to know about input. */}
        <div
          ref={trackRef}
          className="absolute inset-0"
          onPointerDown={(event) => {
            // A press on the bare track is a seek, not a drag — the handles
            // and the window stop this from reaching here.
            const at = timeAt(event.clientX)
            setPlayhead(at)
            if (playing) play(at, stopAtRef.current)
            else if (audioRef.current) audioRef.current.currentTime = at
          }}
        >
          {/* Everything outside the selection, washed out. Not interactive:
              these must not swallow presses meant for the track. */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 bg-white/65"
            style={{ width: percent(range.start) }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 bg-white/65"
            style={{ width: percent(duration - range.end) }}
          />

          <div
            className="absolute inset-y-0 z-0 cursor-grab border-y-2 border-gray-800 active:cursor-grabbing"
            style={{ left: percent(range.start), width: percent(length) }}
            onPointerDown={(event) => beginDrag(event, 'window')}
            onPointerMove={onDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />

          {[
            { kind: 'start', at: range.start, label: 'Preview start' },
            { kind: 'end', at: range.end, label: 'Preview end' },
          ].map((handle) => (
            <div
              key={handle.kind}
              role="slider"
              tabIndex={0}
              aria-label={handle.label}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(handle.at)}
              aria-valuetext={formatTime(handle.at)}
              className={handleClass}
              style={{ left: percent(handle.at) }}
              onPointerDown={(event) => beginDrag(event, handle.kind)}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(event) => onHandleKeyDown(event, handle.kind)}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs">
        <span>
          {formatTime(range.start)} → {formatTime(range.end)}
        </span>
        <span className="font-bold">{formatTime(length)} preview</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Transport
          label={playing ? 'Pause' : 'Play'}
          onClick={() => (playing ? pause() : play(null, null))}
        />
        <Transport label="Play preview" onClick={() => play(range.start, range.end)} />
        <button
          type="button"
          onClick={() => onConfirm({ start: range.start, end: range.end })}
          className="ml-auto border border-gray-500 bg-gray-200 px-3 py-1 text-sm font-bold"
        >
          Use this preview
        </button>
        <button type="button" onClick={onCancel} className="text-sm underline">
          Cancel
        </button>
      </div>

      <p className="mt-2 text-xs text-gray-600">
        Drag the two bars to set where the preview starts and ends, or drag the middle to move
        the whole thing. You will hear the song as you drag. Arrow keys nudge a bar slightly —
        hold shift to move further.
      </p>
    </div>
  )
}

export default SnippetTrimmer
