import { useCallback, useEffect, useRef } from 'react'
// Supplied by the build-stamp plugin in vite.config.js — the id of the build
// this code was compiled into.
import { BUILD_ID } from 'virtual:build-id'
import { usePlayback } from '../context/playbackContext'

// Notices that the page being looked at is older than the one that is deployed,
// and replaces it.
//
// Everything about this site's caching is correct — index.html is served
// `max-age=0, must-revalidate`, and every asset it names carries a content hash
// — and none of that helps once a browser has a copy of index.html it has
// decided not to ask about again. That is not hypothetical: it is the reported
// bug. A phone that saw the site weeks ago kept showing that version through
// reloads, because a reload re-runs the page it has, and the page it has names
// the old bundle, which is `immutable` and therefore correct to keep forever.
// Nothing in the app could tell, because everything the app could see was
// internally consistent — it was a complete, coherent, old site.
//
// So the check has to come from outside that closed loop, which is what
// /build.json is: a file the same build emitted, fetched with `no-store` so no
// cache anywhere may answer for it. If what comes back is not the id compiled
// into this bundle, this page is stale, full stop.
//
// It is a static asset, so Cloudflare answers it without waking the Worker —
// free, and outside the request quota, which is the same reason the rest of the
// site is served the way it is.
//
// Mounted in Layout, so it covers the site and not /admin, which is outside it.
// That is the right side of the line: reloading the admin would be reloading it
// out from under an upload.

const ATTEMPTS_KEY = 'build-reload'
// The query the last resort adds. Only ever added by this file, and stripped on
// arrival, so it never ends up in anything anyone copies out of the address bar.
const BUST = 'v'

// How hard to try, in order. A plain reload is enough for a browser that merely
// held a stale copy: reloading revalidates the document. The second is for one
// that will not be talked out of its copy at all — an address it has never seen
// has nothing to serve from cache, so it must be fetched.
//
// Then it stops. A page that reloads itself forever is a worse failure than a
// stale one, and if two attempts have not fixed it the fault is not something
// another reload will reach.
const MAX_ATTEMPTS = 2

function attempts() {
  try {
    return Number(sessionStorage.getItem(ATTEMPTS_KEY)) || 0
  } catch {
    // No storage means no loop guard, and without a guard a reload is not safe
    // to attempt at all. Reported as exhausted, so nothing is tried.
    return MAX_ATTEMPTS
  }
}

function recordAttempt(n) {
  try {
    sessionStorage.setItem(ATTEMPTS_KEY, String(n))
    return true
  } catch {
    return false
  }
}

function clearAttempts() {
  try {
    sessionStorage.removeItem(ATTEMPTS_KEY)
  } catch {
    // Nothing to clear if it could never be set.
  }
}

// Takes the cache-buster back out of the address once it has done its job, so
// what someone sees and shares is the address they asked for. replaceState
// rather than a navigation: this must not add a history entry, and must not
// cause another load.
function tidyUrl() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(BUST)) return

  url.searchParams.delete(BUST)
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
}

function FreshBuild() {
  // Reloading out from under someone mid-song is worse than showing them last
  // month's copy for another few minutes. The check runs again when playback
  // stops, so nothing is lost by waiting — it is deferred, not skipped.
  const { playing } = usePlayback()

  // One flight at a time. The effect re-runs on every visibility change, and a
  // phone woken up fires more than one of those in a row.
  const inFlight = useRef(false)
  // Set once a reload has been asked for. Navigation is not instant, and a
  // second check landing in that gap would spend the next attempt on the same
  // staleness this one is already fixing.
  const leaving = useRef(false)

  const check = useCallback(async () => {
    if (inFlight.current || leaving.current) return
    inFlight.current = true

    try {
      const response = await fetch('/build.json', { cache: 'no-store' })
      if (!response.ok) return

      const { build } = await response.json()
      if (!build) return

      if (build === BUILD_ID) {
        // Up to date. Clear the counter so a future deploy gets its own two
        // attempts rather than inheriting the ones this visit spent.
        clearAttempts()
        tidyUrl()
        return
      }

      const spent = attempts()
      if (spent >= MAX_ATTEMPTS) return
      if (!recordAttempt(spent + 1)) return

      leaving.current = true
      if (spent === 0) {
        window.location.reload()
        return
      }

      const url = new URL(window.location.href)
      url.searchParams.set(BUST, build)
      window.location.replace(url)
    } catch {
      // Offline, or something between here and Cloudflare. Not being able to
      // ask is not the same as being told the answer, so nothing happens —
      // failing closed here means leaving the page alone.
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (playing) return

    check()

    // A phone keeps a tab for weeks and shows it again without loading
    // anything, which is exactly the visit this is for. `pageshow` covers a
    // restore from the back/forward cache, where no script re-runs at all.
    const recheck = () => {
      if (document.visibilityState === 'visible') check()
    }

    document.addEventListener('visibilitychange', recheck)
    window.addEventListener('pageshow', recheck)

    return () => {
      document.removeEventListener('visibilitychange', recheck)
      window.removeEventListener('pageshow', recheck)
    }
  }, [check, playing])

  return null
}

export default FreshBuild
