import { Link } from 'react-router-dom'
import MusicSection from '../components/MusicSection'
import MusicalHero from '../components/MusicalHero'
import Portrait from '../components/Portrait'
import { profile } from '../content/profile'
import { musicals } from '../content/musicals'
import { instagramUrl } from '../content/contact'
import { HEADING, LIST, LIST_ITEM, SECTION, SECTION_LINK } from '../rules'
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

      {/* Three shows drawn the way the five songs above them are drawn: a
          picture, a name, a line of small grey type, and the rule between one
          and the next. It was a bulleted list of three long sentences, each
          opening with an underlined title and an em dash — the same information
          with nothing to hold it apart, directly under a section that had a
          sleeve on every row. Two lists of things to look at, one of them
          looking like a paragraph that had lost its way.

          The artwork is why this is worth doing at all. It exists, it is the
          best thing on the musicals page, and the home page was sending people
          to it with three underlined words.

          A row carries what the show's own section opens with — title, status,
          teaser — so following the link lands you on the same three lines set
          large, with the same picture above them. The standfirst that used to
          sit here said the Warner Chappell part once for two shows; the status
          lines say it on the two it is true of, and say what the third is
          instead, which the standfirst had no room for. */}
      <section className={SECTION}>
        <h2 className={HEADING}>Musicals</h2>
        <div className={`mt-2 ${LIST}`}>
          {musicals.map((musical) => (
            <div key={musical.slug} className={LIST_ITEM}>
              {/* Straight to that show's section rather than to the top of a
                  page you would then have to find it on.

                  The whole row is the link, not the title alone: the picture
                  and the teaser are about the show as much as its name is, and
                  a 96px picture that does nothing when pressed is a picture
                  that looks broken on a phone. Only the title is underlined —
                  underlining all of it would draw a line under a paragraph.

                  The picture is sized to the words beside it, and that is why
                  it gets *smaller* as the screen gets wider — which looks
                  backwards written down and is the only thing that holds the
                  row together. A square is as tall as it is wide, and the text
                  it stands next to is a heading, a status line and a teaser: on
                  a desktop those come to 95px on two lines, and 96px of picture
                  ends level with them. Give the same words a 393px phone and
                  the teaser wraps to five lines and the block is over 200px
                  tall, so the same 96px square hangs at the top of a column of
                  empty paper — which is how it was reported.

                  128px is the answer on a phone rather than anything larger
                  because it is the width the artwork actually has: the icons
                  are 256px files, and past 128 a 2× screen is being shown
                  something stretched. It takes a third of the column, which
                  costs the teaser about a line and closes most of the gap from
                  both ends at once. */}
              <Link to={`/musicals#${musical.slug}`} className="group flex gap-3">
                <MusicalHero musical={musical} size="thumb" className="w-32 shrink-0 sm:w-24" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold underline">{musical.title}</h3>
                  <p className="text-xs text-gray-600">{musical.status}</p>
                  <p className="mt-1 text-sm leading-relaxed">{musical.teaser}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
        <Link to="/musicals" className={SECTION_LINK}>
          Explore the musicals
        </Link>
      </section>

      {/* The About page opens with these same words — its first paragraph is
          this one, minus the closing clause about the site. Left alone as copy
          and framed instead: this reads as a repeat only while nothing says it
          is an opening. The heading and the link say it, and the link is the
          same "go deeper" close the two sections above already have, which the
          bio was missing.

          It sits after the work rather than before it: the page now opens on
          the songs and the musicals, and the bio is what you read once one of
          them has caught you.

          Named "About", the word in the nav and at the top of the page it leads
          to, so the section and its destination are recognisably the same
          thing. It was the one section here running without a heading, which
          left a slab of prose starting under a rule with nothing to say what it
          was. */}
      <section className={SECTION}>
        <h2 className={HEADING}>About</h2>
        {/* Slightly above body copy, which is how a publication sets an
            introduction apart. It also takes the line length from 88 characters
            to 77, which is the better read of the two on its own merits. Not
            italic — Literata's italic is a 47 kB file this site otherwise never
            fetches, and italic at this length is slower to read than it is
            worth. */}
        <div className="mt-3 space-y-3 text-base leading-relaxed">
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
