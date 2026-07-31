import { useEffect } from 'react'

const SITE = 'Frank Kirwan'

// Names the page in the browser tab, the history menu and any bookmark.
//
// Every page was called "Frank Kirwan", because that is what index.html says and
// nothing had ever changed it: a client-side router swaps the content without
// loading a document, so the title from the first page you landed on stayed put
// for the whole visit. Five open tabs were five identical labels, and a bookmark
// of the musicals recorded nothing about which page it was.
//
// The name of the site goes last. A tab strip crops from the right, so the part
// that distinguishes one tab from another has to be the part that survives.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE}` : SITE
  }, [title])
}
