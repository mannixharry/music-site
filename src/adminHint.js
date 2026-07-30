// Whether the site should offer a way back to /admin.
//
// This is a NAVIGATION HINT, and the distinction from an authentication signal
// is the whole design. Cloudflare Access authenticates /admin at the edge and
// nothing here touches that: the flag carries no identity, grants nothing, and
// the link it reveals still lands on Access's login page for anyone who is not
// already signed in. Setting it by hand in devtools wins the right to see a
// link that bounces you. Do not grow it into anything that decides access —
// see "Admin authentication" in CLAUDE.md.
//
// Asking the server would be the obvious alternative, and is the reason this
// exists instead: /api/admin/session answers the question exactly, but a visitor
// loading a page currently never wakes the Worker at all. Probing on every visit
// would spend that on a link only Frank can use.
//
// sessionStorage rather than localStorage, so the hint lives and dies with the
// tab that earned it. It is written only when /admin has actually loaded a
// session, so a visitor who has never been there has nothing to show.

const KEY = 'admin-session'

// Called by the admin page once the API has confirmed a session. That is the
// only writer: the flag has to mean "this tab really was signed in", not "this
// tab once visited a URL".
export function rememberAdminSession() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // Private browsing, or storage switched off. A missing shortcut is the
    // right way for this to fail — /admin is still one URL away.
  }
}

export function hasAdminSession() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
