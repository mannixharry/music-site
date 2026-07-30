import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { hasAdminSession } from '../adminHint'
import { useContent } from '../context/contentContext'

// Re-reads the catalogue when Frank moves around the site.
//
// ContentProvider sits above the router and fetches once, which is right for a
// visitor: the catalogue cannot change under them. It is wrong for the person
// who has just edited it. Going from /admin to the site is a client-side
// navigation — no new document, no new provider, no new fetch — so the site
// showed the catalogue as it stood when the admin page was first opened, and
// only a reload got past it. That is the "takes a few reloads" this fixes.
//
// Gated on the admin hint so a visitor still costs exactly one request for the
// whole session. The hint grants nothing and proves nothing (see adminHint.js);
// being wrong about it costs one extra fetch of a public, edge-cached endpoint,
// which is why it is safe to decide anything on.
//
// Renders nothing; it exists for the effect.
function RefreshOnNavigate() {
  // `key` rather than `pathname`, so returning to the page you were already on
  // still counts. It changes on every navigation.
  const { key } = useLocation()
  const { refresh } = useContent()

  useEffect(() => {
    if (hasAdminSession()) refresh()
  }, [key, refresh])

  return null
}

export default RefreshOnNavigate
