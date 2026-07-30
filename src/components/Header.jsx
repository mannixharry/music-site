import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { navItems } from '../nav'

// The active page gets weight as well as an underline. On a phone the menu is a
// plain column of five links, and an underline on its own is easy to miss.
const navLinkClass = ({ isActive }) =>
  isActive ? 'font-bold underline underline-offset-4' : 'hover:underline hover:underline-offset-4'

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
  const closeMenu = () => setMenuOpen(false)
  const { key } = useLocation()

  // Every link in the menu closes it on the way out, but the back button does
  // not go through one — and a menu still covering the page you have just
  // returned to looks like the site has locked up.
  useEffect(() => setMenuOpen(false), [key])

  return (
    // Sticky, because the pages this now has to serve are long: /songs runs to
    // a few dozen entries and each musical carries a synopsis. Reaching another
    // page used to mean scrolling back to the top first.
    <header className="sticky top-0 z-20 border-b border-gray-300 bg-gray-100">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="text-xl font-bold" onClick={closeMenu}>
          Frank Kirwan
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
          className="flex items-center gap-2 border border-gray-400 bg-white px-3 py-1 text-sm md:hidden"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="site-menu"
          aria-label="Site"
          className="mx-auto flex max-w-2xl flex-col items-start gap-3 border-t border-gray-300 px-4 py-4 md:hidden"
        >
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
        </nav>
      )}
    </header>
  )
}

export default Header
