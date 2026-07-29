import { useCallback, useState } from 'react'
import { canUseDirectly, contentTypeFor, readDuration, transcode, uploadFile } from './upload'

const IDLE = { phase: 'idle', ratio: 0, message: '', error: null }

function extensionOf(file) {
  return file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
}

// Keys are unique per upload rather than per song, so replacing a track never
// serves the old bytes from a cache. That is what lets the media domain send
// `immutable` with a year-long max-age.
function webKeyFor(songId) {
  return `web/${songId}/${crypto.randomUUID().slice(0, 8)}.mp3`
}

function masterKeyFor(songId, file) {
  return `masters/${songId}/${crypto.randomUUID().slice(0, 8)}.${extensionOf(file)}`
}

// Drives one file from "dropped" to "playing on the site". `patch` is called
// twice on the slow path — once the master is safely stored and again once the
// web version exists — because the gap between them is where things fail.
export function useUpload({ songId, capabilities, patch }) {
  const [status, setStatus] = useState(IDLE)

  const reset = useCallback(() => setStatus(IDLE), [])

  const start = useCallback(
    async (file) => {
      try {
        // The quick path: it is already something browsers stream, and small
        // enough to serve untouched. No decode, so nothing to go wrong.
        if (canUseDirectly(file)) {
          setStatus({ phase: 'uploading', ratio: 0, message: 'Uploading…', error: null })

          const key = webKeyFor(songId)
          const { size } = await uploadFile({
            file,
            key,
            bucket: 'media',
            capabilities,
            onProgress: (ratio) => setStatus((s) => ({ ...s, ratio })),
          })

          const duration = await readDuration(file)
          await patch({ webKey: key, webBytes: size, duration })

          setStatus({ phase: 'done', ratio: 1, message: 'Uploaded.', error: null })
          return
        }

        // The slow path. Store the original first and record it immediately: if
        // the decode then fails, or the tab is closed mid-encode, the upload is
        // not lost — the song simply sits with a master and no web version, and
        // can be retried.
        setStatus({ phase: 'uploading', ratio: 0, message: 'Uploading master…', error: null })

        const masterKey = masterKeyFor(songId, file)
        const { size: masterBytes } = await uploadFile({
          file,
          key: masterKey,
          bucket: 'masters',
          capabilities,
          onProgress: (ratio) => setStatus((s) => ({ ...s, ratio })),
        })

        await patch({ masterKey, masterBytes, masterMime: contentTypeFor(file) })

        setStatus({ phase: 'transcoding', ratio: 0, message: 'Converting…', error: null })
        const { blob, duration } = await transcode(file, (ratio) =>
          setStatus((s) => ({ ...s, ratio })),
        )

        setStatus({ phase: 'uploading', ratio: 0, message: 'Uploading web version…', error: null })
        const webKey = webKeyFor(songId)
        await uploadFile({
          file: new File([blob], 'web.mp3', { type: 'audio/mpeg' }),
          key: webKey,
          bucket: 'media',
          capabilities,
          onProgress: (ratio) => setStatus((s) => ({ ...s, ratio })),
        })

        await patch({ webKey, webBytes: blob.size, duration })
        setStatus({ phase: 'done', ratio: 1, message: 'Uploaded and converted.', error: null })
      } catch (error) {
        setStatus({ phase: 'error', ratio: 0, message: '', error: error.message })
      }
    },
    [songId, capabilities, patch],
  )

  return { status, start, reset }
}
