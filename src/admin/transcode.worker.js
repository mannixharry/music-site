// Encodes already-decoded PCM into an MP3 the site can stream.
//
// This runs in the browser because it has to: the Workers free plan allows 10ms
// of CPU per request, and encoding a five-minute track takes tens of seconds.
// It runs off the main thread because otherwise the page would freeze for all
// of that time.
//
// Decoding happens in upload.js, on the main thread, because it must:
// OfflineAudioContext — the whole Web Audio API — is not exposed to workers.
// That split is fine, since decoding is native and quick while encoding is the
// long JavaScript loop below.
//
// Protocol: postMessage({ left, right, channels, sampleRate }) in, and a stream
// of { type: 'progress' | 'done' | 'error' } back out.

import { Mp3Encoder } from '@breezystack/lamejs'

// One place to change the trade between file size and fidelity. 128kbps stereo
// at 44.1k is about 1MB per minute — small enough to stream on a phone, and
// well clear of the artefacts that make an acoustic guitar sound underwater.
const BITRATE_KBPS = 128
// LAME consumes exactly this many samples per frame; other sizes work but cost
// a copy per block.
const SAMPLES_PER_FRAME = 1152

// Float PCM in [-1, 1] to the signed 16-bit LAME expects. Clamping matters: a
// track mastered hot can exceed 1.0 and would otherwise wrap from loud positive
// to loud negative, which is audible as a click.
function toInt16(input) {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]))
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output
}

self.onmessage = (event) => {
  const { left, right, channels, sampleRate } = event.data

  try {
    const leftPcm = toInt16(left)
    const rightPcm = channels > 1 ? toInt16(right) : leftPcm

    const encoder = new Mp3Encoder(channels, sampleRate, BITRATE_KBPS)
    const parts = []

    for (let offset = 0; offset < leftPcm.length; offset += SAMPLES_PER_FRAME) {
      const chunk = encoder.encodeBuffer(
        leftPcm.subarray(offset, offset + SAMPLES_PER_FRAME),
        channels > 1 ? rightPcm.subarray(offset, offset + SAMPLES_PER_FRAME) : undefined,
      )
      if (chunk.length > 0) parts.push(chunk)

      // Roughly every 50 frames — about 1.3 seconds of audio. Often enough that
      // the bar moves, rarely enough that posting messages is not the slow part.
      if ((offset / SAMPLES_PER_FRAME) % 50 === 0) {
        self.postMessage({ type: 'progress', ratio: offset / leftPcm.length })
      }
    }

    const tail = encoder.flush()
    if (tail.length > 0) parts.push(tail)

    self.postMessage({ type: 'done', blob: new Blob(parts, { type: 'audio/mpeg' }) })
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error?.message ?? 'The audio could not be converted.',
    })
  }
}
