import Placeholder from './Placeholder'
import AudioPlayer from './AudioPlayer'

function ReleaseItem({ release }) {
  return (
    <div className="flex gap-3">
      <Placeholder
        label="Cover art"
        dims="1000×1000px"
        aspect="aspect-square"
        className="w-24 shrink-0"
      />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold">{release.title}</h3>

        <div className="mt-2">
          <AudioPlayer
            id={release.id}
            src={release.audioSrc}
            title={release.title}
            duration={release.duration}
          />
        </div>

        {/* Fixed height either way so released and coming-soon rows stay level. */}
        <div className="mt-2 flex h-8 items-center gap-3 text-sm">
          {release.status === 'coming-soon' ? (
            <Placeholder label="Coming soon" className="h-full w-40 p-0" />
          ) : (
            release.links.map((link) => (
              <a key={link.label} href={link.href} className="underline">
                {link.label}
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ReleaseItem
