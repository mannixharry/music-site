import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// A browser scrolls to the top when it loads a new document. A client-side
// router does not load one, so without this a link followed from halfway down
// the home page lands halfway down the next page — which is how "Hear more
// songs" managed to open /songs somewhere in the middle of the list.
//
// Renders nothing; it exists for the effect.
function ScrollToTop() {
  // `key` rather than `pathname`, so following a link to the page you are
  // already on still returns you to the top. It changes on every navigation.
  const { key, hash } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    // Back and forward should land where they left off, and the browser already
    // restores that itself. Only a new navigation needs moving.
    if (navigationType === 'POP') return

    // The musicals are anchored sections on one page, so /musicals#pigs has to
    // keep working. This runs after render, which is what makes the lookup
    // succeed — the browser's own attempt happens before React has drawn.
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (target) {
        target.scrollIntoView()
        return
      }
    }

    // Instant, not smooth: a page-length animation on every navigation reads as
    // sluggishness, and the destination is what was asked for, not the journey.
    window.scrollTo(0, 0)
  }, [key, hash, navigationType])

  return null
}

export default ScrollToTop
