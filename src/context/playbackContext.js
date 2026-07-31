import { createContext, useContext } from 'react'

// The one piece of audio the whole site shares. The <audio> element lives in
// PlaybackProvider, above the router, and this carries everything a row needs
// to draw a transport for it.
export const PlaybackContext = createContext(null)

export function usePlayback() {
  const context = useContext(PlaybackContext)
  if (!context) {
    throw new Error('usePlayback must be used inside <PlaybackProvider>')
  }
  return context
}
