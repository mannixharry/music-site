import { Link } from 'react-router-dom'
import MusicSection from '../components/MusicSection'
import Portrait from '../components/Portrait'
import { profile } from '../content/profile'
import { musicals } from '../content/musicals'
import { instagramUrl } from '../content/contact'
import { HEADING, SECTION, SECTION_LINK } from '../rules'
import { usePageMeta } from '../usePageMeta'

function Home() {
  // No title prefix — the home page is the site, so its tab is just the name.
  usePageMeta({
    description:
      'Singer-songwriter, musician and composer of musicals. Songs and demos to listen to, and three musicals — two of them previously published by Warner Chappell.',
  })

  return (
    <div className="py-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-center">
        <Portrait className="w-full md:w-1/2" />
        <div>
          <h1 className="text-4xl font-bold">{profile.name}</h1>
          <p className="mt-2 text-lg">{profile.descriptor}</p>
        </div>
      </section>

      {/* The About page opens with these same words — its first paragraph is
          this one, minus the closing clause about the site. Left alone as copy
          and framed instead: this reads as a repeat only while nothing says it
          is an opening. The link says it, and it is the same "go deeper" close
          the two sections below already have, which the bio was missing. */}
      <section className="mt-10 text-sm leading-relaxed">
        <div className="space-y-3">
          {profile.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        <Link to="/about" className={SECTION_LINK}>
          Read more about Frank
        </Link>
      </section>

      <div className={SECTION}>
        <MusicSection />
      </div>

      <section className={SECTION}>
        <h2 className={HEADING}>Musicals</h2>
        <p className="mt-2 text-sm">
          Two of Frank&apos;s musicals were previously published by Warner Chappell.
        </p>
        <ul className="mt-4 space-y-1 text-sm">
          {musicals.map((musical) => (
            <li key={musical.slug}>
              {/* Straight to that show's section rather than to the top of a
                  page you would then have to find it on. */}
              <Link to={`/musicals#${musical.slug}`} className="font-bold underline">
                {musical.title}
              </Link>{' '}
              &mdash; {musical.teaser}
            </li>
          ))}
        </ul>
        <Link to="/musicals" className={SECTION_LINK}>
          Explore the musicals
        </Link>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Elsewhere</h2>
        <div className="mt-3 flex gap-4 text-sm">
          <a href={instagramUrl} className="underline" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <Link to="/contact" className="underline">
            Contact
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home
