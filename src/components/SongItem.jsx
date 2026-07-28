import AudioPlayer from './AudioPlayer'

// Everything below the title is optional, so a song can be a snippet, a set of
// streaming links, a paragraph of text, or any combination of the three.
function SongItem({ song }) {
  const links = song.links ?? []

  return (
    <article className="border-t border-gray-300 pt-6">
      <h3 className="text-lg font-bold">{song.title}</h3>

      {song.description && <p className="mt-2 text-sm leading-relaxed">{song.description}</p>}

      {song.audioSrc && (
        <div className="mt-3">
          <AudioPlayer
            id={song.id}
            src={song.audioSrc}
            title={song.title}
            duration={song.duration}
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
