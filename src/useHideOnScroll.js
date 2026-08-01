import { useEffect, useState } from 'react'

// True while the reader is scrolling *down* a page, so the pinned block can get
// out of the way.
//
// It exists for a phone. A header, a now-playing strip and a row of section
// links come to a third of a 393×852 screen, and on /musicals — a synopsis of
// several screens, which is the page this site is most read on — that third is
// held back from the reading the whole way down. On a desktop the same block is
// an eighth of the window and there is nothing to reclaim, which is why only
// the small breakpoint acts on this; the hook itself runs everywhere because a
// window can be resized across that line and a listener costs a comparison per
// frame of scrolling.
//
// Two numbers, both there to stop it flickering:
//
// `after` is how far down the page it may hide at all. Near the top the block
// is not in the way — it is the thing you are about to use — and hiding it in
// the first few pixels of a flick reads as the header falling off.
//
// `delta` is how far the reader must move before it changes its mind. Without
// it, the rubber-band at the end of an iOS scroll is a run of one-pixel moves in
// alternating directions and the bar strobes. Movement smaller than that is
// ignored *and not recorded*, so a slow drag still accumulates to a decision
// rather than never reaching one.
export function useHideOnScroll({ after = 160, delta = 8 } = {}) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Below the fold already, on a page restored to where it was left.
    let last = Math.max(0, window.scrollY)
    let frame = 0

    const measure = () => {
      frame = 0
      // Negative on an iOS overscroll, and a bounce back from it is a
      // downward move that would otherwise hide the block at the top of a page.
      const y = Math.max(0, window.scrollY)
      const moved = y - last
      if (Math.abs(moved) < delta) return

      last = y
      setHidden(moved > 0 && y > after)
    }

    // Coalesced to a frame: a scroll fires far more often than the screen is
    // drawn, and every one of these ends in a setState.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [after, delta])

  return hidden
}
