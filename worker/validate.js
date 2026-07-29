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

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024

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

export function validateUpload({ contentType, size }) {
  if (!AUDIO_TYPES.includes(contentType)) {
    return `unsupported audio type: ${contentType}`
  }
  if (!Number.isFinite(size) || size <= 0) {
    return 'missing file size'
  }
  if (size > MAX_UPLOAD_BYTES) {
    return `file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`
  }
  return null
}
