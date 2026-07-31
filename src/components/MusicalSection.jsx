import { useMemo, useState } from 'react'
import Placeholder from './Placeholder'
import AudioPlayer from './AudioPlayer'
import MusicalHero from './MusicalHero'
import Notice from './Notice'
import SnippetTag from './SnippetTag'
import { useContent } from '../context/contentContext'
import { usePlayback } from '../context/playbackContext'
import { toQueue } from '../content/normalise'
import downloadSizes from '../content/downloadSizes.json'
import { formatBytes } from '../format'
import { PlayIcon } from './AudioPlayer'
import { ANCHOR, SECTION } from '../rules'

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

function MusicalSection({ musical }) {
  const { songsIn } = useContent()
  const demos = songsIn(musical.slug)
  const [expanded, setExpanded] = useState(false)

  // The show's own demos, in the order they are listed, which is the order they
  // are meant to be heard in.
  const playback = usePlayback()
  const queue = useMemo(() => toQueue(demos), [demos])

  const shortened = musical.resume.join(' ').length > FOLD_ABOVE
  const showAll = expanded || !shortened
  const bodyId = `${musical.slug}-resume`

  return (
    // scroll-mt keeps the heading clear of the sticky site header when the
    // section links jump to this section.
    <section id={musical.slug} className={`${SECTION} ${ANCHOR}`}>
      <h2 className="text-2xl font-bold">{musical.title}</h2>
      <p className="text-sm">{musical.status}</p>

      {/* The one-line hook the home page already uses. It earns its place here
          now that the synopsis below it may be closed. */}
      <p className="mt-3 text-sm leading-relaxed">{musical.teaser}</p>

      <MusicalHero musical={musical} className="mt-4" />

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
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold">Demos</h3>

            {/* Nine demos is a show, and hearing it should not be nine
                decisions. Only offered above one demo, where it would otherwise
                be a second play button for the same track. */}
            {queue.length > 1 && (
              <button
                type="button"
                onClick={() => playback.play(queue[0], queue)}
                className="flex items-center gap-2 border border-gray-400 bg-white px-3 py-1 text-sm hover:bg-gray-200"
              >
                <PlayIcon />
                Play all {queue.length}
              </button>
            )}
          </div>

          <div className="mt-2 space-y-3">
            {demos.map((demo) => (
              <div key={demo.id}>
                {/* The musical's name is the heading above, so the bare title
                    is enough — but the player's label wants the full one, which
                    may be announced out of context. */}
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm">{demo.shortTitle}</p>
                  {demo.isSnippet && demo.showSnippetTag && <SnippetTag title={demo.title} />}
                </div>
                {/* Same guard as everywhere else a player is drawn: a demo
                    listed before its recording has been uploaded has nothing to
                    play, and a transport pointed at nothing is a button that
                    fetches index.html and fails without saying so. */}
                {demo.audioSrc ? (
                  <div className="mt-1">
                    <AudioPlayer
                      id={demo.id}
                      src={demo.audioSrc}
                      title={demo.title}
                      duration={demo.duration}
                      queue={queue}
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-600">No recording on the site yet.</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Independent of each other, unlike the either/or this replaced: a show
          can want a notice and still have a script to hand out. Guyana Skies is
          the only one with a notice, and it is the only one with no downloads,
          which is why the two never appeared together before. */}
      {musical.notice && (
        <div className="mt-6">
          <Notice notice={musical.notice} />
        </div>
      )}

      {/* A heading over an empty row reads as something that failed to load,
          the same reasoning as the demos block above. */}
      {musical.downloads.length > 0 && (
        <>
          <h3 className="mt-6 font-bold">Downloads</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {musical.downloads.map((download) =>
              download.href ? (
                <a
                  key={download.label}
                  href={download.href}
                  download={download.download ? '' : undefined}
                  className="flex w-40 flex-col items-center justify-center gap-0.5 border border-gray-400 bg-white p-2 text-center text-sm"
                >
                  <span className="underline">{download.label}</span>
                  {/* Measured at build time, so it cannot describe a file that
                      has since been replaced. Only files in public/ have a size
                      here; an off-site URL simply shows none. */}
                  {downloadSizes[download.href] && (
                    <span className="text-xs text-gray-600">
                      {formatBytes(downloadSizes[download.href])}
                    </span>
                  )}
                </a>
              ) : (
                // A label with no address yet: the score is coming, and saying
                // so is better than listing nothing.
                <Placeholder key={download.label} label={download.label} className="w-40" />
              ),
            )}
          </div>
        </>
      )}

    </section>
  )
}

export default MusicalSection
