import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const navLinkClass = ({ isActive }) => (isActive ? 'underline' : '')

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="border-b border-gray-300 bg-gray-100">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-bold" onClick={() => setMenuOpen(false)}>
          Frank Kirwan
        </Link>

        <nav className="hidden gap-4 md:flex">
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/musicals" className={navLinkClass}>
            Musicals
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
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
          <NavLink to="/" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/musicals" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Musicals
          </NavLink>
          <NavLink to="/about" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            About
          </NavLink>
        </nav>
      )}
    </header>
  )
}

export default Header
