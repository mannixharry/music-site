// Turns a musical's artwork into the files the site actually serves.
//
//   node scripts/make-hero-images.mjs pigs=~/art/pigs.png "guyana-skies=~/art/gs.png"
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
const outDir = path.join(root, 'src/images/heroes')

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('usage: node scripts/make-hero-images.mjs <slug>=<path-to-image> ...')
  process.exit(1)
}

const jobs = args.map((arg) => {
  const at = arg.indexOf('=')
  if (at === -1) throw new Error(`expected <slug>=<path>, got "${arg}"`)

  const slug = arg.slice(0, at)
  // `~` is the shell's, not Node's, and an unexpanded one here is a path that
  // does not exist rather than an error anyone can read.
  const file = arg.slice(at + 1).replace(/^~(?=\/)/, homedir())
  if (!existsSync(file)) throw new Error(`no such file: ${file}`)

  return { slug, file }
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

for (const { slug, file } of jobs) {
  const source = `data:image/png;base64,${readFileSync(file).toString('base64')}`

  const results = await page.evaluate(
    async ({ source, widths, quality }) => {
      const bitmap = await createImageBitmap(
        await (await fetch(source)).blob(),
      )

      const out = []
      for (const want of widths) {
        // Never upscale.
        const width = Math.min(want, bitmap.width)
        const height = Math.round((width / bitmap.width) * bitmap.height)

        const canvas = new OffscreenCanvas(width, height)
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(bitmap, 0, 0, width, height)

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

      bitmap.close()
      return { intrinsic: { width: bitmap.width, height: bitmap.height }, out }
    },
    { source, widths: WIDTHS, quality: QUALITY },
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
console.log(`\nWrote ${jobs.length * WIDTHS.length * 2} files to src/images/heroes/`)
