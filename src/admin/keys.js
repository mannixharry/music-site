// Where an uploaded file goes, by name. Four builders that were the same line
// four times over.
//
// Keys are unique per upload rather than per song, so replacing a track never
// serves the old bytes from a cache — that is what lets the media domain send
// `immutable` with a year-long max-age. It is also exactly why a displaced
// object has to be deleted on purpose rather than being overwritten into
// nothing; see worker/objects.js.
//
// The prefix is the whole of the decision about which bucket a file lands in,
// what content types it may be and how big it may get. That decision belongs to
// the Worker — PREFIX_RULES in worker/validate.js — and these four strings have
// to be among the ones it recognises, or the upload is refused.

export function extensionOf(file) {
  return file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
}

function objectKey(prefix, songId, extension) {
  return `${prefix}/${songId}/${crypto.randomUUID().slice(0, 8)}.${extension}`
}

// Defaults to mp3 because the transcoded path always produces one. The direct
// path passes the file's own instead — an .m4a served as-is has to keep its
// extension, or the key describes something the object is not. Playback is
// driven by the stored content-type either way; this is about being able to
// look in the bucket and know what you are holding.
export const webKeyFor = (songId, extension = 'mp3') => objectKey('web', songId, extension)

export const masterKeyFor = (songId, file) => objectKey('masters', songId, extensionOf(file))

export const coverKeyFor = (songId, extension) => objectKey('covers', songId, extension)

export const coverMasterKeyFor = (songId, file) =>
  objectKey('cover-masters', songId, extensionOf(file))
