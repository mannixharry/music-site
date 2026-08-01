import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ReleaseItem from './ReleaseItem'
import { useContent } from '../context/contentContext'
import { toQueue } from '../content/normalise'
import { HEADING, LIST, LIST_ITEM, SECTION_LINK } from '../rules'

function MusicSection() {
  const { homeSongs } = useContent()
  // The home page's songs play on from one to the next, in the order shown.
  const queue = useMemo(() => toQueue(homeSongs), [homeSongs])

  return (
    <section>
      <h2 className={HEADING}>Music</h2>
      <div className={`mt-2 ${LIST}`}>
        {homeSongs.map((song) => (
          <div key={song.id} className={LIST_ITEM}>
            <ReleaseItem release={song} queue={queue} />
          </div>
        ))}
      </div>
      <Link to="/songs" className={SECTION_LINK}>
        Hear more songs
      </Link>
    </section>
  )
}

export default MusicSection
