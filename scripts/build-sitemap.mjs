// Writes public/sitemap.xml from the pages the router actually has.
//
// It reads nothing and computes nothing now that songs no longer have addresses
// of their own: five pages, written from one list. It stays a script rather than
// going back to a hand-written file so that the sitemap is still regenerated on
// every build and cannot drift from a stale copy in the repo.
//
// Runs from `prebuild`.
import { writeFile } from 'node:fs/promises'

const ORIGIN = 'https://frankkirwan.com'
const PAGES = ['/', '/songs', '/musicals', '/about', '/contact']

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Written by scripts/build-sitemap.mjs. Do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((path) => `  <url><loc>${ORIGIN}${path}</loc></url>`).join('\n')}
</urlset>
`

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml)
console.log(`Wrote sitemap with ${PAGES.length} URLs`)
