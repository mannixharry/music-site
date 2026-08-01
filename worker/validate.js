// Input checking for the admin API. The browser checks the same things before
// it bothers the server, but that is a courtesy to the person uploading — this
// is the copy that decides.

export const KINDS = ['single', 'demo', 'other']
export const ALBUM_KINDS = ['album', 'musical']
export const STATUSES = ['released', 'coming-soon']

// What decodeAudioData has a chance with, plus the containers Frank's exports
// are likely to be in. Deliberately a list rather than a `startsWith('audio/')`
// test: the point is to know what is in the bucket.
export const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/flac',
  'audio/x-flac',
  'audio/aiff',
  'audio/x-aiff',
  'audio/ogg',
]

// Cover art. A short list for the same reason: the point is to know what is in
// the bucket. No SVG — it is a script container, and these are served from a
// domain that fronts a whole public bucket.
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

// Cloudflare's forever-free allowances: 10 GB-month of R2 storage and 5 GB of
// D1, both counted across the whole account rather than per bucket or database.
// This account holds only this site, so capping the site's own usage is the
// same thing in practice — if that ever stops being true, these become an
// under-estimate of what is being used and want revisiting.
//
// Enforced as a hard stop rather than a warning: the point is that Frank cannot
// walk into a bill by uploading one master too many. It guards against
// accident, not against a determined client — the size checked at signing time
// is the one the browser declared.
export const R2_LIMIT_BYTES = 10 * 1024 * 1024 * 1024
export const D1_LIMIT_BYTES = 5 * 1024 * 1024 * 1024

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024

// Ceilings on the text fields. Not tidiness: every one of these is downloaded
// by every visitor inside /api/content, so without them a slip of the paste
// buffer puts two megabytes of anything on the front page. A song given 5000
// links reached D1 and came back SQLITE_TOOBIG as a 500.
const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000
const MAX_LINKS = 20
const MAX_LABEL_LENGTH = 80
const MAX_HREF_LENGTH = 2000

// Artwork does not need the audio ceiling, and a limit that fits the job is one
// less way for a mistaken drag to fill the bucket.
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024

// Slugs are the primary key, the playback slot key, and part of the R2 path, so
// they have to survive being all three: lowercase, ASCII, no punctuation.
// Apostrophes vanish rather than becoming separators, so "t'aime" stays one
// word — matching the ids the catalogue already uses.
export function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// A link has to be something that can only ever navigate. `javascript:` and
// `data:` URLs in an href are one click from running script on
// frankkirwan.com, and these links are rendered to every visitor — so the
// scheme is an allow-list, not a block-list.
//
// A leading "/" is allowed, so a song can point at a page on this site. "//" is
// not: it is protocol-relative and goes wherever the other end says.
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:']

function isSafeHref(value) {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > MAX_HREF_LENGTH) return false
  if (value.startsWith('//')) return false
  if (value.startsWith('/')) return true

  try {
    return SAFE_SCHEMES.includes(new URL(value).protocol)
  } catch {
    // Not an absolute URL at all, which for a streaming link is a mistake.
    return false
  }
}

function linkProblem(links) {
  if (!Array.isArray(links)) return 'links must be a list of {label, href}'
  if (links.length > MAX_LINKS) return `that is more than ${MAX_LINKS} links`

  for (const link of links) {
    if (!link || typeof link.label !== 'string' || link.label.length === 0) {
      return 'every link needs a label'
    }
    if (link.label.length > MAX_LABEL_LENGTH) {
      return `a link label is longer than ${MAX_LABEL_LENGTH} characters`
    }
    if (!isSafeHref(link.href)) {
      return `"${String(link.href).slice(0, 40)}" is not an address a link can point at`
    }
  }

  return null
}

// Which prefixes each column may name. This is the check that stops something
// genuinely destructive rather than merely untidy.
//
// Nothing checked it before, so a song's web_key could be set to another song's
// master. The next audio upload displaces that key, deleteReplacedObjects
// removes whatever was displaced, and the original — the only copy of it
// anywhere — is gone. Two PATCHes, no warning, nothing to restore from.
const KEY_PREFIXES = {
  webKey: ['web/'],
  coverKey: ['covers/'],
  masterKey: ['masters/'],
  coverMasterKey: ['cover-masters/'],
}

