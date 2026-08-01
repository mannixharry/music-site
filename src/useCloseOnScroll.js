import { useEffect } from 'react'

// Shuts something the reader has opened over the page — the phone menu, the
// now-playing sleeve — as soon as they scroll away from it.
//
// Both of those are panels that drop out of the pinned block and cover a third
// of a phone's screen, and both are opened to answer one question: where else
// can I go, what is this record. Scrolling is the reader saying they have
// finished with it and gone back to the page, and a panel that stays put after
// that is a piece of furniture left in the way of the thing it was covering.
//
// It is the panels alone. The bars they hang off — the header and the strip
// with the transport in it — stay pinned and visible the whole way down, which
// is what they are pinned for: the play button and the way out of a long page
// should not be somewhere up the page you have to scroll back to find.
//
// Nothing at all is listening while the panel is shut, which is the case
// almost always. That is why this takes `open` rather than being asked every
// frame whether anything needs closing.
export function useCloseOnScroll(open, close, { delta = 8 } = {}) {
  useEffect(() => {
    if (!open) return

    // Opening the panel is itself a layout change, and a big one — it grows the
    // pinned block by a couple of hundred pixels, and that block sits at the
    // top of the document, so on a page scrolled some way down the browser
    // moves the page under the reader to keep what they were looking at still.
    // That arrives as a scroll of exactly the panel's height. Listening
    // immediately therefore shuts the panel in the same breath as opening it,
    // and only on a page far enough down to have somewhere to be moved from —
    // which is the sort of thing that looks like a broken button rather than a
    // rule working.
    //
    // So the listener goes on after the panel has finished opening. The wait is
    // the SLIDE in rules.js with a frame or two on top; a reader cannot both
    // press a thing and have finished with it inside a quarter of a second.
    let frame = 0
    let last = 0
    let listening = false

    const measure = () => {
      frame = 0
      // Ignores the rubber-band at the ends of an iOS scroll, which is a run of
      // one-pixel moves that would otherwise close a panel nobody touched.
      if (Math.abs(window.scrollY - last) < delta) return
      close()
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    const start = setTimeout(() => {
      last = window.scrollY
      listening = true
      window.addEventListener('scroll', onScroll, { passive: true })
    }, 250)

    return () => {
      clearTimeout(start)
      cancelAnimationFrame(frame)
      if (listening) window.removeEventListener('scroll', onScroll)
    }
  }, [open, close, delta])
}
