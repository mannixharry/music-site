import Placeholder from './Placeholder'
import AudioPlayer from './AudioPlayer'

// The cover box keeps its size whether or not there is art in it, so a
// catalogue where only some songs have one still lines up.
const COVER_CLASS = 'aspect-square w-24 shrink-0'

function ReleaseItem({ release }) {
  return (
    <div className="flex gap-3">
      {release.coverSrc ? (
        <img
          src={release.coverSrc}
          // The title is already the heading beside it, so naming the song again
          // would just be read out twice. This says what the image is.
          alt={`Cover art for ${release.title}`}
          width={1000}
          height={1000}
          loading="lazy"
          decoding="async"
          className={`${COVER_CLASS} border border-gray-300 object-cover`}
        />
      ) : (
        <Placeholder label="Cover art" dims="1000×1000px" className={COVER_CLASS} />
      )}

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
