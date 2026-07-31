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

// The way back to the top of a long page: one control pinned to the corner,
// present wherever you are and belonging to the page rather than to the
// writing.
//
// It borrows the transport buttons' look on purpose — a square, a hairline
// border, no shadow. This is the site's only floating furniture, so it should
// read as part of the same set rather than as something bolted on.
function BackToTop() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // A fixed distance, not a share of the window. A window-relative threshold
    // makes the same page behave differently on a laptop and a monitor, and
    // never offers the control at all on pages that are not a full screen
    // taller than the window.
    //
    // 320 is about a header and the first block: far enough that the top is out
    // of sight, near enough to be offered on every page long enough to need it.
    // A page too short to scroll that far never triggers it, which is right.
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
        // page reads like the site reloaded. Not for a reader who has asked for
        // less motion: for them the jump is the accessible answer.
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' })

        // Hand focus over before this button removes itself. Scrolling to the
        // top hides the control, which unmounts the element holding focus — and
        // focus would fall to <body>, which for a keyboard is the whole page
        // gone. The header takes it, so the next Tab carries on from the top.
        document.getElementById('site-header')?.focus()
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
