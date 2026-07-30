import { useCallback, useState } from 'react'
import { canUseImageDirectly, imageTypeFor, resizeCover } from './cover'
import { uploadFile } from './upload'

const IDLE = { phase: 'idle', ratio: 0, message: '', error: null }

function extensionOf(file) {
  return file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
}

// Unique per upload, not per song, so replacing a cover never serves the old
// bytes from a cache — the same reason webKeyFor works this way, and what lets
// the media domain send `immutable` with a year-long max-age.
function coverKeyFor(songId, extension) {
  return `covers/${songId}/${crypto.randomUUID().slice(0, 8)}.${extension}`
}

function coverMasterKeyFor(songId, file) {
  return `cover-masters/${songId}/${crypto.randomUUID().slice(0, 8)}.${extensionOf(file)}`
}

// The audio pipeline for artwork, and deliberately the same shape: the original
// goes to the private bucket and is recorded before anything else happens, so a
// failed resize or a closed tab leaves the upload recoverable rather than lost.
export function useCoverUpload({ songId, capabilities, patch }) {
  const [status, setStatus] = useState(IDLE)

  const reset = useCallback(() => setStatus(IDLE), [])

  const start = useCallback(
    async (file) => {
      try {
        setStatus({ phase: 'uploading', ratio: 0, message: 'Uploading original…', error: null })

        const coverMasterKey = coverMasterKeyFor(songId, file)
        const { size: coverMasterBytes } = await uploadFile({
          file,
          key: coverMasterKey,
          contentType: imageTypeFor(file),
          capabilities,
          onProgress: (ratio) => setStatus((s) => ({ ...s, ratio })),
        })
        await patch({ coverMasterKey, coverMasterBytes, coverMasterMime: imageTypeFor(file) })

        // Already a web format, already small, already no bigger than the site
        // draws it: the same bytes go to both buckets rather than being
        // re-encoded, because compressing a compressed image twice only loses.
        const direct = await canUseImageDirectly(file)

        let upload = file
        let contentType = imageTypeFor(file)
        let extension = extensionOf(file)

        if (!direct) {
          setStatus({ phase: 'resizing', ratio: 0, message: 'Resizing…', error: null })
          const { blob } = await resizeCover(file)
          upload = new File([blob], 'cover.webp', { type: 'image/webp' })
          contentType = 'image/webp'
          extension = 'webp'
        }

        setStatus({ phase: 'uploading', ratio: 0, message: 'Uploading…', error: null })

        const coverKey = coverKeyFor(songId, extension)
        const { size: coverBytes } = await uploadFile({
          file: upload,
          key: coverKey,
          contentType,
          capabilities,
          onProgress: (ratio) => setStatus((s) => ({ ...s, ratio })),
        })

        await patch({ coverKey, coverBytes })
        setStatus({
          phase: 'done',
          ratio: 1,
          message: direct ? 'Uploaded.' : 'Uploaded and resized.',
          error: null,
        })
      } catch (error) {
        setStatus({ phase: 'error', ratio: 0, message: '', error: error.message })
      }
    },
    [songId, capabilities, patch],
  )

  // Clearing the art drops the public object from the row but leaves both R2
  // objects alone, exactly as deleting a song does. The placeholder comes back,
  // and the original is still there to restore from.
  const clear = useCallback(async () => {
    setStatus({ phase: 'uploading', ratio: 1, message: 'Removing…', error: null })
    try {
      await patch({ coverKey: null, coverBytes: null })
      setStatus(IDLE)
    } catch (error) {
      setStatus({ phase: 'error', ratio: 0, message: '', error: error.message })
    }
  }, [patch])

  return { status, start, reset, clear }
}
