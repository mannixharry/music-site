import { createContext, useContext } from 'react'

// Tracks which AudioPlayer currently owns playback, so starting one snippet
// stops whatever else was playing.
export const PlaybackContext = createContext(null)

export function usePlayback() {
  const context = useContext(PlaybackContext)
  if (!context) {
    throw new Error('usePlayback must be used inside <PlaybackProvider>')
  }
  return context
}
