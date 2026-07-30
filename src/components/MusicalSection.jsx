import BackToTop from './BackToTop'
import Placeholder from './Placeholder'
import AudioPlayer from './AudioPlayer'
import ScriptwriterCallout from './ScriptwriterCallout'
import SnippetTag from './SnippetTag'
import { useContent } from '../context/contentContext'

// Above this many characters, the resume is folded into a disclosure and the
// teaser stands in for it until it is opened. Two of the three shows carry
// several screens of synopsis, and with all of it laid out flat the page was
// mostly prose you had to scroll through to reach the demos and the downloads.
// Guyana Skies' single short paragraph stays where it is: hiding two sentences
// behind a click is worse than showing them.
const FOLD_ABOVE = 600

function MusicalSection({ musical }) {
  const { demosFor } = useContent()
  const demos = demosFor(musical.slug)

  const resume = musical.resume.map((paragraph, i) => <p key={i}>{paragraph}</p>)
  const folded = musical.resume.join(' ').length > FOLD_ABOVE

  return (
    // scroll-mt keeps the heading clear of the sticky site header when the
    // quick links above jump to this section.
    <section id={musical.slug} className="scroll-mt-20 py-8">
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

      {folded ? (
        <details className="mt-6">
          <summary className="cursor-pointer font-bold">{musical.resumeLabel}</summary>
          <div className="mt-2 space-y-3 text-sm leading-relaxed">{resume}</div>
        </details>
      ) : (
        <>
          <h3 className="mt-6 font-bold">{musical.resumeLabel}</h3>
          <div className="mt-2 space-y-3 text-sm leading-relaxed">{resume}</div>
        </>
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
                  {demo.isSnippet && <SnippetTag title={demo.title} />}
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
