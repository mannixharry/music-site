// Drawing an audio file as a shape you can aim at.
//
// This decodes the file a second time — the upload decodes it again later, on
// its way to the encoder — and that is a deliberate trade. Threading one
// AudioBuffer from here into the upload would save about a second and tie the
// trimmer to the pipeline's internals for the rest of its life. Decoding is
// native and quick; what is slow enough to have its own worker is the encode.
//
// What is kept afterwards is the peaks array and a number, a few kilobytes.
// The AudioBuffer itself goes out of scope here rather than being held for the
// length of the edit, which matters: five minutes of stereo is about 100MB of
// float samples, and playback runs off an <audio> element streaming the same
// file, not off this.

const SAMPLE_RATE = 44100

// One bar per bucket, and about one bucket per pixel of a wide editor. Enough
// that a drum hit is a mark you can aim at rather than an average.
function peaksFrom(audio, buckets) {
  // The loudest channel would be more faithful, and doubles the scan of what
  // may be twenty million samples. One channel is a representative silhouette,
  // which is all this has to be.
  const samples = audio.getChannelData(0)
  const per = Math.max(1, Math.floor(samples.length / buckets))
  const peaks = new Float32Array(buckets)

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const from = bucket * per
    const to = Math.min(samples.length, from + per)

    let loudest = 0
    for (let i = from; i < to; i += 1) {
      const level = Math.abs(samples[i])
      if (level > loudest) loudest = level
    }
    peaks[bucket] = loudest
  }

  return peaks
}

export async function decodeForWaveform(file, buckets) {
  // Same fixed rate as the upload's own decode, so a position read off this
  // picture means the same thing to the encoder. The 1-frame length is a
  // placeholder; the decoded buffer is its own.
  const context = new OfflineAudioContext(1, 1, SAMPLE_RATE)
  const audio = await context.decodeAudioData(await file.arrayBuffer())

  return { peaks: peaksFrom(audio, buckets), duration: audio.duration }
}

// Bars inside the selection are drawn dark and the rest pale, so what is being
// kept is legible at a glance rather than only from the handles' positions.
export function drawWaveform(canvas, peaks, { duration, range, playhead }) {
  if (!canvas || !peaks || !duration) return

  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) return

  // Resizing clears and reallocates the backing store, so only when it has
  // actually changed — this runs on every animation frame while playing.
  const dpr = window.devicePixelRatio || 1
  const backingWidth = Math.round(width * dpr)
  const backingHeight = Math.round(height * dpr)
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth
    canvas.height = backingHeight
  }

  const context = canvas.getContext('2d')
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)

  const middle = height / 2
  const step = width / peaks.length

  for (let i = 0; i < peaks.length; i += 1) {
    const at = (i / peaks.length) * duration
    const inside = at >= range.start && at <= range.end

    // gray-700 against gray-300 — the same two greys the rest of the admin
    // uses for "this" against "not this".
    context.fillStyle = inside ? '#374151' : '#d1d5db'

    const bar = Math.max(1, peaks[i] * (height - 4))
    context.fillRect(i * step, middle - bar / 2, Math.max(1, step - 0.5), bar)
  }

  if (playhead !== null && playhead >= 0) {
    context.fillStyle = '#111827'
    context.fillRect((playhead / duration) * width - 1, 0, 2, height)
  }
}
