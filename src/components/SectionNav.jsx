import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// A row of links to the sections of the page you are on, pinned under the
// header, with the one you are currently inside marked.
//
// It replaces a row that sat at the top of /musicals and was therefore useful
// only before you had read anything. That page is three sections and about ten
// thousand pixels; the way to the third one was to scroll past the first two,
// and the way back was a link at the foot of each. Reaching a different musical
// is now one click from anywhere in the page.
//
// Paper rather than the header's grey: this belongs to the page rather than to
// the site, and the distinction is worth keeping visible.
function SectionNav({ items }) {
  const [active, setActive] = useState(items[0]?.slug ?? null)
  const nav = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      const node = nav.current
      if (!node) return

      // Measured off this row rather than from a number written down
      // somewhere: whatever is pinned above it — the header alone, or the
      // header and the now-playing strip — this row's own bottom edge is
      // exactly where the readable part of the page begins.
      const line = node.getBoundingClientRect().bottom + 8

      // The last section to have passed under that edge is the one being read.
      // The first stays marked until the second reaches it, which is what makes
      // the top of the page belong to the first section rather than to nothing.
      let current = items[0]?.slug ?? null
      for (const item of items) {
        const section = document.getElementById(item.slug)
        if (section && section.getBoundingClientRect().top <= line) current = item.slug
      }

      setActive(current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    // A section's height changes when a synopsis is opened, which moves every
    // section after it without any scrolling having happened.
    window.addEventListener('resize', onScroll)

    return () => {
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
                // The same marking the site nav uses for the page you are on,
                // because it means the same thing one level down. Weight and an
                // underline carry it; the colour is the third signal, not the
                // only one.
                className={current ? 'font-bold text-accent underline' : 'underline'}
                // Announced, not just drawn. This is the in-page equivalent of
                // the header's current page, and a screen reader gets that from
                // aria-current or not at all.
                aria-current={current ? 'true' : undefined}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default SectionNav
