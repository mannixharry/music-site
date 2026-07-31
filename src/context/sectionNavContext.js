import { createContext, useContext, useEffect } from 'react'

// How a page hands its in-page sections to the layout.
//
// The row of section links belongs inside the same pinned block as the header
// and the now-playing strip; a band pinned separately would have to guess the
// height of the ones above it. So a page does not render the row — it says what
// is in it, and Layout puts it where it belongs.
export const SectionNavContext = createContext(() => {})

// `items` must be a stable array — useMemo it in the page, or this clears and
// re-sets on every render.
export function useSectionNav(items) {
  const setItems = useContext(SectionNavContext)

  useEffect(() => {
    setItems(items)
    // Cleared on the way out, or the row survives onto the next page pointing
    // at sections that no longer exist.
    return () => setItems(null)
  }, [setItems, items])
}
