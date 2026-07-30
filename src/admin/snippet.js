// Making a preview: the arithmetic of cutting decoded audio down to the few
// seconds of it that go on the website, and the two helpers the form needs to
// read and write times.
//
// Why the cut happens here, before the upload, rather than being a start/end
// pair the player honours: media.frankkirwan.com fronts the whole public
// bucket, so every object in it can be fetched by anyone who knows the key. A
// player that agreed to stop at 1:15 would still be sitting on top of the
// complete recording. Cutting first means the full song only ever exists in
// MASTERS, which has no custom domain and nothing else pointing at it.

// A hard cut at both ends sounds like a file that failed to finish
// downloading. These are short enough not to eat the preview and long enough
// that it reads as an ending.
const FADE_IN_S = 0.015
const FADE_OUT_S = 0.75

// In place — the caller owns freshly sliced arrays, and a preview is small
// enough that the copy would not matter anyway; this is just where it belongs.
function applyFades(samples, sampleRate) {
  const rise = Math.min(Math.floor(FADE_IN_S * sampleRate), samples.length)
  for (let i = 0; i < rise; i += 1) samples[i] *= i / rise

  // Never more than a third of the preview, so a ten-second cut does not spend
  // most of itself fading out.
  const fall = Math.min(Math.floor(FADE_OUT_S * sampleRate), Math.floor(samples.length / 3))
  for (let i = 0; i < fall; i += 1) samples[samples.length - 1 - i] *= i / fall
}

// Takes what decode() produced and returns the same shape holding only `range`.
//
// The range is clamped to what the file turned out to contain rather than
// trusted: the form has no idea how long the track is until it has been decoded
// here, so "start at 0:30, run for a minute" against a 45-second recording is an
// ordinary thing to be asked for and a bad thing to refuse. Asking for a preview
// that starts after the end is not, and throws.
export function clipToSnippet({ left, right, channels, duration }, range, sampleRate) {
  const start = Math.max(0, range.start)
  const end = Math.min(range.end, duration)

  if (!(end > start)) {
    throw new Error(
      `The preview starts at ${formatTime(start)} but the track is only ${formatTime(duration)} long.`,
    )
  }

  const from = Math.floor(start * sampleRate)
  const to = Math.min(left.length, Math.ceil(end * sampleRate))

  // slice(), so what goes to the encoder is a fresh buffer that can be
  // transferred without detaching anything the caller still holds.
  const clippedLeft = left.slice(from, to)
  const clippedRight = channels > 1 ? right.slice(from, to) : new Float32Array(0)

  applyFades(clippedLeft, sampleRate)
  if (channels > 1) applyFades(clippedRight, sampleRate)

  return {
    left: clippedLeft,
    right: clippedRight,
    channels,
    duration: (to - from) / sampleRate,
    // What was actually used, not what was asked for — this is what gets
    // recorded, so it has to survive the clamping above.
    range: { start, end },
  }
}

// "45", "0:45" and "1:05.5" all mean what they look like: Frank types whatever
// he is reading off a player. Returns null for anything it cannot make sense
// of, and the form treats that as "not ready to upload" rather than guessing.
export function parseTime(input) {
  const text = String(input).trim()
  if (!text) return null

  const parts = text.split(':')
  if (parts.length > 2) return null

  const numbers = parts.map((part) => (part === '' ? 0 : Number(part)))
  if (numbers.some((value) => !Number.isFinite(value) || value < 0)) return null

  return parts.length === 2 ? numbers[0] * 60 + numbers[1] : numbers[0]
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '--:--'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

// The form's two fields — held as strings, because they are half-typed most of
// the time — turned into the range an upload wants, or null when they do not
// yet add up to one. Null is what stops the form accepting a file: without a
// range there is nothing to cut to, and uploading anyway would publish the
// whole song under a row calling it a preview.
export function toRange({ enabled, start: startText, length: lengthText }) {
  if (!enabled) return null

  const start = parseTime(startText)
  const length = parseTime(lengthText)
  if (start === null || length === null || length <= 0) return null

  return { start, end: start + length }
}
