import { createContext, useContext } from 'react'

// The one piece of audio the whole site shares.
//
// It used to hold only an id, because each AudioPlayer owned its own <audio>
// element and this decided which of them was allowed to be playing. That works
// until you navigate: the element belongs to a row on a page, so leaving the
// page destroys it mid-song. The element now lives in the provider and this
// carries everything a row needs to draw a transport for it.
export const PlaybackContext = createContext(null)

export function usePlayback() {
  const context = useContext(PlaybackContext)
  if (!context) {
    throw new Error('usePlayback must be used inside <PlaybackProvider>')
  }
  return context
}