// Numbers, or null. A string stored as-is here would end up added into the
// storage figures.
const NUMBER_FIELDS = [
  'webBytes',
  'masterBytes',
  'coverBytes',
  'coverMasterBytes',
  'duration',
  'snippetStart',
  'snippetEnd',
]

// Returns an error string, or null when the input is acceptable. `partial` is
// for PATCH, where only the supplied fields are checked.
export function validateSong(input, { partial = false } = {}) {
  const has = (field) => field in input

  if (!partial || has('title')) {
    if (typeof input.title !== 'string' || input.title.trim().length === 0) {
      return 'title is required'
    }
    if (input.title.length > MAX_TITLE_LENGTH) {
      return `the title is longer than ${MAX_TITLE_LENGTH} characters`
    }
  }

  if (has('description')) {
    if (typeof input.description !== 'string') return 'description must be text'
    if (input.description.length > MAX_DESCRIPTION_LENGTH) {
      return `the description is longer than ${MAX_DESCRIPTION_LENGTH} characters`
    }
  }

  // Only checked when it is given. A song's kind follows its album — the route
  // derives it — so a caller that leaves it out is doing the right thing.
  if (has('kind') && !KINDS.includes(input.kind)) {
    return `kind must be one of ${KINDS.join(', ')}`
  }

  if (!partial || has('status')) {
    if (has('status') && !STATUSES.includes(input.status)) {
      return `status must be one of ${STATUSES.join(', ')}`
    }
  }

  // Only the shape here. Whether an album with this id exists is a question for
  // the database, and the route asks it — a validator that reached for D1 would
  // be doing two jobs and could only ever be right about one of them.
  if (has('albumId') && input.albumId !== null) {
    if (typeof input.albumId !== 'string' || !input.albumId.trim()) {
      return 'an album is named by its id, or left out entirely'
    }
    if (slugify(input.albumId) !== input.albumId) {
      return `"${String(input.albumId).slice(0, 40)}" is not the shape of an album id`
    }
  }

  if (has('links')) {
    const problem = linkProblem(input.links)
    if (problem) return problem
  }

  for (const [field, prefixes] of Object.entries(KEY_PREFIXES)) {
    if (!has(field) || input[field] === null) continue

    const key = input[field]
    if (typeof key !== 'string') return `${field} must be a storage key`
    // A leading slash is a file still sitting in public/ — see normalise.js.
    if (field === 'webKey' && key.startsWith('/')) continue
    if (!prefixes.some((prefix) => key.startsWith(prefix))) {
      return `${field} must name an object under ${prefixes.join(' or ')}`
    }
  }

  for (const field of NUMBER_FIELDS) {
    if (!has(field) || input[field] === null) continue
    if (typeof input[field] !== 'number' || !Number.isFinite(input[field]) || input[field] < 0) {
      return `${field} must be a number`
    }
  }

  if (has('duration') && input.duration !== null && !(input.duration > 0)) {
    return 'duration must be a positive number of seconds'
  }

  for (const [field, allowed] of [['masterMime', AUDIO_TYPES], ['coverMasterMime', IMAGE_TYPES]]) {
    if (has(field) && input[field] !== null && !allowed.includes(input[field])) {
      return `${field} is not a type this stores`
    }
  }

  // These only ever describe what is already stored, or where it is shown;
  // nothing here changes a file. See migrations/0003_snippets.sql,
  // 0004_snippet_tag.sql and 0007_home_page.sql.
  for (const flag of ['isSnippet', 'showSnippetTag', 'onHomepage', 'published']) {
    if (has(flag) && typeof input[flag] !== 'boolean') return `${flag} must be true or false`
  }

  const { snippetStart: from, snippetEnd: to } = input
  if (has('snippetStart') && has('snippetEnd') && from !== null && to !== null) {
    if (!(to > from)) return 'the preview has to end after it starts'
  }

  return null
}

