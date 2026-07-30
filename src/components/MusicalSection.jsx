import Placeholder from './Placeholder'
import AudioPlayer from './AudioPlayer'
import ScriptwriterCallout from './ScriptwriterCallout'
import { useContent } from '../context/contentContext'

function MusicalSection({ musical }) {
  const { demosFor } = useContent()
  const demos = demosFor(musical.slug)

  return (
    <section id={musical.slug} className="py-8">
      <h2 className="text-2xl font-bold">{musical.title}</h2>
      <p className="text-sm">{musical.status}</p>

      <Placeholder
        label={musical.heroLabel}
        dims={musical.heroDims}
        aspect="aspect-video"
        className="mt-4"
      />

      <h3 className="mt-6 font-bold">{musical.resumeLabel}</h3>
      <div className="mt-2 space-y-3 text-sm leading-relaxed">
        {musical.resume.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

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
                <p className="text-sm">{demo.shortTitle}</p>
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
    </section>
  )
}

export default MusicalSection
