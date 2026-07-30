import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { hasAdminSession } from '../adminHint'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/songs', label: 'Songs' },
  { to: '/musicals', label: 'Musicals' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

const navLinkClass = ({ isActive }) => (isActive ? 'underline' : '')

// Deliberately not styled like the nav items beside it: it goes somewhere no
// visitor can follow, and reading as a sixth page would be a small lie.
const adminLinkClass = 'border border-gray-400 bg-white px-2 py-0.5 text-sm'

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  // Read once, at mount. The admin page writes the hint before Frank can click
  // through to the site, and the site does not mount this component until he
  // does — so there is nothing to subscribe to. It is only a shortcut back:
  // Access still decides who may open /admin.
  const [showAdminLink] = useState(hasAdminSession)

  return (
    <header className="border-b border-gray-300 bg-gray-100">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-bold" onClick={closeMenu}>
          Frank Kirwan
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
          {showAdminLink && (
            <Link to="/admin" className={adminLinkClass}>
              Back to admin
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="border border-gray-400 px-3 py-1 text-sm md:hidden"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>
      </div>

      {menuOpen && (
        <nav className="mx-auto flex max-w-2xl flex-col gap-2 border-t border-gray-300 px-4 py-3 md:hidden">
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
          {showAdminLink && (
            <Link to="/admin" className={`self-start ${adminLinkClass}`} onClick={closeMenu}>
              Back to admin
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}

export default Header
