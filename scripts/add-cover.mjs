// Attaches cover art to songs (or albums) without a browser.
//
//   node scripts/add-cover.mjs "reasons=~/art/Reasons cover.png"          → local
//   node scripts/add-cover.mjs @covers.txt --remote                       → the real one
//   node scripts/add-cover.mjs --album "pigs=~/art/pigs.png" --remote
//
// The companion to add-song.mjs, and it exists because that script says in so
// many words that it cannot do this: resizing needs a canvas, and node has no
// canvas. So this borrows make-hero-images.mjs's answer to the same problem and
// runs the resize in headless Chromium, which is what src/admin/cover.js does in
// Frank's browser anyway — same crop, same 1000px ceiling, same WebP at 0.85.
// playwright-core is already a devDependency; no ImageMagick, no sharp.
//
// Everything below reproduces useCoverUpload: the original goes to the private
// bucket untouched and is recorded FIRST, so a failed resize leaves the upload
// recoverable rather than lost, and the public copy can be re-cropped later
// without going back to Frank for the file.
//
// It writes only the five cover columns, with an UPDATE rather than the
// INSERT OR REPLACE add-song.mjs uses. That is deliberate: rebuilding a whole
// row means naming every column, and a column left out comes back NULL.
//
// Same caveat as add-song.mjs: an admin write purges the cached /api/content
// and this cannot, because that cache lives inside the Worker. The version is
// bumped, so the change is correct once the edge revalidates — about a minute.

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { statSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATABASE = 'artist-site'
const MEDIA = 'frank-kirwan-media'
const MASTERS = 'frank-kirwan-masters'

// Mirrors EXTENSION_TYPES in src/admin/cover.js. The extension decides, not the
// file's declared type, for the same reason it does there.
const EXTENSION_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}

// All three from src/admin/cover.js, and they have to stay equal to it — a cover
// made here and a cover made in the admin should be the same file.
const TARGET_SIZE = 1000
const DIRECT_LIMIT = 400 * 1024
const QUALITY = 0.85

// worker/validate.js MAX_IMAGE_BYTES. The Worker is not in this path — wrangler
// writes to the bucket directly — so the ceiling is checked here instead of
// being enforced for us.
const MAX_IMAGE_BYTES = 25 * 1024 * 1024

function usage() {
  console.log(`
Usage: node scripts/add-cover.mjs <id>=<image> ... [options]

  <id>=<image>   The song id (or album id with --album) and the artwork.
  @<file>        Read <id>=<image> lines from a file instead. Blank lines and
                 lines starting with # are ignored.
  --album        Target the albums table rather than songs.
  --remote       Act on the REAL database and buckets. Off by default.
  --dry-run      Resize and report, upload nothing, write nothing.

Accepts ${Object.keys(EXTENSION_TYPES).join(', ')}. Replacing existing artwork
deletes the objects it displaces, the way a PATCH through /admin would.
`)
}

const quote = (value) =>
  value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`
const number = (value) => (value === null || value === undefined ? 'NULL' : String(value))

function wrangler(args, { capture = false } = {}) {
  return execFileSync('npx', ['wrangler', ...args], {
    cwd: root,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
  })
}

function query(sql, remote) {
  const out = wrangler(
    ['d1', 'execute', DATABASE, remote ? '--remote' : '--local', '--json', `--command=${sql}`],
    { capture: true },
  )
  // --json still prints wrangler's banner on some versions, so find the payload
  // rather than trusting the whole of stdout to be JSON.
  return JSON.parse(out.slice(out.indexOf('[')))[0].results
}

// Same as findChromium() in make-hero-images.mjs.
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

function parseJob(spec) {
  const at = spec.indexOf('=')
  if (at === -1) throw new Error(`expected <id>=<image>, got "${spec}"`)

  const id = spec.slice(0, at).trim()
  // `~` is the shell's, not Node's, and an unexpanded one is a path that does
  // not exist rather than an error anyone can read.
  const file = spec.slice(at + 1).trim().replace(/^~(?=\/)/, homedir())
  if (!id) throw new Error(`no id in "${spec}"`)
  if (!existsSync(file)) throw new Error(`no such file: ${file}`)

  const extension = path.extname(file).slice(1).toLowerCase()
  const mime = EXTENSION_TYPES[extension]
  if (!mime) throw new Error(`unrecognised image extension: .${extension} (${path.basename(file)})`)

  const { size } = statSync(file)
  if (size > MAX_IMAGE_BYTES) {
    throw new Error(`${path.basename(file)} is ${(size / 1048576).toFixed(1)}MB; the ceiling is 25MB`)
  }

  return { id, file, extension, mime, size }
}

function parseArgs(argv) {
  const options = { jobs: [] }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') return { help: true }
    else if (arg === '--remote') options.remote = true
    else if (arg === '--album') options.album = true
    else if (arg === '--dry-run') options.dryRun = true
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`)
    else if (arg.startsWith('@')) {
      const list = arg.slice(1).replace(/^~(?=\/)/, homedir())
      if (!existsSync(list)) throw new Error(`no such file: ${list}`)
      for (const line of readFileSync(list, 'utf8').split('\n')) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) options.jobs.push(parseJob(trimmed))
      }
    } else options.jobs.push(parseJob(arg))
  }

  return options
}

// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) return usage()
  if (options.jobs.length === 0) return usage()

  const remote = Boolean(options.remote)
  const table = options.album ? 'albums' : 'songs'
  const prefix = options.album ? 'album-' : ''

  // Every id is checked before a byte moves. Half a batch applied because the
  // twentieth line had a typo is the failure worth designing out.
  const ids = options.jobs.map((job) => quote(job.id)).join(', ')
  const rows = query(
    `SELECT id, cover_key, cover_master_key FROM ${table} WHERE id IN (${ids})`,
    remote,
  )
  const existing = new Map(rows.map((row) => [row.id, row]))

  const missing = options.jobs.filter((job) => !existing.has(job.id)).map((job) => job.id)
  if (missing.length) {
    throw new Error(`not in ${table}: ${missing.join(', ')}`)
  }
  const duplicates = options.jobs
    .map((job) => job.id)
    .filter((id, index, all) => all.indexOf(id) !== index)
  if (duplicates.length) throw new Error(`given twice: ${[...new Set(duplicates)].join(', ')}`)

  console.log(
    `${options.jobs.length} cover${options.jobs.length === 1 ? '' : 's'} → ` +
      `${table} in the ${remote ? 'REMOTE' : 'local'} database\n`,
  )

  const browser = await chromium.launch({ executablePath: findChromium() })
  const page = await browser.newPage()
  const scratch = mkdtempSync(path.join(tmpdir(), 'add-cover-'))

  const put = (bucket, key, file, contentType) => {
    if (options.dryRun) return
    wrangler(
      [
        'r2',
        'object',
        'put',
        `${bucket}/${key}`,
        `--file=${file}`,
        `--content-type=${contentType}`,
        remote ? '--remote' : '--local',
      ],
      { capture: true },
    )
  }

  const statements = []
  const displaced = []

  try {
    for (const job of options.jobs) {
      const source = `data:${job.mime};base64,${readFileSync(job.file).toString('base64')}`

      // The whole of the decision is made in the page: whether the file can be
      // served untouched needs its pixel dimensions, which is a decode either
      // way, so it may as well come back with the resized bytes attached.
      const result = await page.evaluate(
        async ({ source, mime, size, target, quality, directLimit }) => {
          const bitmap = await createImageBitmap(await (await fetch(source)).blob())
          const { width, height } = bitmap

          // canUseImageDirectly(): a web format, small, and no larger than the
          // site will ever draw it. Re-encoding one of those only loses.
          const isWeb = ['image/jpeg', 'image/png', 'image/webp'].includes(mime)
          if (isWeb && size <= directLimit && width <= target && height <= target) {
            bitmap.close()
            return { direct: true, width, height }
          }

          // resizeCover(): the largest centred square of the source, drawn to
          // fill a square canvas, never upscaled.
          const side = Math.min(width, height, target)
          const crop = Math.min(width, height)
          const canvas = new OffscreenCanvas(side, side)
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(bitmap, (width - crop) / 2, (height - crop) / 2, crop, crop, 0, 0, side, side)
          bitmap.close()

          const blob = await canvas.convertToBlob({ type: 'image/webp', quality })
          // Handed back as a plain array; page.evaluate cannot return a Blob.
          return {
            direct: false,
            width,
            height,
            side,
            bytes: [...new Uint8Array(await blob.arrayBuffer())],
          }
        },
        {
          source,
          mime: job.mime,
          size: job.size,
          target: TARGET_SIZE,
          quality: QUALITY,
          directLimit: DIRECT_LIMIT,
        },
      )

      // Keys are unique per upload rather than per row, which is what lets the
      // media domain serve `immutable` for a year — and is why the object a
      // patch stops pointing at has to be deleted on purpose. Matches
      // objectKey() in src/admin/keys.js.
      const stamp = () => randomUUID().slice(0, 8)
      const coverMasterKey = `cover-masters/${prefix}${job.id}/${stamp()}.${job.extension}`
      const coverKey = result.direct
        ? `covers/${prefix}${job.id}/${stamp()}.${job.extension}`
        : `covers/${prefix}${job.id}/${stamp()}.webp`

      let coverBytes = job.size
      let coverFile = job.file
      let coverType = job.mime

      if (!result.direct) {
        coverBytes = result.bytes.length
        coverFile = path.join(scratch, `${job.id}.webp`)
        writeFileSync(coverFile, Buffer.from(result.bytes))
        coverType = 'image/webp'
      }

      console.log(
        `  ${job.id.padEnd(28)} ${result.width}×${result.height} ` +
          `${(job.size / 1048576).toFixed(1)}MB ${job.mime}\n` +
          `  ${''.padEnd(28)} → ${
            result.direct
              ? 'served as it is'
              : `${result.side}×${result.side} webp ${(coverBytes / 1024).toFixed(0)} kB`
          }`,
      )

      // The original first, and recorded first, exactly as useCoverUpload does.
      put(MASTERS, coverMasterKey, job.file, job.mime)
      put(MEDIA, coverKey, coverFile, coverType)

      const was = existing.get(job.id)
      if (was.cover_key) displaced.push([MEDIA, was.cover_key])
      if (was.cover_master_key) displaced.push([MASTERS, was.cover_master_key])

      statements.push(
        `UPDATE ${table} SET ` +
          [
            `cover_key = ${quote(coverKey)}`,
            `cover_bytes = ${number(coverBytes)}`,
            `cover_master_key = ${quote(coverMasterKey)}`,
            `cover_master_bytes = ${number(job.size)}`,
            `cover_master_mime = ${quote(job.mime)}`,
            `updated_at = ${quote(new Date().toISOString())}`,
          ].join(', ') +
          ` WHERE id = ${quote(job.id)};`,
      )
    }
  } finally {
    await browser.close()
  }

  // Same shape as bumpVersion() in worker/db.js. Opaque, not a hash of the
  // content: the client only asks whether it differs from its baked-in snapshot.
  const version = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`
  statements.push(
    `INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ${quote(version)});`,
  )

  const sql = statements.join('\n')
  if (options.dryRun) {
    console.log(`\n--- dry run, nothing written ---\n${sql}`)
    return
  }

  const file = path.join(scratch, 'covers.sql')
  writeFileSync(file, `${sql}\n`)
  wrangler(['d1', 'execute', DATABASE, remote ? '--remote' : '--local', `--file=${file}`, '--yes'], {
    capture: true,
  })

  // The R2 puts and the D1 write are separate commands with no transaction
  // across them. The interesting failure is the second not landing after the
  // first did: the objects exist, the rows point somewhere else, and nothing in
  // the output says so. So read them back, the way add-song.mjs does.
  const written = query(`SELECT id, cover_key FROM ${table} WHERE id IN (${ids})`, remote)
  const stored = new Map(written.map((row) => [row.id, row.cover_key]))
  for (const statement of statements) {
    const id = statement.match(/WHERE id = '(.+)';$/)?.[1]
    const key = statement.match(/cover_key = '([^']+)'/)?.[1]
    if (id && key && stored.get(id.replaceAll("''", "'")) !== key) {
      throw new Error(
        `uploaded ${key} but "${id}" still has cover_key = ${stored.get(id) ?? 'NULL'} — ` +
          `the object is in R2, the row was not updated. Re-run to retry.`,
      )
    }
  }

  // Only now: an object deleted before the row stopped naming it is a broken
  // cover on the live site for as long as the write takes.
  for (const [bucket, key] of displaced) {
    console.log(`  displaced ${bucket}/${key}`)
    wrangler(['r2', 'object', 'delete', `${bucket}/${key}`, remote ? '--remote' : '--local'], {
      capture: true,
    })
  }

  console.log(`\nDone — ${options.jobs.length} in, version ${version}.`)
  if (remote) {
    console.log('The edge cache holds /api/content for up to a minute; this cannot purge it.')
    console.log('Run `node scripts/pull-snapshot.mjs` once it has, to refresh the bundled snapshot.')
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`)
  process.exit(1)
})