// The key's prefix is the single fact that decides everything about an upload:
// which bucket it lands in, what it is allowed to be, and how big it may get.
// Tying all three to the destination means a request cannot ask for one thing
// and store another — the caller does not get a say in the bucket at all, so a
// cover cannot be talked into the private bucket or a master into the public one.
//
// MASTERS has no custom domain and no r2.dev URL: nothing under `masters/` or
// `cover-masters/` is reachable from the web.
const PREFIX_RULES = [
  { prefix: 'web/', bucket: 'MEDIA', what: 'audio', types: AUDIO_TYPES, max: MAX_UPLOAD_BYTES },
  { prefix: 'masters/', bucket: 'MASTERS', what: 'audio', types: AUDIO_TYPES, max: MAX_UPLOAD_BYTES },
  { prefix: 'covers/', bucket: 'MEDIA', what: 'image', types: IMAGE_TYPES, max: MAX_IMAGE_BYTES },
  {
    prefix: 'cover-masters/',
    bucket: 'MASTERS',
    what: 'image',
    types: IMAGE_TYPES,
    max: MAX_IMAGE_BYTES,
  },
]

export const PREFIXES = PREFIX_RULES.map((rule) => rule.prefix)

// Unrecognised prefix rather than a default: a new kind of object has to declare
// itself here before it can be stored at all.
export function ruleForKey(key) {
  return PREFIX_RULES.find((rule) => String(key ?? '').startsWith(rule.prefix)) ?? null
}

// An object key is also a public URL under media.frankkirwan.com. R2 keys are
// flat strings rather than paths, so ".." cannot climb out of a directory — but
// a key carrying traversal, an empty segment or a control character is one that
// the bucket, the CDN and the browser will not all agree about.
const UNSAFE_SEGMENTS = /(^|\/)\.\.(\/|$)|\/\//
const MAX_KEY_LENGTH = 512

function hasControlCharacter(value) {
  for (const character of value) {
    const code = character.codePointAt(0)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

export function validateUpload({ key, contentType, size }) {
  const rule = ruleForKey(key)
  if (!rule) return `key must start with one of ${PREFIXES.join(', ')}`
  if (
    typeof key !== 'string' ||
    key.length > MAX_KEY_LENGTH ||
    UNSAFE_SEGMENTS.test(key) ||
    hasControlCharacter(key)
  ) {
    return 'key is not a shape this site stores'
  }

  if (!rule.types.includes(contentType)) {
    return `unsupported ${rule.what} type: ${contentType}`
  }
  if (!Number.isFinite(size) || size <= 0) {
    return 'missing file size'
  }
  if (size > rule.max) {
    return `file is larger than ${Math.round(rule.max / 1024 / 1024)}MB`
  }
  return null
}

// An album. `kind` is the whole of the difference between a musical and a
// record: a musical picks up its synopsis and downloads from
// src/content/musicals.js by matching this id, and an album simply has songs.
export function validateAlbum(input, { partial = false } = {}) {
  const has = (field) => Object.prototype.hasOwnProperty.call(input ?? {}, field)

  if (!input || typeof input !== 'object') return 'no album given'

  // The id is optional: the route makes one from the title, as it does for a
  // song. Checked for shape only when one is supplied.
  if (has('id') && input.id) {
    if (typeof input.id !== 'string' || slugify(input.id) !== input.id) {
      return `"${String(input.id).slice(0, 40)}" is not the shape of an album id`
    }
  }

  if (!partial || has('title')) {
    if (typeof input.title !== 'string' || !input.title.trim()) return 'an album needs a title'
    if (input.title.length > MAX_TITLE_LENGTH) {
      return `the title is longer than ${MAX_TITLE_LENGTH} characters`
    }
  }

  if (!partial || has('kind')) {
    if (!ALBUM_KINDS.includes(input.kind)) {
      return `an album is one of ${ALBUM_KINDS.join(', ')}`
    }
  }

  if (has('subtitle')) {
    if (typeof input.subtitle !== 'string') return 'the subtitle must be text'
    if (input.subtitle.length > MAX_TITLE_LENGTH) {
      return `the subtitle is longer than ${MAX_TITLE_LENGTH} characters`
    }
  }

  return null
}
