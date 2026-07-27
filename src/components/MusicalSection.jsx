import Placeholder from './Placeholder'
import AudioPlayer from './AudioPlayer'
import ScriptwriterCallout from './ScriptwriterCallout'

function MusicalSection({ musical }) {
  return (
    <section id={musical.slug} className="py-8">
      <h2 className="text-2xl font-bold">{musical.title}</h2>
      <p className="text-sm">
        {musical.year} &middot; {musical.status}
      </p>

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

      <h3 className="mt-6 font-bold">Demos</h3>
      <div className="mt-2 space-y-2">
        {musical.demos.map((demo) => (
          <AudioPlayer key={demo.id} title={demo.title} duration={demo.duration} src={demo.src} />
        ))}
      </div>

      {musical.needsScriptwriter ? (
        <div className="mt-6">
          <ScriptwriterCallout contactHref={musical.contactHref} />
        </div>
      ) : (
        <>
          <h3 className="mt-6 font-bold">Downloads</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {musical.downloads.map((download) => (
              <Placeholder key={download.label} label={download.label} className="w-40" />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export default MusicalSection
