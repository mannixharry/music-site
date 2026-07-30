// The mechanics of getting a file into R2. No React here — useUpload drives it.

import TranscodeWorker from './transcode.worker.js?worker'
import { clipToSnippet } from './snippet'

// Formats worth trying to transcode. The server checks this list again before
// it will store anything; this copy is here to fail fast and say why.
export const ACCEPTED = '.mp3,.m4a,.aac,.wav,.aiff,.aif,.flac,.ogg'

const EXTENSION_TYPES = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  aiff: 'audio/aiff',
  aif: 'audio/aiff',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
}

// Browsers disagree about what to put in File.type — Windows in particular
// hands back "" for .flac and .aiff. The extension is the more reliable signal,
// and the server validates whatever we claim, so guessing here is safe.
export function contentTypeFor(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return EXTENSION_TYPES[extension] ?? file.type ?? 'application/octet-stream'
}

// Already a streamable format and small enough to serve as-is. This is Frank's
// likely common case — he exports an MP3 from his DAW — and it skips the
// slowest, most failure-prone step entirely.
const DIRECT_LIMIT = 12 * 1024 * 1024
export function canUseDirectly(file) {
  const type = contentTypeFor(file)
  return (type === 'audio/mpeg' || type === 'audio/mp4') && file.size <= DIRECT_LIMIT
}

// XHR rather than fetch: fetch still has no upload progress event, and a
// 200MB master with no feedback looks indistinguishable from a hang.
function put(url, body, { contentType, onProgress, headers = {} }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url, true)
    // Must match what was signed, byte for byte, or R2 rejects the signature.
    xhr.setRequestHeader('content-type', contentType)
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(xhr.responseText)
        : reject(new Error(`Upload failed (${xhr.status}) ${xhr.responseText.slice(0, 200)}`))
    xhr.onerror = () => reject(new Error('Upload failed — the connection dropped.'))

    xhr.send(body)
  })
}

// Two ways in, chosen by what the environment can do rather than by sniffing
// hostnames. Locally the file streams through the Worker into the emulated
// bucket; deployed, the browser is handed a presigned URL and talks to R2
// directly, so the audio never touches the Worker's 10ms CPU budget or runs
// into its 100MB body limit.
//
// No bucket argument: the key's prefix decides which bucket an object lands in,
// and that decision is the Worker's alone — see PREFIX_RULES in worker/validate.js.
// `contentType` is passed in rather than derived, because this moves cover art as
// well as audio and the two guess it from different tables.
export async function uploadFile({ file, key, contentType, capabilities, onProgress }) {
  if (capabilities.presign) {
    const response = await fetch('/api/admin/uploads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, contentType, size: file.size }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Could not start the upload')

    await put(data.uploadUrl, file, { contentType, onProgress })
    return { key: data.key, size: file.size }
  }

  const query = new URLSearchParams({ key })
  await put(`/api/admin/blob?${query}`, file, { contentType, onProgress })
  return { key, size: file.size }
}

// Fixed rather than inherited from the device, so the same upload gives the
// same output on every machine — decodeAudioData resamples to the context's
// rate. The 1-frame length is a placeholder; the decoded buffer is its own.
const SAMPLE_RATE = 44100

// Decoding must happen here, on the main thread: the Web Audio API is not
// exposed to Web Workers, so an OfflineAudioContext inside one is simply
// undefined. It is native and quick, though — the long JavaScript loop is the
// MP3 encoding, and that is what gets handed off.
async function decode(file) {
  const context = new OfflineAudioContext(2, 1, SAMPLE_RATE)
  const audio = await context.decodeAudioData(await file.arrayBuffer())

  const channels = Math.min(audio.numberOfChannels, 2)
  // Copied out of the AudioBuffer so the underlying buffers can be transferred
  // to the worker without detaching anything the AudioBuffer still owns.
  const left = audio.getChannelData(0).slice()
  const right = channels > 1 ? audio.getChannelData(1).slice() : new Float32Array(0)

  return { left, right, channels, duration: audio.duration }
}

// Resolves with an MP3 blob and the duration read while decoding, which is the
// value the player trusts and shows before it has fetched a byte.
//
// Given a `snippet` range, the decoded audio is cut down to it first and the
// duration returned is the cut's, not the file's — so the object that reaches
// the public bucket is the preview and nothing longer has ever left the
// browser. `range` comes back as what was actually used, since clipToSnippet
// clamps to what the file turned out to contain.
export async function transcode(file, onProgress, snippet = null) {
  const decoded = await decode(file)
  const { left, right, channels, duration, range } = snippet
    ? clipToSnippet(decoded, snippet, SAMPLE_RATE)
    : { ...decoded, range: null }

  const blob = await new Promise((resolve, reject) => {
    const worker = new TranscodeWorker()

    worker.onmessage = (event) => {
      const { type, ratio, blob: encoded, message } = event.data
      if (type === 'progress') return onProgress?.(ratio)

      worker.terminate()
      if (type === 'done') resolve(encoded)
      else reject(new Error(message))
    }

    worker.onerror = () => {
      worker.terminate()
      reject(new Error('The encoder failed to start.'))
    }

    // Transferred, not copied — a decoded five-minute track is over 100MB of
    // float samples and there is no reason to hold two of them.
    worker.postMessage({ left, right, channels, sampleRate: SAMPLE_RATE }, [
      left.buffer,
      right.buffer,
    ])
  })

  return { blob, duration, range }
}

// For the direct path, where nothing has decoded the audio and the length still
// has to come from somewhere. Resolves null rather than rejecting: a missing
// duration costs the player its readout, not its ability to play.
export function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    const finish = (value) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }

    audio.preload = 'metadata'
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) ? audio.duration : null)
    audio.onerror = () => finish(null)
    audio.src = url
  })
}
