import { useCallback, useMemo, useState } from 'react'
import { PlaybackContext } from '../context/playbackContext'

function PlaybackProvider({ children }) {
  const [playingId, setPlayingId] = useState(null)

  const play = useCallback((id) => setPlayingId(id), [])

  // Only the active player may clear the field, so a stale pause from a player
  // that already lost the slot can't stop the new one.
  const stop = useCallback((id) => {
    setPlayingId((current) => (current === id ? null : current))
  }, [])

  const value = useMemo(() => ({ playingId, play, stop }), [playingId, play, stop])

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

export default PlaybackProvider
