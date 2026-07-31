// The look of every transport button on the site — the row players and the four
// in the now-playing strip. Size is left to the caller, because the strip's are
// smaller than a row's.
export const TRANSPORT = 'grid shrink-0 place-items-center border transition-colors'
export const TRANSPORT_IDLE =
  'border-gray-400 bg-white text-gray-600 hover:bg-gray-200 hover:text-gray-900'
export const TRANSPORT_ACTIVE = 'border-gray-500 bg-gray-300 text-gray-900'

// The two numbers a scrub bar needs, in one place because there are two bars.
//
// `max` is never zero: min="0" max="0" is a control with no range at all, and
// what a browser draws for one is undefined and differs by engine. An idle row
// is held still by `disabled`, not by having nowhere to go.
//
// `--played` is how far the bar is filled. A range with its native appearance
// removed has no notion of a played side, so the track is a two-stop gradient
// and this is where the stop goes.
export function scrubberTrack(duration, currentTime, seekable) {
  const max = Number.isFinite(duration) && duration > 0 ? duration : 1
  const played = seekable ? Math.min(100, Math.max(0, (currentTime / max) * 100)) : 0
  return { max, style: { '--played': `${played}%` } }
}
