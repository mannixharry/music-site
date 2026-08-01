// Turns a musical's artwork into the files the site actually serves.
//
//   node scripts/make-hero-images.mjs pigs=~/art/pigs.png "guyana-skies=~/art/gs.png"
//   node scripts/make-hero-images.mjs --out=pages "about-now=~/photos/now.jpg"
//   node scripts/make-hero-images.mjs --out=pages "about-then=~/photos/then.jpg@56,46,1184,1144"
//
// The optional `@x,y,w,h` after a path crops in source pixels before resizing.
//
// The name before the `=` is the musical's slug, and it becomes the filename,
// so the import in MusicalSection does not have to be renamed when artwork is
// replaced. Writes WebP and JPEG at two widths into src/images/heroes/.
//
// Why a script rather than doing it once by hand: this produces four files per
// show from one source, and four files that appear in a repo with no record of
// where they came from are four files nobody dares regenerate. The photographs
// still to come on About and Contact want the same treatment.
//
// It resizes in headless Chromium, through canvas, which is the same thing
// src/admin/cover.js does in Frank's browser — no ImageMagick, no sharp, and
// no new dependency, because playwright-core is already here for the
// screenshots. The cost is that canvas cannot encode AVIF, so unlike the
// portrait these are WebP and JPEG only. WebP covers everything still in use
// and JPEG is the floor.
//
// The originals are not committed. They are a few megabytes each of artwork
// that the site never sends anyone, and the derived files below are what it
// serves; if a hero needs regenerating at a new size, the artwork comes back
// from Frank and this runs again.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import path from 'node:path'

// The content column is max-w-2xl — 672px — so that is the 1× width and 1344
// is what a 2× screen wants. Both are downscales from the artwork supplied so
// far, and this never upscales: a source narrower than a target is written at
// its own width, because inventing pixels only makes the file bigger.
const WIDTHS = [672, 1344]

const QUALITY = { webp: 0.86, jpeg: 0.86 }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error(
    'usage: node scripts/make-hero-images.mjs [--out=<dir under src/images>] <slug>=<path-to-image> ...',
  )
  process.exit(1)
}

// `--out` is what lets the About and Contact photographs through here rather
// than growing a second copy of this: same two widths, same two formats, same
// reason for both. It is relative to src/images so a caller cannot aim the
// output at somewhere Vite will not hash.
const outArg = args.find((arg) => arg.startsWith('--out='))
const outDir = path.join(root, 'src/images', outArg ? outArg.slice('--out='.length) : 'heroes')

const jobs = args.filter((arg) => !arg.startsWith('--')).map((arg) => {
  const at = arg.indexOf('=')
  if (at === -1) throw new Error(`expected <slug>=<path>, got "${arg}"`)

  const slug = arg.slice(0, at)
  // An optional `@x,y,w,h` in source pixels, for a photograph that arrives with
  // something around it — a scanned print keeps the paper border it was cut
  // with. Written here rather than cropped once in an image editor because the
  // originals are not committed: the command is the only record of how a file
  // in src/images came to look the way it does, so the crop belongs in it.
  const spec = arg.slice(at + 1)
  const cropAt = spec.lastIndexOf('@')
  const cropText = cropAt === -1 ? null : spec.slice(cropAt + 1)
  const crop = cropText?.match(/^\d+,\d+,\d+,\d+$/)
    ? Object.fromEntries(
        ['x', 'y', 'width', 'height'].map((k, i) => [k, Number(cropText.split(',')[i])]),
      )
    : null
  if (cropText && !crop) throw new Error(`expected @x,y,w,h, got "@${cropText}"`)

  // `~` is the shell's, not Node's, and an unexpanded one here is a path that
  // does not exist rather than an error anyone can read.
  const file = (crop ? spec.slice(0, cropAt) : spec).replace(/^~(?=\/)/, homedir())
  if (!existsSync(file)) throw new Error(`no such file: ${file}`)

  return { slug, file, crop }
})

function findChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH

  const cache = path.join(homedir(), '.cache/ms-playwright')
  const builds = readdirSync(cache)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))

  for (const build of builds) {
    for (const suffix of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const candidate = path.join(cache, build, suffix)
      if (existsSync(candidate)) return candidate
    }
  }

  throw new Error('No Chromium found. Run `npx playwright install chromium`, or set CHROME_PATH.')
}

mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ executablePath: findChromium() })
const page = await browser.newPage()

for (const { slug, file, crop } of jobs) {
  const source = `data:image/png;base64,${readFileSync(file).toString('base64')}`

  const results = await page.evaluate(
    async ({ source, widths, quality, crop }) => {
      const bitmap = await createImageBitmap(
        await (await fetch(source)).blob(),
      )

      // Everything below measures the picture being kept, not the file it came
      // out of, so a crop narrows what "never upscale" is allowed to reach.
      const src = crop ?? { x: 0, y: 0, width: bitmap.width, height: bitmap.height }

      const out = []
      for (const want of widths) {
        // Never upscale.
        const width = Math.min(want, src.width)
        const height = Math.round((width / src.width) * src.height)

        const canvas = new OffscreenCanvas(width, height)
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(bitmap, src.x, src.y, src.width, src.height, 0, 0, width, height)

        for (const [type, ext] of [
          ['image/webp', 'webp'],
          ['image/jpeg', 'jpg'],
        ]) {
          const blob = await canvas.convertToBlob({ type, quality: quality[ext === 'jpg' ? 'jpeg' : 'webp'] })
          const buffer = await blob.arrayBuffer()
          out.push({
            ext,
            width,
            height,
            // Handed back as a plain array; page.evaluate cannot return a Blob.
            bytes: [...new Uint8Array(buffer)],
          })
        }
      }

      // Read before closing: a closed bitmap reports zero for both.
      const intrinsic = { width: src.width, height: src.height }
      bitmap.close()
      return { intrinsic, out }
    },
    { source, widths: WIDTHS, quality: QUALITY, crop },
  )

  for (const { ext, width, height, bytes } of results.out) {
    const name = `${slug}-${width}.${ext}`
    writeFileSync(path.join(outDir, name), Buffer.from(bytes))
    console.log(
      `  ${name.padEnd(28)} ${String(width).padStart(4)}×${String(height).padEnd(4)} ` +
        `${(bytes.length / 1024).toFixed(0).padStart(4)} kB`,
    )
  }
}

await browser.close()
console.log(`\nWrote ${jobs.length * WIDTHS.length * 2} files to ${path.relative(root, outDir)}/`)
