// Measures the downloadable files and writes their sizes into the bundle, so a
// download link can say how big it is before anyone taps it.
//
// Done at build time rather than written into the content by hand, because a
// number typed next to a file is a number that goes wrong the first time the
// file is replaced and nobody remembers to edit it. Done at build time rather
// than at run time, because the alternative is a HEAD request per link on a
// page that has five of them, to display four kilobytes of text.
//
// Runs from `prebuild`, beside the snapshot pull.
import { readdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOTS = ['scripts', 'scores']
// fileURLToPath rather than URL#pathname: a pathname is percent-encoded, so a
// checkout under a directory with a space in its name resolved to "%20" and
// every readdir below failed — silently, because a missing directory is a
// legitimate state here and is caught and skipped.
const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url))
const OUT = fileURLToPath(new URL('../src/content/downloadSizes.json', import.meta.url))

const sizes = {}

for (const root of ROOTS) {
  let names = []
  try {
    names = await readdir(join(PUBLIC, root))
  } catch {
    // A directory that does not exist yet is not an error; it is a musical
    // whose score has not been added.
    continue
  }

  for (const name of names) {
    const info = await stat(join(PUBLIC, root, name))
    if (info.isFile()) sizes[`/${root}/${name}`] = info.size
  }
}

const ordered = Object.fromEntries(Object.entries(sizes).sort(([a], [b]) => a.localeCompare(b)))
await writeFile(OUT, `${JSON.stringify(ordered, null, 2)}\n`)

console.log(`Stamped ${Object.keys(ordered).length} download sizes into src/content/downloadSizes.json`)
