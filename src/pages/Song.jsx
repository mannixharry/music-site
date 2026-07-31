import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import AudioPlayer from '../components/AudioPlayer'
import SnippetTag from '../components/SnippetTag'
import NotFound from './NotFound'
import { useContent } from '../context/contentContext'
import { toQueue } from '../content/normalise'
import { musicals } from '../content/musicals'
import { ANCHOR, HEADING, SECTION_FIRST } from '../rules'
import { usePageMeta } from '../usePageMeta'

// One song, at an address of its own — the page that makes a single track
// something Frank can put in a message.
function Song() {
  const { slug } = useParams()
  const { songs } = useContent()

  // By slug, then by id. The slug is built from the title, so renaming a song
  // changes it; the id never does, which makes it the address of last resort
  // rather than the one on show.
  const song = songs.find((item) => item.slug === slug) ?? songs.find((item) => item.id === slug)

  // Its neighbours, so playing it runs on into the rest of what it belongs to:
  // the other demos of its musical, or the other singles.
  const queue = useMemo(() => {
    if (!song) return []
    const family = song.albumId
      ? songs.filter((item) => item.albumId === song.albumId)
      : songs.filter((item) => !item.albumId)
    return toQueue(family)
  }, [song, songs])

  // Only a musical has an editorial page to point back at.
  const musical = musicals.find((item) => item.slug === song?.albumId)

  usePageMeta({
    title: song ? song.title : 'Song not found',
    description:
      song?.description ||
      (song
        ? `${song.title} by Frank Kirwan — listen on frankkirwan.com.`
        : 'That song does not exist on this site.'),
  })

  // The catalogue ships with the bundle, so an unknown slug is genuinely
  // unknown rather than not-loaded-yet.
  if (!song) return <NotFound />

  return (
    <div className={`${ANCHOR} py-8`}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-bold">{song.shortTitle}</h1>
        {song.isSnippet && song.showSnippetTag && <SnippetTag title={song.title} />}
      </div>

      {musical ? (
        <p className="mt-2 text-sm">
          From{' '}
          <Link to={`/musicals#${musical.slug}`} className="underline">
            {musical.title}
          </Link>
        </p>
      ) : (
        song.album && (
          <p className="mt-2 text-sm">
            From{' '}
            <Link to={`/songs#${song.album.id}`} className="underline">
              {song.album.title}
            </Link>
          </p>
        )
      )}

      {song.description && <p className="mt-4 text-sm leading-relaxed">{song.description}</p>}

      {song.audioSrc ? (
        <div className="mt-6">
          <AudioPlayer
            id={song.id}
            src={song.audioSrc}
            title={song.title}
            duration={song.duration}
            queue={queue}
          />
        </div>
      ) : (
        <p className="mt-6 text-sm text-gray-600">There is no recording of this one on the site yet.</p>
      )}

      {song.links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {song.links.map((link) => (
            <a key={link.label} href={link.href} className="underline">
              {link.label}
            </a>
          ))}
        </div>
      )}

      <section className={SECTION_FIRST}>
        <h2 className={HEADING}>More</h2>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <li>
            <Link to="/songs" className="underline">
              All songs
            </Link>
          </li>
          {musical && (
            <li>
              <Link to={`/musicals#${musical.slug}`} className="underline">
                {musical.title}
              </Link>
            </li>
          )}
          <li>
            <Link to="/contact" className="underline">
              Contact
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}

export default Song
