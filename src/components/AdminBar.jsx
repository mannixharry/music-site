import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SIGN_OUT_URL, forgetAdminSession, hasAdminSession } from '../adminHint'

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
  const [signedIn] = useState(hasAdminSession)
  if (!signedIn) return null

  return (
    <div className="border-b border-gray-300 bg-gray-200">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-1.5 text-xs">
        <span className="text-gray-600">You are signed in as the site owner.</span>

        <span className="flex shrink-0 items-center gap-3">
          <Link to="/admin" className="font-bold underline">
            Back to admin
          </Link>
          <a href={SIGN_OUT_URL} onClick={forgetAdminSession} className="underline">
            Sign out
          </a>
        </span>
      </div>
    </div>
  )
}

export default AdminBar
