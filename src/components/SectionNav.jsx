import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PRESS } from '../rules'

// A row of links to the sections of the page you are on, pinned under the
// header, with the one you are inside marked. /musicals is three sections and
// about ten thousand pixels; this makes reaching any of them one click from
// anywhere.
//
// Paper rather than the header's grey: this belongs to the page rather than to
// the site, and the distinction is worth keeping visible.
function SectionNav({ items }) {
  const [active, setActive] = useState(items[0]?.slug ?? null)
  const nav = useRef(null)

  useEffect(() => {
    const node = nav.current
    if (!node) return

    const onScroll = () => {
      const sections = items.map((item) => ({
        slug: item.slug,
        node: document.getElementById(item.slug),
      }))

      // Where a section actually comes to rest when it is jumped to, asked of
      // the engine rather than worked out a second time here.
      //
      // This used to be measured off this row — `getBoundingClientRect().bottom
      // + 8` — which is the same number by a different route, and the two
      // disagreed by less than a pixel in a way that broke the whole thing.
      // `--chrome` is published from offsetHeight, which is an INTEGER: a
      // pinned block 103.5px tall publishes 104, so `scroll-margin-top` puts
      // the section at 112 while this row's fractional bottom edge put the line
      // at 111.5. Every jumped-to section landed just below the line that was
      // looking for it, so nothing was ever marked as reached — but only at the
      // widths where that height happened to land on a half pixel, which is why
      // it looked arbitrary and why the phone layout was fine.
      //
      // Read from a section rather than from --chrome so the 0.5rem in the
      // `clears-chrome` rule is not written down twice; they all carry it.
      const anchored = sections.find((section) => section.node)
      const line = anchored
        ? // Sub-pixel slack. A scroll can land a fraction of a pixel out, and
          // this comparison is exactly on the boundary by construction.
          parseFloat(getComputedStyle(anchored.node).scrollMarginTop) + 2
        : node.getBoundingClientRect().bottom + 8

      // The last section past that edge is the one being read; the first stays
      // marked until the second reaches it, so the top of the page belongs to
      // the first section rather than to nothing.
      let current = items[0]?.slug ?? null
      for (const section of sections) {
        if (section.node && section.node.getBoundingClientRect().top <= line) {
          current = section.slug
        }
      }

      // At the bottom of the page the last section is the one being read, even
      // if it is too short to have reached the line — which a section with one
      // song in it is, and which no amount of scrolling can fix, because there
      // is no page left to scroll. Without this, clicking the last link scrolls
      // there and marks the one above it, for good.
      const remaining =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight
      if (remaining <= 2) current = items[items.length - 1]?.slug ?? current

      setActive(current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    // A section's height changes when a synopsis is opened, which moves every
    // section after it without any scrolling having happened.
    window.addEventListener('resize', onScroll)

    // The pinned block this row sits in changes height on its own — the strip
    // appears when something plays, the header wraps — and `--chrome` moves
    // with it, so the line moves with it. None of that fires scroll or resize.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onScroll)
    if (observer && node.parentElement) observer.observe(node.parentElement)

    return () => {
      observer?.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [items])

  return (
    <nav
      ref={nav}
      aria-label="Sections of this page"
      className="border-b border-gray-300 bg-white"
    >
      <ul className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-sm">
        {items.map((item) => {
          const current = item.slug === active
          return (
            <li key={item.slug}>
              <Link
                to={`#${item.slug}`}
                // The marking the site nav uses, one level down. Weight and an
                // underline carry it; colour is the third signal, not the only
                // one.
                className={`inline-block py-1 -my-1 underline ${PRESS}${current ? ' font-bold text-accent' : ''}`}
                // Announced, not just drawn: a screen reader gets this from
                // aria-current or not at all.
                aria-current={current ? 'true' : undefined}
              >
                {item.label}
                {/* Muted and inside the link, so the count reads as part of
                    the label rather than a second thing to aim at. */}
                {item.count !== undefined && (
                  <span className="font-normal text-gray-600"> ({item.count})</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default SectionNav
