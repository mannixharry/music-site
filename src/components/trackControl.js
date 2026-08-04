import { useMemo } from 'react'
import { usePlayback } from '../context/playbackContext'

// What a song's row needs in order to start it: what to hand the provider, what
// state it is in, and what to call the control.
//
// It is a hook rather than something TrackArt owns because a row now has two
// ways in — the sleeve and the title beside it — and they have to be the same
// press. Two copies of "find this song in the queue, or build an entry from it"
// is exactly the kind of pair that drifts: one of them gets the album and the
// artwork for the lock screen and the other does not, and the difference only
// shows up on a phone that has been locked.
//
// `entry` is taken from the queue where there is one, so what travels to the
// Media Session is the queue's own record of the track, and it is memoised
// because TrackArt watches it in an effect.
export function useTrackControl(song, queue) {
  const playback = usePlayback()

  const isActive = playback.track?.id === song.id
  const isPlaying = isActive && playback.playing

  const entry = useMemo(
    () =>
      queue?.find((item) => item.id === song.id) ?? {
        id: song.id,
        src: song.audioSrc,
        title: song.title,
        duration: song.duration,
        album: song.album?.title ?? null,
        artwork: song.coverSrc ?? null,
      },
    [queue, song],
  )

  return {
    playback,
    isActive,
    isPlaying,
    entry,
    toggle: () => (isPlaying ? playback.pause() : playback.play(entry, queue)),
    // The composed title, not the bare one: a control is announced out of the
    // context it sits in, so "Play Pigs — Trotters" says which Trotters.
    label: `${isPlaying ? 'Pause' : 'Play'} ${song.title}`,
  }
}
