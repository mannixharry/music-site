import { Link } from 'react-router-dom'
import BackToTop from '../components/BackToTop'
import Placeholder from '../components/Placeholder'
import SongItem from '../components/SongItem'
import { useContent } from '../context/contentContext'

// The three kinds the catalogue already sorts itself into — the same split the
// admin's list uses, and the one the paragraph below has always described. It
// was only ever the rendering that ignored it.
//
// Order matters here and is not the storage order: this is the order the groups
// appear in, and the catalogue's own `sortOrder` still decides what happens
// inside each one.
const GROUPS = [
  { kind: 'single', slug: 'singles', title: 'Singles' },
  { kind: 'demo', slug: 'from-the-musicals', title: 'From the musicals' },
  { kind: 'other', slug: 'other', title: 'Other' },
]

function Songs() {
  const { songs } = useContent()

  const groups = GROUPS.map((group) => ({
    ...group,
    songs: songs.filter((song) => song.kind === group.kind),
  })).filter((group) => group.songs.length > 0)

  return (
    <div id="top" className="scroll-mt-20 py-8">
      <h1 className="text-4xl font-bold">Songs</h1>
      <p className="mt-2 text-sm leading-relaxed">
        The whole catalogue in one place — the singles, the snapshots from the musicals, and
        everything else.
      </p>

      {/* Only worth the row when there is more than one place to go. */}
      {groups.length > 1 && (
        <nav aria-label="Jump to a group" className="mt-6 border-y border-gray-300 py-3">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {groups.map((group) => (
              <li key={group.slug}>
                <Link to={`#${group.slug}`} className="underline">
                  {group.title}
                </Link>{' '}
                <span className="text-gray-600">({group.songs.length})</span>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {groups.length > 0 ? (
        groups.map((group) => (
          <section key={group.slug} id={group.slug} className="mt-10 scroll-mt-20">
            <h2 className="text-xl font-bold">{group.title}</h2>
            <div className="mt-4 space-y-6">
              {group.songs.map((song) => (
                <SongItem key={song.id} song={song} />
              ))}
            </div>
            {/* Singles alone runs past a screen, so each group ends with the
                way back to the row of links at the top. */}
            <BackToTop />
          </section>
        ))
      ) : (
        <Placeholder label="No songs added yet — add one from /admin" className="mt-8 h-32" />
      )}
    </div>
  )
}

export default Songs
