// Typesets the Guyana Skies storyline into the PDF the site hands out.
//
//   node scripts/make-storyline-pdf.mjs
//
// Writes public/scripts/frank-kirwan-guyana-skies-storyline.pdf, then run
// `node scripts/stamp-download-sizes.mjs` so the tile says the new size.
//
// The prose is Frank's, converted from the docx he sent, and it lives in this
// file rather than in a docx nobody can find again: the first cut of this PDF
// was typeset by hand and the source thrown away, so re-setting it meant
// pulling the words back out of the PDF glyph by glyph. The document is three
// pages of prose that changes about as often as a musical does — the same
// argument that keeps the synopses in src/content/musicals.js.
//
// It is set to look like the other two scripts on the site, which are Frank's
// own Word documents printed to PDF: black ink, white paper, a serif face, a
// plain bold heading for each act and nothing else. An earlier version put it
// in the site's own palette — tinted paper, oxblood song titles, ruled cues, a
// running footer — and that was the thing to undo. A handout should look like
// the other handouts, not like the page it was downloaded from.
//
// The song cues are still pulled out of the prose rather than left as bold
// sentences inside it, because they are what a reader scans the document for —
// but they are one indented bold line each now, which is what that looks like
// in black and white.
//
// Set in Literata, the site's own face, because the alternative here is
// whatever this machine has: the first cut asked for Literata without
// embedding it and got DejaVu Serif, a screen face, in a document meant to sit
// beside two set in Georgia. The woff2 goes in as a data URI so the render
// does not depend on a font being installed, or on a network.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public/scripts/frank-kirwan-guyana-skies-storyline.pdf')

const doc = {
  title: 'Guyana Skies',
  subtitle: 'A sketch of a potential script',
  byline: 'By Frank Kirwan',
  acts: [
    {
      title: 'Act One',
      blocks: [
        'The show starts with the main character, provisionally named Patrick, who, as an old man now settled in London, drifts back, as he talks with his children about memories of his own childhood and early adulthood in Georgetown, Guyana. The chorus sung (with spoken words) “Guyana Skies” expresses his memories as he drifts into sleep.',
        { song: 1, title: 'Guyana Skies' },
        'We go back to Patrick’s childhood in Georgetown where a peaceful and friendly neighbourhood is interrupted by a major crime, a naughty boy (Patrick) stealing coconuts from the neighbour’s tree. Hence the song “Coconut Water”, sung by the neighbour, Patrick’s father and Patrick.',
        { song: 2, title: 'Coconut Water' },
        'Patrick grows up and has a great time in Georgetown, where, as Jazzy P, he plays his trumpet in a local band. He meets a girl called Shirley who he becomes attached to after getting a date with her after a dance after a bet with friends. She gets wind of the bet, but he wins her over with his song “Shirley”.',
        { song: 3, title: 'Shirley' },
        'Shirley joins Patrick’s band and they get on well together, eventually getting engaged, after much humorous discussion and the song “Tell me once”.',
        { song: 4, title: 'Tell me once' },
        'Meanwhile British Guyana, and Georgetown in particular, is gearing up for independence. Shirley sings the song “Independence”, which reflects the excitement and anticipation of a nation.',
        { song: 5, title: 'Independence' },
        'Post independence, with things not going so smoothly with him or his music, Patrick becomes restless. He decides to move to London where he hopes to get a good job and continue to work at nights as a trumpeter. He tells Shirley, and his friends. Carried away, he launches into the frenetic “Flying into London”.',
        { song: 6, title: 'Flying into London' },
        'A surfeit of rum finds him ill the next day. Shirley comes round to “soothe his fevered brow”, but drops the bombshell that for now she can’t go to London because of visa problems. Patrick has already made unbreakable arrangements, so Act One ends with the disappointing news that they will be on different sides of the world.',
      ],
    },
    {
      title: 'Act Two',
      blocks: [
        'Patrick has arrived in London and all is not what he expected. The “good job” he looked for doesn’t exist and he has to work in a factory for low wages, accommodation is a major problem and finding work with his trumpet proves impossible. With the cold weather and a people he doesn’t understand, he goes from his usual positivity and energy to an all-time low. Solitary, in his lodgings, he sings “What happened to my dream?”',
        { song: 1, title: 'What happened to my dream?' },
        'Patrick encounters racism and scorn and meets some unsavoury characters in a pub who provoke him by talking about the sort of work he is only fit for.',
        { song: 2, title: 'Make ’em work' },
        'After the song Patrick is involved in a fight with one of the racists. He is blamed for it and arrested. All looks bleak for him, as he’s charged and goes home with a record. An acquaintance from home comes round and tries to persuade him to make money via crime, as he’s already got a record. The dialogue continues in the next song.',
        { song: 3, title: 'Wrong time, wrong place' },
        'Patrick is about to give in to the temptation, as he sees no other way out, when, out of the blue, Shirley reappears, gives him a good dressing down and tells him they’re going to use her money to set up a hairdressing shop in Peckham. She persuades him to look forward to a life of hard work, but success in a new country.',
        { song: 4, title: 'Everyone has a hope' },
        'Patrick is now older, though not yet old, he has children and is very settled, and back to his old self. We meet him in the same pub where he had the fight and now he enjoys good natured banter with the locals about London weather and how much better Georgetown is than Peckham. He’s never returned to Georgetown as he says he wants to move forward in his life, not backwards, but he’s beginning to waver.',
        { song: 5, title: 'Peckham Calypso' },
        'Patrick awakes from his sleep to be surrounded by his family, who’ve got him tickets for a month’s stay back in Georgetown. Much rejoicing, and a reprise of the title song.',
        { song: 6, title: 'Guyana Skies' },
      ],
    },
  ],
}

