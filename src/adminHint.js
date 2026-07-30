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

// Called by the admin page once the API has confirmed a session, with the
// address Access authenticated. That is the only writer: this has to mean "this
// tab really was signed in", not "this tab once visited a URL".
//
// The address is stored rather than re-fetched so the site can name who is
// signed in without asking the Worker — the whole point of the hint. It is the
// reader's own email, in their own tab, and grants nothing.
export function rememberAdminSession(email) {
  try {
    sessionStorage.setItem(KEY, email ?? '')
  } catch {
    // Private browsing, or storage switched off. A missing shortcut is the
    // right way for this to fail — /admin is still one URL away.
  }
}

// Cloudflare Access's own logout endpoint, on this domain. Hitting it revokes
// the session across every Access application in the organisation and clears
// the cookie within half a minute. There is no redirect parameter, so the
// browser lands on Cloudflare's own "you have been logged out" page rather than
// back here — which is at least unambiguous about what just happened.
//
// It never reaches this Worker: Cloudflare answers /cdn-cgi/ itself, in front
// of everything. Which also means it does not exist in local development, where
// there is no Access to log out of.
export const SIGN_OUT_URL = '/cdn-cgi/access/logout'

// Paired with the link above rather than folded into it, so signing out is a
// real anchor — the hint goes on the way past, and the browser does the rest.
export function forgetAdminSession() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Same as above: a hint that cannot be cleared is a stale shortcut to a
    // login page, not a leak.
  }
}

function stored() {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function hasAdminSession() {
  return stored() !== null
}

// Null when there is no session, and also when the stored value predates this
// carrying an address at all — a tab left open across that deploy holds the old
// marker, and "signed in as 1" is worse than not saying.
export function adminSessionEmail() {
  const value = stored()
  return value?.includes('@') ? value : null
}
