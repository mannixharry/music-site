import { Link } from 'react-router-dom'
import ReleaseItem from './ReleaseItem'
import { releases } from '../content/releases'

function MusicSection() {
  return (
    <section>
      <h2 className="text-2xl font-bold">Music</h2>
      <div className="mt-6 space-y-6">
        {releases.map((release) => (
          <ReleaseItem key={release.id} release={release} />
        ))}
      </div>
      <Link to="/songs" className="mt-6 inline-block text-sm underline">
        Hear more songs
      </Link>
    </section>
  )
}

export default MusicSection
