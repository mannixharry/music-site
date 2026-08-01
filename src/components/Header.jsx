import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { navItems } from '../nav'
import { profile } from '../content/profile'
import { PRESS, SLIDE } from '../rules'
import { useCloseOnScroll } from '../useCloseOnScroll'

// The active page gets weight and colour as well as an underline. On a phone the
// menu is a plain column of five links and an underline on its own is easy to
// miss — and the colour is deliberately the third signal rather than the only
// one, because it is no use at all to a reader who cannot see it.
//
// `inline-block py-1 -my-1` is the hit area, not the look. A line of text is 23
// pixels tall here, one under the 24 a touch target is meant to be; the padding
// makes the box big enough to hit and the equal negative margin takes the extra
// height back out of the layout, so nothing moves.
const NAV_TARGET = `inline-block py-1 -my-1 ${PRESS}`

const navLinkClass = ({ isActive }) =>
  isActive
    ? `${NAV_TARGET} font-bold text-accent underline underline-offset-4`
    : `${NAV_TARGET} hover:underline hover:underline-offset-4`

// Drawn rather than typed, for the reason AudioPlayer's transport icons are:
// the characters that would do this job have emoji presentations, so the system
// font decides their colour and weight. An inline SVG inherits currentColor.
function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      {open ? (
        <path d="M3.3 2.3 8 7l4.7-4.7 1 1L9 8l4.7 4.7-1 1L8 9l-4.7 4.7-1-1L7 8 2.3 3.3z" />
      ) : (
        <>
          <rect x="1" y="3" width="14" height="1.6" />
          <rect x="1" y="7.2" width="14" height="1.6" />
          <rect x="1" y="11.4" width="14" height="1.6" />
        </>
      )}
    </svg>
  )
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  // Stable, because it is an effect dependency in the hook below.
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const { key } = useLocation()

  // Every link in the menu closes it on the way out, but the back button does
  // not go through one — and a menu still covering the page you have just
  // returned to looks like the site has locked up.
  useEffect(() => setMenuOpen(false), [key])

  // And scrolling the page behind it is the other way of being finished with
  // it without having chosen anything.
  useCloseOnScroll(menuOpen, closeMenu)

  return (
    // Not sticky itself: Layout pins this and the now-playing strip together,
    // so the two cannot drift apart or need an offset guessed between them.
    <header className="border-b border-gray-300 bg-gray-100">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4">
        {/* The one place the name is drawn on a page now that the home
            page's heading says what he does instead — so it comes from
            profile.js rather than being typed here, and there is one
            definition of it rather than a copy per component. */}
        <Link to="/" className="text-xl font-bold" onClick={closeMenu}>
          {profile.name}
        </Link>

        <nav aria-label="Site" className="hidden items-center gap-4 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className={`flex items-center gap-2 border border-gray-400 bg-white px-3 py-1 text-sm hover:bg-gray-200 active:scale-95 md:hidden ${PRESS}`}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Opens and shuts rather than appearing and vanishing, by the same
          0fr → 1fr row as the now-playing drawer — this is a phone's whole
          navigation dropping into the page, and it arriving in one frame is
          what makes a menu feel like a page change rather than a panel.

          Always in the markup now, which it has to be for the closing half to
          animate at all: five links is nothing to carry, unlike the drawer's
          picture. `inert` while shut, so those five are not five tab stops in
          front of the content on a wide screen — where this is display:none
          anyway — or on a narrow one where they cannot be seen. */}
      <nav
        id="site-menu"
        aria-label="Site"
        inert={!menuOpen}
        className={`grid overflow-hidden transition-[grid-template-rows] md:hidden ${SLIDE} ${
          menuOpen ? 'grid-rows-[1fr] border-t border-gray-300' : 'grid-rows-[0fr]'
        }`}
      >
        {/* min-h-0 or a grid item refuses to be shorter than its contents, and
            the row never reaches nothing; the padding goes on the layer inside
            it, which would otherwise be 32px of menu left showing while shut. */}
        <div className="min-h-0 overflow-hidden">
          <div className="mx-auto flex max-w-2xl flex-col items-start gap-3 px-4 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={navLinkClass}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Header
