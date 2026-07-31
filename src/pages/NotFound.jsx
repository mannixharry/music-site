import { Link } from 'react-router-dom'
import { ANCHOR, HEADING, SECTION_FIRST } from '../rules'
import { usePageMeta } from '../usePageMeta'

// What an address that does not exist gets.
//
// Without this the page was blank — genuinely blank, no header and no footer,
// because the asset server answers every unknown path with index.html (that is
// what makes the SPA's own routes work) and the router then matched nothing and
// rendered nothing. A mistyped URL, an old link, or a guess at a musical's own
// page all landed on white.
//
// It sits inside <Layout>, so whatever brought someone here, the site is still
// around them and every page is one click away.
function NotFound() {
  usePageMeta({
    title: 'Page not found',
    description:
      'That address does not exist on this site.',
  })

  return (
    <div className={`${ANCHOR} py-8`}>
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm leading-relaxed">
        That address does not exist on this site. It may have been mistyped, or the page may have
        moved.
      </p>

      <section className={SECTION_FIRST}>
        <h2 className={HEADING}>Try one of these</h2>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <li>
            <Link to="/" className="underline">
              Home
            </Link>
          </li>
          <li>
            <Link to="/songs" className="underline">
              Songs
            </Link>
          </li>
          <li>
            <Link to="/musicals" className="underline">
              Musicals
            </Link>
          </li>
          <li>
            <Link to="/about" className="underline">
              About
            </Link>
          </li>
          <li>
            <Link to="/contact" className="underline">
              Contact
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}

export default NotFound
