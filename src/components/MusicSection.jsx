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
    </section>
  )
}

export default MusicSection
