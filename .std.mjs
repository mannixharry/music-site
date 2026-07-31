import { chromium } from 'playwright-core'
const label = process.argv[2]
const browser = await chromium.launch({ executablePath: '/home/mannix/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome' })
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:4173/', { waitUntil: 'load' })
await page.waitForSelector('main')
await page.waitForTimeout(400)
const m = await page.evaluate(() => {
  const p = document.querySelector('main section:nth-of-type(2) p')
  const cs = getComputedStyle(p)
  const chars = p.innerText.length
  const lines = Math.round(p.getBoundingClientRect().height / parseFloat(cs.lineHeight))
  return { size: cs.fontSize, leading: cs.lineHeight, lines, measure: Math.round(chars / lines) }
})
console.log(`${label}: ${m.size} / ${m.leading}, ${m.lines} lines, ~${m.measure} characters a line`)
await page.evaluate(() => window.scrollTo(0, 330))
await page.waitForTimeout(250)
await page.screenshot({ path: `shots/standfirst-${label}.png`, clip: { x: 0, y: 0, width: 900, height: 470 } })
await browser.close()
