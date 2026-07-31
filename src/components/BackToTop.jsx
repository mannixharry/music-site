import { useEffect, useState } from 'react'

// Drawn rather than typed, for the reason AudioPlayer's transport icons are:
// the arrow characters that would do this job have emoji presentations on some
// platforms, so the system font would decide the colour and weight.
function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M8 2.5 13.5 8l-1.06 1.06L8.75 5.37V13.5h-1.5V5.37L3.56 9.06 2.5 8z" />
    </svg>
  )
}

// The way back to the top of a long page.
//
// This used to be a text link at the foot of each section — one under every
// musical and one under every group of songs — which meant it existed only
// where a section happened to end. Halfway down Copperfield's synopsis there
// was no way back at all except scrolling, and four copies of the same sentence
// were four interruptions in the reading column.
//
// One control instead, pinned to the corner, present wherever you are and
// belonging to the page rather than to the writing. It borrows the transport
// buttons' look on purpose: a square, a hairline border, no shadow. This site
// has no floating furniture anywhere else, so the one piece of it should read
// as part of the same set rather than as something bolted on.
function BackToTop() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // A fixed distance, not a share of the window.
    //
    // This was "more than one window height", which made the control appear on
    // some pages and never on others for a reason no reader could see: /about
    // and /contact are not a whole screen taller than the window, so on a
    // 1512×945 Mac you could scroll 452 pixels down /about and never be offered
    // the way back. Worse, the taller the window the further you had to scroll,
    // so the same page behaved differently on a laptop and on a monitor.
    //
    // 320 is about a header and the first block of a page — far enough that the
    // top is genuinely out of sight, near enough that it is offered on every
    // page long enough to need it. A page too short to scroll that far cannot
    // trigger it, which is the one case where nothing should appear.
    const onScroll = () => setScrolled(window.scrollY > 320)

    // Run once immediately. A reload partway down a page, or a link into
    // /musicals#guyana-skies, both start scrolled without firing an event.
    onScroll()

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!scrolled) return null

  return (
    <button
      type="button"
      onClick={() => {
        // Smooth, because arriving instantly from the foot of a 10,000-pixel
        // page gives no sense of having travelled and reads like the site
        // reloaded. Honoured only where the reader has not asked for less
        // motion — for them the jump is the accessible answer, not a courtesy.
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' })
      }}
      // Both, because the label is what a screen reader announces and the title
      // is what everyone else gets on hover — the icon alone says "up", not
      // "the top of the page".
      aria-label="Back to the top"
      title="Back to the top"
      className="fixed bottom-4 right-4 z-30 grid h-10 w-10 place-items-center border border-gray-400 bg-white text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 sm:bottom-6 sm:right-6"
    >
      <ArrowUpIcon />
    </button>
  )
}

export default BackToTop