function fontFace(file, style) {
  const data = readFileSync(path.join(root, 'src/fonts', file)).toString('base64')
  return `@font-face {
    font-family: 'Literata';
    font-style: ${style};
    font-weight: 400 700;
    src: url('data:font/woff2;base64,${data}') format('woff2');
  }`
}

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// A cue is one line — "Song 1 — Guyana Skies" — indented under the paragraph
// that leads into it. `break-inside: avoid` keeps a cue off the fold, which is
// the one thing in here worth spending a widow on.
const body = doc.acts
  .map(
    (act) => `<h2>${escape(act.title)}</h2>` +
      act.blocks
        .map((block) =>
          typeof block === 'string'
            ? `<p>${escape(block)}</p>`
            : `<p class="song">Song ${block.song} — ${escape(block.title)}</p>`,
        )
        .join(''),
  )
  .join('')

const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>${escape(doc.title)} — ${escape(doc.subtitle)}</title>
<style>
  ${fontFace('literata-normal-400700-latin.woff2', 'normal')}
  ${fontFace('literata-italic-400-latin.woff2', 'italic')}

  html { font-family: 'Literata', Georgia, serif; font-size: 11pt; color: #000; }
  body { margin: 0; line-height: 1.5; }
  h1, h2, p { margin: 0; }

  /* The title block is the shape both of the other scripts open with: the
     show, what it is, who wrote it. */
  header { margin-bottom: 1.6rem; }
  h1 { font-size: 1.9rem; line-height: 1.2; }
  header .subtitle { font-style: italic; margin-top: 0.35rem; }
  header .byline { margin-top: 0.15rem; }

  h2 { font-size: 1.15rem; margin: 1.9rem 0 0.8rem; break-after: avoid; }
  h2:first-of-type { margin-top: 0; }

  p + p { margin-top: 0.75rem; }

  .song { font-weight: 700; margin: 0.75rem 0 0.75rem 2.2rem; break-inside: avoid; }
</style>
<header>
  <h1>${escape(doc.title)}</h1>
  <p class="subtitle">${escape(doc.subtitle)}</p>
  <p class="byline">${escape(doc.byline)}</p>
</header>
${body}
</html>`

// Playwright keeps its browsers outside the project, one directory per build.
// Same lookup as scripts/shot.mjs, and the same reason: Chromium is not a
// dependency of the site.
function findChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH

  const roots = [
    path.join(homedir(), '.cache/ms-playwright'),
    path.join(homedir(), 'Library/Caches/ms-playwright'),
    path.join(homedir(), 'AppData/Local/ms-playwright'),
  ]

  for (const dir of roots) {
    if (!existsSync(dir)) continue
    const builds = readdirSync(dir)
      .filter((name) => name.startsWith('chromium-'))
      .sort((a, b) => Number(a.slice(9)) - Number(b.slice(9)))
    const build = builds.at(-1)
    if (!build) continue
    for (const exe of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
      const full = path.join(dir, build, exe)
      if (existsSync(full)) return full
    }
  }

  throw new Error('no Chromium found — run `npx playwright install chromium` or set CHROME_PATH')
}

const browser = await chromium.launch({ executablePath: findChromium() })
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(async () => {
  await document.fonts.ready
})
await page.pdf({
  path: out,
  format: 'A4',
  margin: { top: '20mm', bottom: '20mm', left: '22mm', right: '22mm' },
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  // The other two scripts carry no page numbers, being Word documents printed
  // as they stood. A numeral is worth the departure on a handout; a running
  // title would be the site's styling creeping back in.
  footerTemplate:
    '<div style="width:100%;text-align:center;font:9pt Georgia,serif;color:#000;"><span class="pageNumber"></span></div>',
  printBackground: false,
})
await browser.close()

console.log(`wrote ${path.relative(root, out)}`)
