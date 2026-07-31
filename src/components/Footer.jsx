import { NavLink } from 'react-router-dom'
import { contact, instagramUrl, mailtoUrl } from '../content/contact'
import { navItems } from '../nav'
import { COLUMN } from '../rules'

// The bottom of a long page is the other place you want the site's index, and
// the header is a scroll away even sticky — on a phone it is behind a tap.
function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-300 bg-gray-100">
      <div
        className={`mx-auto flex max-w-2xl flex-col gap-8 py-8 text-sm sm:flex-row sm:justify-between ${COLUMN}`}
      >
        <div>
          <p className="font-bold">Frank Kirwan</p>
          <p className="mt-1">
            <a href={mailtoUrl} className="inline-block py-1 -my-1 underline">
              {contact.email}
            </a>
          </p>
          <p>
            <a
              href={instagramUrl}
              className="inline-block py-1 -my-1 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              @{contact.instagramHandle}
            </a>
          </p>
          <p className="mt-3 text-gray-600">&copy; {new Date().getFullYear()} Frank Kirwan</p>
        </div>

        {/* A different label from the header's, so a screen reader listing the
            page's landmarks names two things rather than "Site" twice. */}
        <nav aria-label="Footer">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  // Marked the same way the header marks it. An accent that
                  // means "the page you are on" in one nav and nothing in the
                  // other means less than no accent at all.
                  // See NAV_TARGET in Header.jsx for the padding: a big
                  // enough tap target, taken back out of the layout.
                  className={({ isActive }) =>
                    `inline-block py-1 -my-1 underline${isActive ? ' font-bold text-accent' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
