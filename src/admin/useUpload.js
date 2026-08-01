import { useCallback, useState } from 'react'
import { extensionOf, masterKeyFor, webKeyFor } from './keys'
import { IDLE, canUseDirectly, contentTypeFor, readDuration, transcode, uploadFile } from './upload'

// Written on every path that publishes a whole track, not just left out.
// Replacing a preview with the full song has to clear the flag, or the site
// goes on calling a complete recording a preview.
const NOT_A_SNIPPET = { isSnippet: false, snippetStart: null, snippetEnd: null }

// Drives one file from "dropped" to "playing on the site". `patch` is called
// twice on the slow path — once the master is safely stored and again once the
// web version exists — because the gap between them is where things fail.
//
// `start(file, snippet)` takes the crop as an argument rather than the hook
// taking it as an option: the range is settled in the trimmer at the moment of
// pressing the button, and passing it here keeps it out of the dependency list
// that would otherwise rebuild this callback on every drag of a handle.
//
// `archiveMaster: false` is for the one case where the file did not come from
// Frank: re-cutting the copy already on the site. Archiving that as the master
// would point master_key at a second-generation copy of itself and orphan the
// real master — still in the bucket, but with nothing in the row naming it.
export function useUpload({ songId, capabilities, patch }) {
  const [status, setStatus] = useState(IDLE)

  const reset = useCallback(() => setStatus(IDLE), [])

  const start = useCallback(
    async (file, snippet = null, { archiveMaster = true } = {}) => {
      try {
        // The quick path: it is already something browsers stream, and small
        // enough to serve untouched. No decode, so nothing to go wrong.
        //
        // A preview cannot come this way. "Serve the file untouched" and "put
        // only twenty seconds of it on a public bucket" are the same sentence
        // read two ways, and taking the shortcut here would upload the whole
        // song under a row claiming it was a preview.
        //
        // It still keeps the original. The same bytes go to both buckets, which
        // looks wasteful and is the point: whatever Frank uploaded is preserved
        // untouched and private, while the public copy is free to be replaced,
        // re-encoded or deleted later without that being a one-way door. Serving
        // it as-is rather than re-encoding avoids compressing already-compressed
        // audio a second time.
        if (canUseDirectly(file) && !snippet) {
          setStatus({ phase: 'uploading', ratio: 0, message: 'Uploading master…', error: null })

          // Master first, exactly as on the slow path below: if the second
          // upload fails or the tab closes between them, the original is safe
          // and the song is recoverable rather than lost.
          const masterKey = masterKeyFor(songId, file)
          const { size: masterBytes } = await uploadFile({
            file,
            key: masterKey,
            contentType: contentTypeFor(file),
            capabilities,
            onProgress: (ratio) => setStatus((s) => ({ ...s, ratio })),
          })
          await patch({ masterKey, masterBytes, masterMime: contentTypeFor(file) })

          setStatus({ phase: 'uploading', ratio: 0, message: 'Uploading…', error: null })

          const key = webKeyFor(songId, extensionOf(file))
          const { size } = await uploadFile({
            file,
            key,
            contentType: contentTypeFor(file),
            capabilities,
            onProgress: (ratio) => setStatus((s) => ({ ...s, ratio })),
          })

          const duration = await readDuration(file)
          await patch({ webKey: key, webBytes: size, duration, ...NOT_A_SNIPPET })

          setStatus({ phase: 'done', ratio: 1, message: 'Uploaded.', error: null })
          return
        }

        // The slow path. Store the original first and record it immediately: if
        // the decode then fails, or the tab is closed mid-encode, the upload is
        // not lost — the song simply sits with a master and no web version, and
        // can be retried.
        //
        // Skipped when the file is the site's own copy being re-cut: there is
        // nothing new to archive, and writing master_key here would replace a
        // pointer to Frank's original with one to a copy of the published audio.
        if (archiveMaster) {
          setStatus({ phase: 'uploading', ratio: 0, message: 'Uploading master…', error: null })

          const masterKey = masterKeyFor(songId, file)
          const { size: masterBytes } = await uploadFile({
            file,
            key: masterKey,
            contentType: contentTypeFor(file),
            capabilities,
            onProgress: (ratio) => setStatus((s) => ({ ...s, ratio })),
          })

          await patch({ masterKey, masterBytes, masterMime: contentTypeFor(file) })
        }

        setStatus({
          phase: 'transcoding',
          ratio: 0,
          message: snippet ? 'Cutting the snapshot…' : 'Converting…',
          error: null,
        })
        const { blob, duration, range } = await transcode(
          file,
          (ratio) => setStatus((s) => ({ ...s, ratio })),
          snippet,
        )

        setStatus({ phase: 'uploading', ratio: 0, message: 'Uploading web version…', error: null })
        const webKey = webKeyFor(songId)
        await uploadFile({
          file: new File([blob], 'web.mp3', { type: 'audio/mpeg' }),
          key: webKey,
          contentType: 'audio/mpeg',
          capabilities,
          onProgress: (ratio) => setStatus((s) => ({ ...s, ratio })),
        })

        // `range` rather than `snippet`: the crop is clamped to what the file
        // turned out to hold, so what is recorded is what was published.
        await patch({
          webKey,
          webBytes: blob.size,
          duration,
          ...(range
            ? { isSnippet: true, snippetStart: range.start, snippetEnd: range.end }
            : NOT_A_SNIPPET),
        })
        setStatus({
          phase: 'done',
          ratio: 1,
          message: range ? 'Snapshot uploaded — the master is kept whole.' : 'Uploaded and converted.',
          error: null,
        })
      } catch (error) {
        setStatus({ phase: 'error', ratio: 0, message: '', error: error.message })
      }
    },
    [songId, capabilities, patch],
  )

  return { status, start, reset }
}
