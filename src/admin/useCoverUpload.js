import { useCallback, useState } from 'react'
import { canUseImageDirectly, imageTypeFor, resizeCover } from './cover'
import { coverKeyFor, coverMasterKeyFor, extensionOf } from './keys'
import { IDLE, uploadFile } from './upload'

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

  // Removing the art clears BOTH keys, so both objects go — the public copy and
  // the original behind it.
  //
  // It used to clear only the public one. That looked like it kept the original
  // "to restore from", and the row did keep naming it, so the storage sweep
  // rightly never called it unreferenced — but nothing anywhere could restore
  // from it. The result was a private object per removal that no screen showed,
  // no button could reach and no sweep would collect: two of them, at 600 kB
  // each, were sitting in the bucket when this was found, counted under "your
  // original artwork" for artwork that was no longer on the site.
  //
  // Which is the same reasoning deleteReplacedObjects already gives for the
  // public copy — "recoverable was never surfaced anywhere a person could use
  // it". It applies harder to the master, because the master is the bigger file.
  //
  // Both fields have to be named for both objects to go: deleteReplacedObjects
  // only considers key columns the patch actually mentions, which is what stops
  // an unrelated edit costing a song its artwork.
  const clear = useCallback(async () => {
    setStatus({ phase: 'uploading', ratio: 1, message: 'Removing…', error: null })
    try {
      await patch({
        coverKey: null,
        coverBytes: null,
        coverMasterKey: null,
        coverMasterBytes: null,
        coverMasterMime: null,
      })
      setStatus(IDLE)
    } catch (error) {
      setStatus({ phase: 'error', ratio: 0, message: '', error: error.message })
    }
  }, [patch])

  return { status, start, reset, clear }
}
