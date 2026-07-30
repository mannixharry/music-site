// Screenshot the site, so a change to how it looks can be checked rather than
// assumed.
//
//   npm run shot                          the live site, every page
//   npm run shot -- --base http://localhost:5173
//   npm run shot -- /songs /musicals      just these
//   npm run shot -- --playing             press play first (see below)
//
// Writes PNGs to shots/, which is not committed. Each page is shot twice, at a
// desktop and a phone width, because this site has two layouts and only one of
// them is visible at a time.
//
// A caveat for --base: `vite preview` inherits server.proxy, so /api goes to a
// `wrangler dev` if one is running, and the pages then show the local emulated
// D1 and R2 — different songs, different files, different durations from the
// real ones. That is right for checking a layout and misleading for checking
// content. The live site is the default base for exactly that reason.
//
// --playing exists because the now-playing strip is not on any page until
// something is playing: it is rendered by the provider once a track is chosen,
// so no amount of loading /songs will show it. This presses the first play
// button, scrolls until the sticky header is over content, and shoots the
// viewport rather than the full page — the pinned region is the point.
//
// Needs a Chromium, which is not a dependency of the site itself:
//
//   npx playwright install chromium
//
// or point CHROME_PATH at one you already have.
import { chromium } from 'playwright-core'
import { mkdirSync, readdirSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_BASE = 'https://frankkirwan.com'
const DEFAULT_PATHS = ['/', '/songs', '/musicals', '/about', '/contact']

// Two widths, not a sweep: the layout has one breakpoint that matters, and a
// shot either side of it says everything a dozen would. deviceScaleFactor 2
// because text at 1x is too soft to judge kerning or weight from.
const VIEWPORTS = [
  { label: 'desktop', viewport: { width: 1280, height: 800 } },
  { label: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]

// Playwright keeps its browsers outside the project, one directory per build.
// Take the highest build rather than the first listed, so an old one left
// behind by a previous install is not preferred over the current one.
function findChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH

  const roots = [
    join(homedir(), '.cache/ms-playwright'), // Linux
    join(homedir(), 'Library/Caches/ms-playwright'), // macOS
    join(homedir(), 'AppData/Local/ms-playwright'), // Windows
  ]

  for (const root of roots) {
    if (!existsSync(root)) continue

    const builds = readdirSync(root)
      .filter((name) => /^chromium-\d+$/.test(name))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))

    for (const build of builds) {
      for (const suffix of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
        const candidate = join(root, build, suffix)
        if (existsSync(candidate)) return candidate
      }
    }
  }

  throw new Error('No Chromium found. Run `npx playwright install chromium`, or set CHROME_PATH.')
}

const args = process.argv.slice(2)
const playing = args.includes('--playing')
const baseIndex = args.indexOf('--base')
const base = baseIndex === -1 ? DEFAULT_BASE : args[baseIndex + 1]
const paths = args.filter((arg, i) => arg.startsWith('/') && i !== baseIndex + 1)

const out = new URL('../shots/', import.meta.url).pathname
mkdirSync(out, { recursive: true })

// A path makes a readable filename once its slashes are gone; "/" has none of
// it left, so it gets the name it goes by.
const nameOf = (path) => path.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home'

const browser = await chromium.launch({ executablePath: findChromium() })

for (const { label, ...contextOptions } of VIEWPORTS) {
  const context = await browser.newContext({ deviceScaleFactor: 2, ...contextOptions })
  const page = await context.newPage()

  for (const path of paths.length > 0 ? paths : DEFAULT_PATHS) {
    const url = new URL(path, base).href
    await page.goto(url, { waitUntil: 'domcontentloaded' })

    // Not networkidle: the router renders client-side, so the useful signal is
    // that React has mounted — and a page holding an <audio> element never
    // goes idle anyway, it just times out.
    await page.waitForSelector('main', { timeout: 15000 })
    await page.waitForTimeout(600)

    let file = join(out, `${nameOf(path)}-${label}.png`)

    if (playing) {
      const button = page.getByRole('button', { name: /^Play /i }).first()
      if ((await button.count()) === 0) continue

      await button.click()
      await page.waitForSelector('[aria-label="Now playing"]', { timeout: 10000 })
      await page.waitForTimeout(2000)
      // Far enough that the sticky region is over content rather than over the
      // top of the page, which is what it has to look right against.
      await page.evaluate(() => window.scrollTo(0, 900))
      await page.waitForTimeout(400)

      file = join(out, `${nameOf(path)}-${label}-playing.png`)
    }

    await page.screenshot({ path: file, fullPage: !playing })
    console.log(`${label.padEnd(7)} ${url} -> ${file}`)
  }

  await context.close()
}

await browser.close()
