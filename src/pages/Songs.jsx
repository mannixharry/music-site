import Placeholder from '../components/Placeholder'
import SongItem from '../components/SongItem'
import { useContent } from '../context/contentContext'

function Songs() {
  const { songs } = useContent()

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold">Songs</h1>
      <p className="mt-2 text-sm leading-relaxed">
        The whole catalogue in one place — the singles, the snapshots from the musicals, and
        everything else.
      </p>

      {songs.length > 0 ? (
        <div className="mt-8 space-y-6">
          {songs.map((song) => (
            <SongItem key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <Placeholder label="No songs added yet — add one from /admin" className="mt-8 h-32" />
      )}
    </div>
  )
}

export default Songs
