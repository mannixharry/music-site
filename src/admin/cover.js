// The mechanics of turning whatever artwork Frank has into something worth
// serving. useCoverUpload drives it; no React here.
//
// This is the audio pipeline's shape with the expensive part removed. Audio
// needs a Web Worker because the MP3 encode is a long JavaScript loop; resizing
// an image is `drawImage` plus `toBlob`, both native and both quick, so it stays
// on the main thread and costs the admin bundle nothing.

export const ACCEPTED_IMAGES = '.jpg,.jpeg,.png,.webp,.avif'

const EXTENSION_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}

// Same reasoning as contentTypeFor in upload.js: browsers disagree about
// File.type, the extension is the more reliable signal, and the server
// validates whatever we claim anyway.
export function imageTypeFor(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return EXTENSION_TYPES[extension] ?? file.type ?? 'application/octet-stream'
}

// What the site is built to show. The home page draws covers at 96px, so 1000 is
// already generous — it is the size the placeholder has always advertised, and
// leaves room to show art larger later without going back to the originals.
export const TARGET_SIZE = 1000

// Under this and already a web format, the file is served untouched. Mirrors
// canUseDirectly() for audio, and for the same reason: re-encoding something
// already small and already compressed only loses quality.
const DIRECT_LIMIT = 400 * 1024

function isWebImage(file) {
  const type = imageTypeFor(file)
  return type === 'image/jpeg' || type === 'image/png' || type === 'image/webp'
}

async function load(file) {
  // createImageBitmap decodes off the main thread and does not need the image to
  // be in the document, unlike an <img> with an object URL.
  try {
    return await createImageBitmap(file)
  } catch {
    throw new Error('That file could not be read as an image.')
  }
}

// True when the file can go to the bucket as it stands: a web format, small, and
// no larger than the site will ever draw it.
export async function canUseImageDirectly(file) {
  if (!isWebImage(file) || file.size > DIRECT_LIMIT) return false
  const bitmap = await load(file)
  const fits = bitmap.width <= TARGET_SIZE && bitmap.height <= TARGET_SIZE
  bitmap.close()
  return fits
}

// Square, centre-cropped, WebP. Square because the layout draws it in an
// aspect-square box and letting the image decide would make the rows ragged;
// cropped rather than letterboxed because bars around a cover look like a
// mistake. WebP because it is the one format here that keeps transparency and
// still beats JPEG on size.
export async function resizeCover(file) {
  const bitmap = await load(file)

  const side = Math.min(bitmap.width, bitmap.height, TARGET_SIZE)
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side

  const context = canvas.getContext('2d')
  context.imageSmoothingQuality = 'high'

  // The largest centred square of the source, drawn to fill the canvas.
  const crop = Math.min(bitmap.width, bitmap.height)
  context.drawImage(
    bitmap,
    (bitmap.width - crop) / 2,
    (bitmap.height - crop) / 2,
    crop,
    crop,
    0,
    0,
    side,
    side,
  )
  bitmap.close()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('The image could not be encoded.'))),
      'image/webp',
      0.85,
    )
  })

  return { blob, side }
}
