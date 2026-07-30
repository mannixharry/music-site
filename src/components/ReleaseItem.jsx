import Placeholder from './Placeholder'
import AudioPlayer from './AudioPlayer'
import SnippetTag from './SnippetTag'

// A song with no art renders nothing at all here rather than a placeholder box.
// Most of the catalogue has no cover yet, and a column of dashed rectangles
// reads as the page having failed to load rather than as work still to do. The
// row simply takes the full width instead, so the two cases still line up as
// long as neighbouring songs agree — which they do, art arriving per release.
const COVER_CLASS = 'aspect-square w-24 shrink-0'

function ReleaseItem({ release }) {
  return (
    <div className="flex gap-3">
      {release.coverSrc && (
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
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-bold">{release.title}</h3>
          {release.isSnippet && <SnippetTag title={release.title} />}
        </div>

        <div className="mt-2">
          <AudioPlayer
            id={release.id}
            src={release.audioSrc}
            title={release.title}
            duration={release.duration}
          />
        </div>

        {/* Only when there is something to put in it. This was a fixed-height
            row either way, to keep released and coming-soon songs level — but
            almost nothing carries streaming links yet, so in practice it was
            32px of nothing under every song, which is what made a list of
            coverless singles look so strung out. */}
        {(release.status === 'coming-soon' || release.links.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            {release.status === 'coming-soon' ? (
              <Placeholder label="Coming soon" className="w-40" />
            ) : (
              release.links.map((link) => (
                <a key={link.label} href={link.href} className="underline">
                  {link.label}
                </a>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReleaseItem
