import TrackArt from './TrackArt'
import TrackTitle from './TrackTitle'
import SnippetTag from './SnippetTag'
import { formatTime } from '../format'

// Everything below the title is optional, so a song can be a sleeve and a
// title, a set of streaming links, a paragraph of text, or any combination.
//
// The bare title, not the composed one. /songs draws every song under its
// album's heading, so the composed title repeated the show's name on all
// nineteen of its demos — "Pigs — Trotters" under a heading reading "Pigs".
// Which is the same reason MusicalSection has always used `shortTitle`.
//
// The sleeve and the preview tag keep the composed title, because both are read
// out of the list: one names the track on a lock screen, the other in a tooltip
// that has to stand on its own. Search on /songs still matches the composed
// title too, so typing a musical's name finds its demos.
function SongItem({ song, queue }) {
  const links = song.links ?? []

  return (
    <article className="flex gap-3">
      <TrackArt song={song} queue={queue} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Not underlined, and still not a link. The title was once the way
              in to a page per song; those are gone, and an underlined heading
              that goes nowhere is worse than a heading. What it does now is
              what the sleeve beside it does — it plays the song — which is why
              it is a button wearing no decoration at all. */}
          <h3 className="text-lg font-bold">
            <TrackTitle song={song} queue={queue}>
              {song.shortTitle}
            </TrackTitle>
          </h3>
          {song.isSnippet && song.showSnippetTag && <SnippetTag title={song.title} />}
        </div>

        {/* The length, which the transport used to carry along its right-hand
            edge. Still the recorded figure rather than one read off the file,
            so a page of songs fetches no audio to draw itself. */}
        {song.duration && (
          <p className="text-xs tabular-nums text-gray-600">{formatTime(song.duration)}</p>
        )}

        {song.description && <p className="mt-2 text-sm leading-relaxed">{song.description}</p>}

        {links.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {links.map((link) => (
              <a key={link.label} href={link.href} className="underline">
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export default SongItem
