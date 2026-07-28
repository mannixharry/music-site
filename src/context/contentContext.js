import { createContext, useContext } from 'react'

// The song catalogue, rendered from a snapshot committed to the repo and then
// refreshed from /api/content. See ContentProvider for why it works that way.
export const ContentContext = createContext(null)

export function useContent() {
  const context = useContext(ContentContext)
  if (!context) {
    throw new Error('useContent must be used inside <ContentProvider>')
  }
  return context
}
