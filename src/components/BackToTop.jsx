import { Link } from 'react-router-dom'

// Pairs with an `id="top"` on the page's outermost element, which is what the
// quick-links rows at the top of /songs and /musicals aim back at.
//
// A Link rather than a scroll handler, so it behaves like every other link on
// the page and goes through the same hash handling in ScrollToTop.
function BackToTop() {
  return (
    <Link to="#top" className="mt-8 inline-block text-sm underline">
      Back to the top
    </Link>
  )
}

export default BackToTop
