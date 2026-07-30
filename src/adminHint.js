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

// Signing out, then coming back here rather than stopping on Cloudflare's own
// "you have been logged out" page. That page takes no redirect parameter, so
// the way home is to ask for the logout ourselves and then navigate.
//
// `redirect: 'manual'` is the whole trick, and its absence is what made the
// first attempt at this look like it did nothing. With a live session the
// endpoint answers with a redirect to <team>.cloudflareaccess.com, to end the
// session across the organisation — and a fetch that follows a redirect to
// another origin is killed by CORS. That threw, the catch navigated to the
// logout URL as a fallback, and you landed on the very page this exists to
// avoid, now reporting no cookie because the fetch had already cleared it.
// Manual redirect means the browser stops at the first response, which is the
// one carrying the Set-Cookie that matters.
//
// Then it checks, rather than assuming. An admin route still answering means
// the cookie survived, and quietly going home would leave you signed in while
// the site said otherwise — so that case falls back to the plain logout, which
// is unlovely and definitely works.
export async function signOut(event) {
  event.preventDefault()
  forgetAdminSession()

  try {
    await fetch(SIGN_OUT_URL, { credentials: 'include', cache: 'no-store', redirect: 'manual' })

    // Unauthenticated, this is answered by Access with a redirect to its login
    // page — which `manual` turns into an opaque response, so `ok` is false.
    // Still ok means the session outlived the logout.
    const stillIn = await fetch('/api/admin/session', { cache: 'no-store', redirect: 'manual' })
    if (stillIn.ok) {
      window.location.assign(SIGN_OUT_URL)
      return
    }
  } catch {
    // Offline, or something else between here and Cloudflare. Signing out for
    // real matters more than where it leaves you.
    window.location.assign(SIGN_OUT_URL)
    return
  }

  window.location.assign('/')
}

// Signing in again, which only a navigation can do: Access answers a page
// request with a 302 to its login screen, and a fetch cannot follow that across
// origins. reload() rather than assign(), so this cannot be satisfied out of
// the back/forward cache — the point is to reach Cloudflare.
//
// The marker is what stops it looping. If the refusal outlives the round trip
// — Access content, this site not — a second bounce would land in exactly the
// same place, and a page that reloads itself forever is worse than one that
// explains itself. So it is attempted once per tab, and after that the page
// says what is wrong instead.
const REAUTH_KEY = 'admin-reauth'

export function signInAgain() {
  try {
    sessionStorage.setItem(REAUTH_KEY, '1')
  } catch {
    // Storage unavailable. Losing the guard risks a loop, so do not navigate;
    // the caller shows its message instead.
    return
  }
  window.location.reload()
}

export function reauthAlreadyTried() {
  try {
    return sessionStorage.getItem(REAUTH_KEY) !== null
  } catch {
    return true
  }
}

// Called once a session has actually loaded, so the next lapse is allowed its
// own attempt rather than being refused by a marker left over from this one.
export function clearReauthAttempt() {
  try {
    sessionStorage.removeItem(REAUTH_KEY)
  } catch {
    // Nothing to clear if it could not be set.
  }
}

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
