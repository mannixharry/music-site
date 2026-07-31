import { Link } from 'react-router-dom'
import AudioPlayer from './AudioPlayer'
import SnippetTag from './SnippetTag'

// Everything below the title is optional, so a song can be a player, a set of
// streaming links, a paragraph of text, or any combination of the three.
function SongItem({ song, queue }) {
  const links = song.links ?? []

  return (
    <article>
      <div className="flex flex-wrap items-center gap-2">
        {/* The title is the way in to the song's own page. A heading that is
            also a link is how a list of things becomes a set of addresses. */}
        <h3 className="text-lg font-bold">
          <Link to={`/songs/${song.slug}`} className="underline">
            {song.title}
          </Link>
        </h3>
        {song.isSnippet && song.showSnippetTag && <SnippetTag title={song.title} />}
      </div>

      {song.description && <p className="mt-2 text-sm leading-relaxed">{song.description}</p>}

      {song.audioSrc && (
        <div className="mt-3">
          <AudioPlayer
            id={song.id}
            src={song.audioSrc}
            title={song.title}
            duration={song.duration}
            queue={queue}
          />
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="underline">
              {link.label}
            </a>
          ))}
        </div>
      )}
    </article>
  )
}

export default SongItem
