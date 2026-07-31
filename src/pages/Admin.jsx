import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PlaybackProvider from '../components/PlaybackProvider'
import {
  SIGN_OUT_URL,
  signOut,
  rememberAdminSession,
  forgetAdminSession,
  signInAgain,
  reauthAlreadyTried,
  clearReauthAttempt,
} from '../adminHint'
import { api } from '../admin/api'
import SongForm from '../admin/SongForm'
import AlbumPanel from '../admin/AlbumPanel'
import DeletedSongs from '../admin/DeletedSongs'
import SongList from '../admin/SongList'
import StoragePanel from '../admin/StoragePanel'
import { usePageMeta } from '../usePageMeta'

// Deliberately outside <Layout>: no site header, no 42rem column. Cloudflare
// Access stops anonymous requests before this page is served at all, and the
// route is lazily loaded, so none of this — including the MP3 encoder — is in
// the bundle a visitor downloads.

function Admin() {
  usePageMeta({
    title: 'Admin',
    description:
      'Editing the site.',
  })

  const [session, setSession] = useState(null)
  const [songs, setSongs] = useState([])
  const [albums, setAlbums] = useState([])
  const [mediaBase, setMediaBase] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)
  // The song made by the last Save, so the form it hands over to can show that
  // it saved. Cleared the moment attention moves anywhere else.
  const [justCreatedId, setJustCreatedId] = useState(null)
  const [error, setError] = useState(null)
  // Which kind of failure, when it was an authentication one — the message
  // alone cannot say whether signing in again is the remedy or the trap.
  const [errorCode, setErrorCode] = useState(null)
  const [busy, setBusy] = useState(false)
  // The bin and the storage figures come from one call, because they move
  // together: emptying the bin changes both. Loaded after the songs rather than
  // alongside them — it walks both buckets, and the list should not wait on it.
  const [storage, setStorage] = useState(null)
  const formRef = useRef(null)

  const refreshStorage = useCallback(async () => {
    setStorage(await api.storage())
  }, [])

  // Both, always. Deleting a song is the obvious case — it should drop into
  // Recently deleted there and then rather than after a reload — but every
  // upload moves the storage figures too, and one of the two going stale is how
  // a number on this page ends up lying.
  const refresh = useCallback(async () => {
    // Albums come back with the songs, because a song names one: refreshing
    // half of that pair is how a song ends up filed under an album the page
    // does not know about.
    const [{ songs: list, mediaBase: base }, { albums: albumList }] = await Promise.all([
      api.list(),
      api.albums(),
      refreshStorage().catch(() => {}),
    ])
    setSongs(list)
    setAlbums(albumList)
    setMediaBase(base)
  }, [refreshStorage])

  useEffect(() => {
    let cancelled = false

    Promise.all([api.session(), api.list(), api.albums()])
      .then(([sessionData, listData, albumData]) => {
        if (cancelled) return
        setSession(sessionData)
        setSongs(listData.songs)
        setAlbums(albumData.albums)
        setMediaBase(listData.mediaBase)
        // Lets the site's header offer a way back here, so previewing a change
        // is not a one-way trip through the URL bar. A hint only — Access is
        // still what decides whether following it works. See src/adminHint.js.
        rememberAdminSession(sessionData.email)
        // A session loaded, so any earlier bounce through Access is spent and
        // the next lapse gets its own.
        clearReauthAttempt()
      })
      .catch((loadError) => {
        if (cancelled) return

        // Nothing has been typed yet — the page has not finished loading — so
        // there is nothing to lose by going to Access, and being sent to the
        // login screen is a better answer than being told to go there.
        //
        // Not on 'forbidden': Access would wave that straight back, and the
        // loop this used to cause is the bug being fixed.
        if (loadError.code === 'expired' && !reauthAlreadyTried()) {
          forgetAdminSession()
          signInAgain()
          return
        }

        setError(loadError.message)
        setErrorCode(loadError.code ?? null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Best effort, and deliberately not fatal: the storage figures are a
    // footnote, and failing to count files should not take the page down.
    refreshStorage().catch(() => {})
  }, [refreshStorage])

  // On a phone the two columns stack, so the form is below the whole song list
  // — choosing a song appeared to do nothing at all. Brings it into view.
  //
  // Only on the narrow layout: side by side, the form is already on screen and
  // scrolling the page would be an unexplained jump.
  useEffect(() => {
    if (!selectedId && !creating) return
    if (window.matchMedia('(min-width: 768px)').matches) return
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedId, creating])

  async function move(id, after) {
    setBusy(true)
    try {
      const { songs: list } = await api.move(id, after)
      setSongs(list)
    } catch (moveError) {
      setError(moveError.message)
      setErrorCode(moveError.code ?? null)
    } finally {
      setBusy(false)
    }
  }

  // Nothing loaded. Whatever is said here is the only thing on the page, so it
  // has to carry the way out rather than describe one.
  if (error && !session) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-4 border border-gray-500 bg-gray-100 p-3 text-sm">{error}</p>

        {errorCode === 'forbidden' && (
          <p className="mt-3 text-sm">
            {/* The only move that can change the answer. Signing in again would
                come straight back here — Access is not the one refusing. */}
            <a href={SIGN_OUT_URL} onClick={signOut} className="underline">
              Sign out
            </a>{' '}
            and sign in with the other address.
          </p>
        )}

        {errorCode === 'expired' && (
          <p className="mt-3 text-sm">
            {/* Reached only when a bounce through Access has already been spent
                and came back refused, so this is offered rather than taken. */}
            <button type="button" className="underline" onClick={signInAgain}>
              Sign in again
            </button>
            . If that keeps returning here, sign in from{' '}
            <a href="/" className="underline">
              the site
            </a>{' '}
            in a new tab.
          </p>
        )}
      </div>
    )
  }

  if (!session) {
    return <div className="p-8 text-sm">Loading…</div>
  }

  const selected = songs.find((song) => song.id === selectedId) ?? null

  return (
    <PlaybackProvider>
      {/* The deep bottom padding is not decoration. The edit form grows as a
          song gains things — a player, a cover preview, its own dropzone — and
          past a certain point it runs off the bottom of a laptop screen with
          Save and Delete pinned against the very edge. Nothing clips it, so the
          page scrolls, but only to the last pixel of the form. This is the
          slack that makes the end of it comfortable to reach. */}
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-40">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-300 pb-3">
          <h1 className="text-2xl font-bold">Songs</h1>
          <div className="flex items-center gap-4 text-xs">
            <span className="font-mono text-gray-600">{session.email}</span>
            {/* The home page rather than /songs: this is the "how does it look
                now?" link, and the site's header carries a way straight back. */}
            <Link to="/" className="underline">
              Preview the site
            </Link>
            {/* Nothing to sign out of when the local bypass is what let you in;
                the notice below says so. */}
            {!session.bypass && (
              <a href={SIGN_OUT_URL} onClick={signOut} className="underline">
                Sign out
              </a>
            )}
          </div>
        </header>

        {session.bypass && (
          <p className="mt-3 border border-gray-500 bg-gray-100 p-2 text-xs">
            <strong>Local development.</strong> Authentication is switched off because
            DEV_BYPASS_AUTH is set in .dev.vars, so there is no session to sign out of. This can
            never happen on frankkirwan.com.
          </p>
        )}

        {error && (
          <p className="mt-3 border border-gray-500 bg-gray-100 p-2 text-sm">
            {error}{' '}
            {/* Not navigated automatically the way the initial load is: by now
                there may be an unsaved edit in the form, and throwing that away
                to fix a session is its own bug. Offered, so the choice is the
                one making it. */}
            {errorCode === 'expired' && (
              <>
                <button type="button" className="underline" onClick={signInAgain}>
                  Sign in again
                </button>{' '}
              </>
            )}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setError(null)
                setErrorCode(null)
              }}
            >
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
                setJustCreatedId(null)
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
                setJustCreatedId(null)
              }}
              onMove={move}
            />
          </div>

          <div ref={formRef} className="scroll-mt-4">
            {creating || selected ? (
              <SongForm
                key={selected?.id ?? 'new'}
                song={selected}
                justCreated={Boolean(selected) && selected.id === justCreatedId}
                albums={albums}
                capabilities={session.capabilities}
                mediaBase={mediaBase}
                onChanged={refresh}
                // Straight from "New song" to editing the row it just made.
                onCreated={(id) => {
                  setCreating(false)
                  setSelectedId(id)
                  setJustCreatedId(id)
                }}
                onCancel={() => {
                  setCreating(false)
                  setSelectedId(null)
                  setJustCreatedId(null)
                }}
              />
            ) : (
              <p className="border border-dashed border-gray-400 p-8 text-center text-sm text-gray-600">
                Choose a song to edit, or add a new one.
              </p>
            )}
          </div>
        </div>

        {/* Not inside the storage block below: albums are part of the
            catalogue, and waiting on a figures fetch to show them would make
            them look optional. */}
        <AlbumPanel
          albums={albums}
          mediaBase={mediaBase}
          capabilities={session.capabilities}
          onChanged={refresh}
        />

        {storage && (
          <>
            <DeletedSongs
              deleted={storage.deleted}
              binDays={storage.binDays}
              onChanged={refresh}
            />
            <StoragePanel storage={storage} onChanged={refreshStorage} />
          </>
        )}
      </div>
    </PlaybackProvider>
  )
}

export default Admin
