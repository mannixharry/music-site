import { Link } from 'react-router-dom'
import ReleaseItem from './ReleaseItem'
import { useContent } from '../context/contentContext'
import { HEADING, LIST, LIST_ITEM } from '../rules'

function MusicSection() {
  const { singles } = useContent()

  return (
    <section>
      <h2 className={HEADING}>Music</h2>
      <div className={`mt-2 ${LIST}`}>
        {singles.map((single) => (
          <div key={single.id} className={LIST_ITEM}>
            <ReleaseItem release={single} />
          </div>
        ))}
      </div>
      <Link to="/songs" className="mt-6 inline-block text-sm underline">
        Hear more songs
      </Link>
    </section>
  )
}

export default MusicSection
