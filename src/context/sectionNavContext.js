import { createContext, useContext, useEffect } from 'react'

// How a page hands its in-page sections to the layout.
//
// The row of section links has to sit inside the same sticky block as the
// header and the now-playing strip. Layout pins those two together for a stated
// reason — so the two cannot drift apart or need an offset guessed between them
// — and a third band pinned separately would have to guess exactly that offset,
// twice, since the now-playing strip is only there some of the time.
//
// So the page does not render the row. It says what is in it, and Layout puts
// it where it belongs.
export const SectionNavContext = createContext(() => {})

// `items` must be a stable array — useMemo it in the page, or this clears and
// re-sets on every render.
export function useSectionNav(items) {
  const setItems = useContext(SectionNavContext)

  useEffect(() => {
    setItems(items)
    // Cleared on the way out, or the row would still be there on the next page,
    // pointing at sections that no longer exist.
    return () => setItems(null)
  }, [setItems, items])
}
