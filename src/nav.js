// The site's five pages, in the order they are offered. Shared by the header
// and the footer so the two can never disagree about what the site contains,
// which is the way a stray page normally goes missing from one of them.
//
// Not in src/content/: this is the shape of the site rather than words about
// Frank, and adding a route means editing App.jsx as well.
export const navItems = [
  { to: '/', label: 'Home' },
  { to: '/songs', label: 'Songs' },
  { to: '/musicals', label: 'Musicals' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]
