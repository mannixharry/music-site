import { useState } from 'react'
import BackToTop from './BackToTop'
import Placeholder from './Placeholder'
import AudioPlayer from './AudioPlayer'
import ScriptwriterCallout from './ScriptwriterCallout'
import SnippetTag from './SnippetTag'
import { useContent } from '../context/contentContext'
import { ANCHOR, SECTION, SECTION_FIRST } from '../rules'

// Above this many characters the resume opens shortened, with the first few
// lines showing and the rest a click away. Two of the three shows carry several
// screens of synopsis, and laid out flat the page was mostly prose you had to
// scroll past to reach the demos and the downloads. Guyana Skies' two sentences
// stay whole: shortening those would cost a click and save nothing.
const FOLD_ABOVE = 600

// Lines of the opening paragraph to leave showing. Clamped by line rather than
// by character count, deliberately — the two shortened shows are shaped quite
// differently (Pigs runs to four paragraphs, Copperfield is one long one), and
// clamping by line gives them the same height and the same trailing ellipsis
// instead of one being cut mid-word and the other not at all.
const PREVIEW_LINES = 'line-clamp-4'

function MusicalSection({ musical, first = false }) {
  const { demosFor } = useContent()
  const demos = demosFor(musical.slug)
  const [expanded, setExpanded] = useState(false)

  const shortened = musical.resume.join(' ').length > FOLD_ABOVE
  const showAll = expanded || !shortened
  const bodyId = `${musical.slug}-resume`

  return (
    // scroll-mt keeps the heading clear of the sticky site header when the
    // quick links above jump to this section.
    <section id={musical.slug} className={`${first ? SECTION_FIRST : SECTION} ${ANCHOR}`}>
      <h2 className="text-2xl font-bold">{musical.title}</h2>
      <p className="text-sm">{musical.status}</p>

      {/* The one-line hook the home page already uses. It earns its place here
          now that the synopsis below it may be closed. */}
      <p className="mt-3 text-sm leading-relaxed">{musical.teaser}</p>

      <Placeholder
        label={musical.heroLabel}
        dims={musical.heroDims}
        aspect="aspect-video"
        className="mt-4"
      />

      <h3 className="mt-6 font-bold">{musical.resumeLabel}</h3>

      {/* The heading stays visible either way — a reader should be able to see
          that a synopsis exists without first working out that the heading was
          a button. */}
      <div id={bodyId} className="mt-2 text-sm leading-relaxed">
        {showAll ? (
          <div className="space-y-3">
            {musical.resume.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          // The clamp goes on the paragraph itself rather than a wrapper: it
          // works by turning the element into a -webkit-box, which does what is
          // wanted to flowed text and not to a stack of block children.
          <p className={PREVIEW_LINES}>{musical.resume[0]}</p>
        )}
      </div>

      {shortened && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="mt-2 text-sm underline"
        >
          {expanded ? 'Show less' : `Read the full ${musical.resumeLabel.toLowerCase()}`}
        </button>
      )}

      {/* A heading over an empty box reads like something failed to load, so a
          show with no demos yet loses the block entirely. */}
      {demos.length > 0 && (
        <>
          <h3 className="mt-6 font-bold">Demos</h3>
          <div className="mt-2 space-y-3">
            {demos.map((demo) => (
              <div key={demo.id}>
                {/* The musical's name is the heading above, so the bare title
                    is enough here — but the player's screen-reader label wants
                    the full one, since it may be announced out of context. */}
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm">{demo.shortTitle}</p>
                  {demo.isSnippet && demo.showSnippetTag && <SnippetTag title={demo.title} />}
                </div>
                <div className="mt-1">
                  <AudioPlayer
                    id={demo.id}
                    src={demo.audioSrc}
                    title={demo.title}
                    duration={demo.duration}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {musical.needsScriptwriter ? (
        <div className="mt-6">
          <ScriptwriterCallout contactHref={musical.contactHref} />
        </div>
      ) : (
        <>
          <h3 className="mt-6 font-bold">Downloads</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {musical.downloads.map((download) =>
              download.href ? (
                <a
                  key={download.label}
                  href={download.href}
                  download={download.download ? '' : undefined}
                  className="flex w-40 items-center justify-center border border-gray-400 bg-white p-2 text-center text-sm underline"
                >
                  {download.label}
                </a>
              ) : (
                <Placeholder key={download.label} label={download.label} className="w-40" />
              ),
            )}
          </div>
        </>
      )}

      {/* Opening a synopsis makes the section long again, so the way back to
          the quick links has to be at the bottom as well as the top. */}
      <BackToTop />
    </section>
  )
}

export default MusicalSection
