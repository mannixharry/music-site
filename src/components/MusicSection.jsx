import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ReleaseItem from './ReleaseItem'
import { useContent } from '../context/contentContext'
import { toQueue } from '../content/normalise'
import { HEADING, LIST, LIST_ITEM, SECTION_LINK } from '../rules'

function MusicSection() {
  const { singles } = useContent()
  // The five singles play on from one to the next, in the order shown.
  const queue = useMemo(() => toQueue(singles), [singles])

  return (
    <section>
      <h2 className={HEADING}>Music</h2>
      <div className={`mt-2 ${LIST}`}>
        {singles.map((single) => (
          <div key={single.id} className={LIST_ITEM}>
            <ReleaseItem release={single} queue={queue} />
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
