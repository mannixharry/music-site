import { Link } from 'react-router-dom'
import MusicalSection from '../components/MusicalSection'
import { musicals } from '../content/musicals'
import { ANCHOR } from '../rules'

function Musicals() {
  return (
    // `#top` is what the "back to the top" link at the foot of each section
    // aims at. ScrollToTop resolves the hash after render, so it works from
    // anywhere on the page.
    <div id="top" className={`${ANCHOR} py-8`}>
      <h1 className="text-4xl font-bold">Musicals</h1>
      <p className="mt-2 text-sm leading-relaxed">
        Two of these were published by Warner Chappell and are no longer tied to it, so their
        scripts, scores and demos are all here. The third is looking for a scriptwriter.
      </p>

      {/* The sections run long, and before this the only way to the third one
          was to scroll past the first two. */}
      <nav aria-label="Jump to a musical" className="mt-6 border-t border-gray-300 pt-3">
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {musicals.map((musical) => (
            <li key={musical.slug}>
              <Link to={`#${musical.slug}`} className="underline">
                {musical.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {musicals.map((musical, i) => (
        <MusicalSection key={musical.slug} musical={musical} first={i === 0} />
      ))}
    </div>
  )
}

export default Musicals
