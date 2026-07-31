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
      {/* The heading says what he does, not who he is — the header's wordmark
          directly above already says that, and having both meant the page
          opened with the same three words twice, a few centimetres apart and
          both in bold serif. It read as a stutter.

          Which of the two gives way is the whole decision. Dropping the
          wordmark on this page instead would have been less copy to change, but
          the header is sticky and identical everywhere, and hiding one piece of
          it on one page makes the nav jump sideways as you move around the
          site. So the masthead keeps the name and the headline states the work,
          which is how a publication does it and how this site is drawn.
          Nothing is lost to a search engine: the name is still the wordmark
          above, the tab title, the footer, and the Person in index.html. */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center">
        <Portrait className="w-full md:w-1/2" />
        {/* Smaller than the other pages' h1, and balanced, because this one is
            a sentence rather than a word. Beside the portrait the column is
            about 320px: at text-3xl "Singer-songwriter," alone nearly fills a
            line, so it broke into four with "musician," stranded on its own.
            text-2xl fits two words to a line and text-balance evens them, which
            gives the descending three-line rag a headline wants.

            The alternative was to keep the larger type and narrow the portrait
            to make room. Not taken: the photograph is the largest thing this
            site sends anyone and the first thing they see, and shrinking it to
            fix a line break is the wrong thing giving way. */}
        <h1 className="text-balance text-2xl font-bold">{profile.descriptor}</h1>
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

      {/* The About page opens with these same words — its first paragraph is
          this one, minus the closing clause about the site. Left alone as copy
          and framed instead: this reads as a repeat only while nothing says it
          is an opening. The link says it, and it is the same "go deeper" close
          the two sections above already have, which the bio was missing.

          It sits after the work rather than before it: the page now opens on
          the songs and the musicals, and the bio is what you read once one of
          them has caught you. */}
      {/* Slightly above body copy, which is how a publication sets an
          introduction apart. It also takes the line length from 88 characters
          to 77, which is the better read of the two on its own merits. Not
          italic — Literata's italic is a 47 kB file this site otherwise never
          fetches, and italic at this length is slower to read than it is
          worth. */}
      <section className={`${SECTION} text-base leading-relaxed`}>
        <div className="space-y-3">
          {profile.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        <Link to="/about" className={SECTION_LINK}>
          Read more about Frank
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
