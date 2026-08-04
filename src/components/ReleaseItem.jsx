import Placeholder from './Placeholder'
import TrackArt from './TrackArt'
import TrackTitle from './TrackTitle'
import SnippetTag from './SnippetTag'
import { formatTime } from '../format'

// A song on the home page. The sleeve is the play button and the only thing on
// the left, which is what the row used to spend a full transport on.
//
// Every one draws a sleeve now, where before a song with no art rendered
// nothing rather than an empty frame — a column of dashed rectangles read as a
// page that had failed to load. What changed is that the fallback is no longer
// an empty frame: see Sleeve in TrackArt.
//
// `title` and not `shortTitle`, and that matters more than it used to: since
// 0007 a song here may belong to a record, and this list has no album heading
// above it to say which. The composed title carries the album's name itself.
function ReleaseItem({ release, queue }) {
  return (
    <div className="flex gap-3">
      <TrackArt song={release} queue={queue} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* The truncation moves onto the button with the words, so the
              ellipsis is still drawn by whatever is holding the text. The
              heading keeps min-w-0 because that is what `truncate` was doing
              for it as a flex item. */}
          <h3 className="min-w-0 text-sm font-bold">
            <TrackTitle song={release} queue={queue} className="truncate">
              {release.title}
            </TrackTitle>
          </h3>
          {release.isSnippet && release.showSnippetTag && <SnippetTag title={release.title} />}
        </div>

        {/* The length, which the transport used to carry. Still taken from the
            data rather than from the file, so nothing is fetched to show it. */}
        {release.duration && (
          <p className="text-xs tabular-nums text-gray-600">{formatTime(release.duration)}</p>
        )}

        {/* Only when there is something to put in it. This was a fixed-height
            row either way, to keep released and coming-soon songs level — but
            almost nothing carries streaming links yet, so in practice it was
            32px of nothing under every song. */}
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
