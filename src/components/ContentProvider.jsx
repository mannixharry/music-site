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

const MEDIA_BASE = import.meta.env.VITE_MEDIA_BASE ?? ''

function ContentProvider({ children }) {
  const [data, setData] = useState(snapshot)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/content', { signal: controller.signal })
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
    const songs = toSongs(data.songs, MEDIA_BASE)

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
