// Input checking for the admin API. The browser checks the same things before
// it bothers the server, but that is a courtesy to the person uploading — this
// is the copy that decides.

export const KINDS = ['single', 'demo', 'other']
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

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024

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

function isLinkArray(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (link) =>
        link &&
        typeof link.label === 'string' &&
        link.label.length > 0 &&
        typeof link.href === 'string',
    )
  )
}

// Returns an error string, or null when the input is acceptable. `partial` is
// for PATCH, where only the supplied fields are checked.
export function validateSong(input, { partial = false } = {}) {
  const has = (field) => field in input

  if (!partial || has('title')) {
    if (typeof input.title !== 'string' || input.title.trim().length === 0) {
      return 'title is required'
    }
  }

  if (!partial || has('kind')) {
    if (!KINDS.includes(input.kind)) return `kind must be one of ${KINDS.join(', ')}`
  }

  if (!partial || has('status')) {
    if (has('status') && !STATUSES.includes(input.status)) {
      return `status must be one of ${STATUSES.join(', ')}`
    }
  }

  // A demo belongs to a musical; nothing else does. Letting these drift apart
  // means a demo that MusicalSection can never find.
  const kind = input.kind
  if (kind === 'demo' && has('musicalSlug') && !input.musicalSlug) {
    return 'a demo needs a musical'
  }
  if (kind && kind !== 'demo' && input.musicalSlug) {
    return 'only a demo can belong to a musical'
  }

  if (has('links') && !isLinkArray(input.links)) {
    return 'links must be a list of {label, href}'
  }

  if (has('duration') && input.duration !== null && !(Number(input.duration) > 0)) {
    return 'duration must be a positive number of seconds'
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

export function validateUpload({ key, contentType, size }) {
  const rule = ruleForKey(key)
  if (!rule) return `key must start with one of ${PREFIXES.join(', ')}`

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
