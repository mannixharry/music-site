import { formatTime } from '../format'
import { usePlayback } from '../context/playbackContext'
import { PauseIcon, PlayIcon, scrubberTrack } from './AudioPlayer'

// A slim strip under the header, once something is playing.
//
// It was fixed to the bottom of the viewport, which is where a player usually
// goes and which turned out to be the one edge the site does not control: if
// the browser window overhangs the work area, Windows draws its taskbar over
// that strip and the bar is simply gone. A page cannot see OS chrome —
// env(safe-area-inset-*) describes iOS cutouts and reports zero here — so the
// only reliable answer is not to sit against that edge.
//
// It rides with the header instead, which is already pinned and which nothing
// else draws over. Identical at every width, so there is no second layout to
// keep working.
function NowPlaying() {
  const { track, playing, currentTime, duration, hasMetadata, play, pause, clear, seek } =
    usePlayback()

  if (!track) return null

  const seekable = hasMetadata && Number.isFinite(duration) && duration > 0
  const scrubber = scrubberTrack(duration, currentTime, seekable)

  return (
    <div
      // A landmark you might jump to, not a section of the page you are reading.
      role="region"
      aria-label="Now playing"
      // A tone darker than the header above it, as the admin strip is: this is
      // a state the site is in rather than a part of the site.
      className="border-b border-gray-300 bg-gray-200"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-1.5">
        <button
          type="button"
          onClick={() => (playing ? pause() : play(track))}
          aria-label={`${playing ? 'Pause' : 'Play'} ${track.title}`}
          className={`grid h-7 w-7 shrink-0 place-items-center border transition-colors ${
            playing
              ? 'border-gray-500 bg-gray-300 text-gray-900'
              : 'border-gray-400 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <p className="min-w-0 flex-1 truncate text-xs">
          <span className="text-gray-600">Playing</span>{' '}
          <span className="font-bold">{track.title}</span>
        </p>

        {/* Hidden altogether on a phone: the title is what this is for, and a
            scrubber squeezed to forty pixels is not a control.
            Above that it takes a share of the row rather than a fixed width —
            it was sized when this bar ran the full width of the screen, and
            left stranded in the middle of a narrower column. Capped so it
            cannot crowd out the title, which is the more important half. */}
        <input
          type="range"
          min="0"
          max={scrubber.max}
          // A second per arrow key — see the note on the row players.
          step="1"
          value={currentTime}
          disabled={!seekable}
          aria-label={`Seek within ${track.title}`}
          style={scrubber.style}
          className="scrubber hidden h-4 min-w-0 flex-1 sm:block sm:max-w-xs"
          onChange={(event) => seek(Number(event.currentTarget.value))}
        />

        <span className="shrink-0 text-xs tabular-nums text-gray-600">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <button
          type="button"
          onClick={clear}
          aria-label="Stop and close"
          // Measured at 25×22 before this, which is under the 24px square a
          // touch target is meant to be — on the one control that is on screen
          // at every scroll position, and the one whose neighbour is a play
          // button you did not mean to press.
          className="grid h-7 w-7 shrink-0 place-items-center border border-gray-400 bg-white text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default NowPlaying
