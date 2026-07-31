import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  SIGN_OUT_URL,
  adminSessionEmail,
  forgetAdminSession,
  signOut,
  hasAdminSession,
} from '../adminHint'

// Frank's own strip, above the site's own header and only ever visible to him.
//
// These two started out inside the nav and pushed it onto a second line: five
// pages, a wordmark and two admin controls do not fit across 42rem, and they
// were never really nav anyway — one leaves the site and the other ends the
// session. A separate strip says that, and gives the nav its single line back.
//
// Deliberately not sticky, unlike the header below it. It would add its height
// to everything the in-page anchors have to clear (see the scroll-mt note in
// CLAUDE.md), and it is not something you need while reading a page — only on
// the way in and the way out.
function AdminBar() {
  // Read once, at mount, exactly as the header used to: the admin page writes
  // the hint before you can click through, and this does not mount until you do.
  const [signedIn, setSignedIn] = useState(hasAdminSession)
  const [email] = useState(adminSessionEmail)

  // ...and then checked, because the hint outlives what it describes: it is
  // written when /admin loads and cleared on sign-out, neither of which happens
  // when an Access session simply lapses in an open tab.
  //
  // Only ever for someone the hint is already set for, so a visitor still costs
  // the Worker nothing. `manual` so the Access redirect is not chased across
  // origins into a CORS error, exactly as signOut does.
  useEffect(() => {
    if (!signedIn) return
    let cancelled = false

    fetch('/api/admin/session', { cache: 'no-store', redirect: 'manual' })
      .then((response) => {
        if (cancelled || response.ok) return
        forgetAdminSession()
        setSignedIn(false)
      })
      // Offline is not proof of anything. Leaving the strip alone is the
      // forgiving way to be wrong here: its links work or send you to a login.
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [signedIn])

  if (!signedIn) return null

  return (
    <div className="border-b border-gray-300 bg-gray-200">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-1.5 text-xs">
        {/* Named the same way the admin page names it, so it is obvious which
            account is being previewed from — and monospaced for the same reason
            it is there. */}
        <span className="min-w-0 truncate text-gray-600">
          Signed in{email ? ' as ' : ''}
          {email && <span className="font-mono">{email}</span>}
        </span>

        <span className="flex shrink-0 items-center gap-3">
          <Link to="/admin" className="font-bold underline">
            Back to admin
          </Link>
          <a href={SIGN_OUT_URL} onClick={signOut} className="underline">
            Sign out
          </a>
        </span>
      </div>
    </div>
  )
}

export default AdminBar
