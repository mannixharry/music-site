import Placeholder from '../components/Placeholder'
import SongItem from '../components/SongItem'
import { songs } from '../content/songs'

function Songs() {
  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold">Songs</h1>
      <p className="mt-2 text-sm leading-relaxed">
        The wider catalogue — recordings, demos, and one-offs beyond the singles on the front page.
      </p>

      {songs.length > 0 ? (
        <div className="mt-8 space-y-6">
          {songs.map((song) => (
            <SongItem key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <Placeholder label="No songs added yet — see src/content/songs.js" className="mt-8 h-32" />
      )}
    </div>
  )
}

export default Songs
