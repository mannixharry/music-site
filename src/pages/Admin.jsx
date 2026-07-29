import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PlaybackProvider from '../components/PlaybackProvider'
import { musicals } from '../content/musicals'
import { api } from '../admin/api'
import SongForm from '../admin/SongForm'
import SongList from '../admin/SongList'

// Deliberately outside <Layout>: no site header, no 42rem column. Cloudflare
// Access stops anonymous requests before this page is served at all, and the
// route is lazily loaded, so none of this — including the MP3 encoder — is in
// the bundle a visitor downloads.

function Admin() {
  const [session, setSession] = useState(null)
  const [songs, setSongs] = useState([])
  const [mediaBase, setMediaBase] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const { songs: list, mediaBase: base } = await api.list()
    setSongs(list)
    setMediaBase(base)
  }, [])

  useEffect(() => {
    let cancelled = false

    Promise.all([api.session(), api.list()])
      .then(([sessionData, listData]) => {
        if (cancelled) return
        setSession(sessionData)
        setSongs(listData.songs)
        setMediaBase(listData.mediaBase)
      })
      .catch((loadError) => !cancelled && setError(loadError.message))

    return () => {
      cancelled = true
    }
  }, [])

  async function move(id, after) {
    setBusy(true)
    try {
      const { songs: list } = await api.move(id, after)
      setSongs(list)
    } catch (moveError) {
      setError(moveError.message)
    } finally {
      setBusy(false)
    }
  }

  if (error && !session) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-4 border border-gray-500 bg-gray-100 p-3 text-sm">{error}</p>
      </div>
    )
  }

  if (!session) {
    return <div className="p-8 text-sm">Loading…</div>
  }

  const selected = songs.find((song) => song.id === selectedId) ?? null

  return (
    <PlaybackProvider>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-300 pb-3">
          <h1 className="text-2xl font-bold">Songs</h1>
          <div className="flex items-center gap-4 text-xs">
            <span className="font-mono text-gray-600">{session.email}</span>
            <Link to="/songs" className="underline">
              View the site
            </Link>
          </div>
        </header>

        {session.bypass && (
          <p className="mt-3 border border-gray-500 bg-gray-100 p-2 text-xs">
            <strong>Local development.</strong> Authentication is switched off because
            DEV_BYPASS_AUTH is set in .dev.vars. This can never happen on frankkirwan.com.
          </p>
        )}

        {error && (
          <p className="mt-3 border border-gray-500 bg-gray-100 p-2 text-sm">
            {error}{' '}
            <button type="button" className="underline" onClick={() => setError(null)}>
              dismiss
            </button>
          </p>
        )}

        <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <button
              type="button"
              onClick={() => {
                setCreating(true)
                setSelectedId(null)
              }}
              className="mb-3 border border-gray-500 bg-gray-200 px-3 py-1 text-sm"
            >
              New song
            </button>

            <SongList
              songs={songs}
              selectedId={selectedId}
              busy={busy}
              onSelect={(id) => {
                setCreating(false)
                setSelectedId(id)
              }}
              onMove={move}
            />
          </div>

          <div>
            {creating || selected ? (
              <SongForm
                key={selected?.id ?? 'new'}
                song={selected}
                musicals={musicals}
                capabilities={session.capabilities}
                mediaBase={mediaBase}
                onChanged={refresh}
                onCancel={() => {
                  setCreating(false)
                  setSelectedId(null)
                }}
              />
            ) : (
              <p className="border border-dashed border-gray-400 p-8 text-center text-sm text-gray-600">
                Choose a song to edit, or add a new one.
              </p>
            )}
          </div>
        </div>
      </div>
    </PlaybackProvider>
  )
}

export default Admin
