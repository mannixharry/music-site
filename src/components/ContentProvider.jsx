import { useEffect, useMemo, useState } from 'react'
import { ContentContext } from '../context/contentContext'
import { toSongs } from '../content/normalise'
import snapshot from '../content/snapshot.json'

// The catalogue is committed to the repo as snapshot.json and bundled, so the
// first paint has the real songs — no spinner, no reflow on a long list — and
// the site keeps working if the API, the database and the bucket all vanish.
// The fetch below is a revalidation, not a load: it only matters when Frank has
// published something since the last deploy.
//
// snapshot.json is refreshed from the database at build time, so the gap it
// covers is only ever "changes since the last deploy".
//
// Where the audio lives travels with the data as `mediaBase`, rather than being
// compiled in — so local development can serve it from the emulated bucket and
// production from media.frankkirwan.com, with no build-time switch to forget.

function ContentProvider({ children }) {
  const [data, setData] = useState(snapshot)

  useEffect(() => {
    const controller = new AbortController()

    // `no-cache` revalidates with the server every time instead of trusting the
    // browser's copy for the full max-age. Without it, publishing a song and
    // then looking at the site shows the old catalogue for up to a minute,
    // which reads as the change having failed. The cost is one request, which
    // the Worker answers from its own edge cache without touching D1 — so this
    // spends the budget the 100k/day quota is generous with, not the D1
    // rows-read budget that actually gets tight.
    fetch('/api/content', { signal: controller.signal, cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((live) => {
        if (!live?.version || live.version === snapshot.version) return
        setData(live)
        // Two sources of truth is a real debugging hazard — say which one won.
        console.info(`content: using live ${live.version} over snapshot ${snapshot.version}`)
      })
      .catch(() => {
        // Offline, no Worker running locally, or the API is down. The snapshot
        // is already on screen, so there is nothing to do and nothing to say.
      })

    return () => controller.abort()
  }, [])

  const value = useMemo(() => {
    const songs = toSongs(data.songs, data.mediaBase ?? '')

    return {
      songs,
      version: data.version,
      singles: songs.filter((song) => song.kind === 'single'),
      demosFor: (slug) => songs.filter((song) => song.musicalSlug === slug),
    }
  }, [data])

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export default ContentProvider
