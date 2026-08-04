import { useTrackControl } from './trackControl'
import { PRESS } from '../rules'

// A song's title, and pressing it starts the song.
//
// The sleeve was the only way to play something from a list, and on a phone
// that is a 56px square to hit while the words next to it — the part you are
// actually reading, and the part you would point at if you were pointing at
// anything — did nothing at all. Now both work, and they are the same press:
// see useTrackControl, which is what the sleeve uses too.
//
// The padding is the point of the class list. `-my-2 py-2` is layout-neutral —
// the negative margin gives back exactly what the padding takes, so nothing
// moves — and it turns a 20px line of type into a 36px target with 8px of slop
// above and below. A near miss over or under the title now plays the song
// instead of doing nothing, which on a touch screen is most of the difference
// between a control that works and one that has to be aimed at.
//
// `block` rather than the button's own inline-block, and that is what makes the
// margins cancel: vertical margins on an inline-level box do not affect the
// line it sits in, so the padding alone would have made every row 16px taller.
// `w-full` goes with it, and is not the redundancy it looks like: a button is
// sized shrink-to-fit whatever its display is, so a block one still comes out
// at the width of its own words and simply overflows the heading rather than
// being clipped by it. That is what stopped the longest title in the home
// page's list from ellipsising and let it run underneath the Preview tag
// instead. Told to take the full width, it is a plain block again — the slop
// runs the whole line, and `truncate` from the caller cuts at the right edge.
//
// The slop is vertical only. The same trick sideways needs the button to know
// how wide it may get, and `max-w-full` inside a heading that is itself sized
// from this button is a cycle — which Chrome resolves by making the heading far
// narrower than its text, so every title in the home page's list truncated to
// two or three letters. There is nothing to win there anyway: sideways, the
// thing being aimed at is the words, and the words are already the target.
//
// A press shows in the opacity rather than in a scale — the sleeve takes the
// scale, and a line of type that jumps 5% smaller under a thumb reads as a
// glitch rather than as a button. There is no hover treatment: an underline
// here would promise a page that no longer exists (see SongItem), and the
// accent means one thing on this site, which is the song that is playing.
function TrackTitle({ song, queue, className = '', children }) {
  const { toggle, label } = useTrackControl(song, queue)

  // A song announced before its recording has arrived has nothing to press, and
  // a button that does nothing is worse than plain text. The sleeve makes the
  // same call for the same reason.
  if (!song.audioSrc) return children

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      // aria-pressed would be wrong: this is not a toggle that stays down, it
      // is the same button naming what it will do next, which is what the
      // label already says.
      className={`-my-2 block w-full cursor-pointer py-2 text-left ${PRESS} active:opacity-60 ${className}`}
    >
      {children}
    </button>
  )
}

export default TrackTitle
