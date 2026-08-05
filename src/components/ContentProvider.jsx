import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ContentContext } from '../context/contentContext'
import { listedIn, toAlbums, toSongs } from '../content/normalise'
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
  // One flight at a time. Without this, mounting under StrictMode and a
  // navigation landing together would ask twice for the same answer.
  const inFlight = useRef(null)

  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current

    // `no-cache` revalidates with the server every time instead of trusting the
    // browser's copy for the full max-age. Without it, publishing a song and
    // then looking at the site shows the old catalogue for up to a minute,
    // which reads as the change having failed. The cost is one request, which
    // the Worker answers from its own edge cache without touching D1 — so this
    // spends the budget the 100k/day quota is generous with, not the D1
    // rows-read budget that actually gets tight.
    const flight = fetch('/api/content', { cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((live) => {
        if (!live?.version) return
        // Compared against what is on screen, not against the bundled snapshot:
        // after the first update those are different things, and comparing to
        // the snapshot would make every later refresh look like a change.
        setData((current) => {
          if (live.version === current.version) return current
          // Two sources of truth is a real debugging hazard — say which won.
          console.info(`content: using live ${live.version} over ${current.version}`)
          return live
        })
      })
      .catch(() => {
        // Offline, no Worker running locally, or the API is down. Whatever is
        // already on screen stays, so there is nothing to do and nothing to say.
      })
      .finally(() => {
        inFlight.current = null
      })

    inFlight.current = flight
    return flight
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo(() => {
    const mediaBase = data.mediaBase ?? ''
    const albums = toAlbums(data.albums, mediaBase)
    const songs = toSongs(data.songs, mediaBase, data.albums)

    return {
      songs,
      albums,
      version: data.version,
      // What the home page's Music section draws. A flag on the song rather
      // than "belongs to no album": a track from a record can be put on the
      // front page without being taken out of the record to do it. Flat
      // sort_order still decides the running order, so a song's place here is
      // the place it has in the admin's list.
      homeSongs: songs.filter((song) => song.onHomepage),
      // What an album lists rather than everything filed under it: a song shown
      // on the home page can be held out of its own record — see 0008 — which
      // is what keeps a snapshot off the demo list beside the whole track.
      songsIn: (albumId) => listedIn(songs, albumId),
      refresh,
    }
  }, [data, refresh])

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export default ContentProvider
