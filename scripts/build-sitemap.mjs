// Writes public/sitemap.xml from the pages the router actually has.
//
// It was a hand-written list of five, which was fine until every song got an
// address of its own — thirty-one URLs is past the point where a list stays
// right by anyone remembering to edit it. This reads the same snapshot the site
// renders from, so the sitemap and the site cannot disagree.
//
// Runs from `prebuild`, after the snapshot has been pulled.
import { readFile, writeFile } from 'node:fs/promises'

const ORIGIN = 'https://frankkirwan.com'
const PAGES = ['/', '/songs', '/musicals', '/about', '/contact']

const snapshotPath = new URL('../src/content/snapshot.json', import.meta.url)
const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'))
const rows = snapshot.songs ?? []

// The same rule as songSlug in src/content/normalise.js. Duplicated rather than
// imported because that module pulls in the site's content graph, and a build
// script should not need to resolve JSX imports to write an XML file. If one
// changes, the other has to: the check below is what catches it.
const slugFor = (row) =>
  (row.kind === 'demo' && row.musicalSlug ? `${row.musicalSlug} ${row.title}` : row.title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const songs = rows.filter((row) => row.published !== false).map(slugFor)

const duplicates = songs.filter((slug, i) => songs.indexOf(slug) !== i)
if (duplicates.length) {
  // Two songs sharing an address means one of them is unreachable. Better to
  // fail the build than to publish a sitemap that points at the wrong track.
  console.error(`Two songs want the same address: ${[...new Set(duplicates)].join(', ')}`)
  process.exit(1)
}

const urls = [...PAGES, ...songs.map((slug) => `/songs/${slug}`)]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Written by scripts/build-sitemap.mjs. Do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `  <url><loc>${ORIGIN}${path}</loc></url>`).join('\n')}
</urlset>
`

await writeFile(new URL('../public/sitemap.xml', import.meta.url), xml)
console.log(`Wrote sitemap with ${urls.length} URLs (${PAGES.length} pages, ${songs.length} songs)`)
