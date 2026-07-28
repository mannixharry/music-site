import { Link } from 'react-router-dom'
import ReleaseItem from './ReleaseItem'
import { useContent } from '../context/contentContext'

function MusicSection() {
  const { singles } = useContent()

  return (
    <section>
      <h2 className="text-2xl font-bold">Music</h2>
      <div className="mt-6 space-y-6">
        {singles.map((single) => (
          <ReleaseItem key={single.id} release={single} />
        ))}
      </div>
      <Link to="/songs" className="mt-6 inline-block text-sm underline">
        Hear more songs
      </Link>
    </section>
  )
}

export default MusicSection
