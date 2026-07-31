import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

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
    const onScroll = () => {
      const node = nav.current
      if (!node) return

      // Measured off this row rather than from a number: whatever is pinned
      // above it, its own bottom edge is where the readable page begins.
      const line = node.getBoundingClientRect().bottom + 8

      // The last section past that edge is the one being read; the first stays
      // marked until the second reaches it, so the top of the page belongs to
      // the first section rather than to nothing.
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
                // The marking the site nav uses, one level down. Weight and an
                // underline carry it; colour is the third signal, not the only
                // one.
                className={`inline-block py-1 -my-1 underline${current ? ' font-bold text-accent' : ''}`}
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
