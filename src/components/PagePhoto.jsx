import then672webp from '../images/pages/about-then-672.webp'
import then1192webp from '../images/pages/about-then-1192.webp'
import then672jpg from '../images/pages/about-then-672.jpg'
import then1192jpg from '../images/pages/about-then-1192.jpg'

import now672webp from '../images/pages/about-now-672.webp'
import now1122webp from '../images/pages/about-now-1122.webp'
import now672jpg from '../images/pages/about-now-672.jpg'
import now1122jpg from '../images/pages/about-now-1122.jpg'

import guitar672webp from '../images/pages/contact-guitar-672.webp'
import guitar1344webp from '../images/pages/contact-guitar-1344.webp'
import guitar672jpg from '../images/pages/contact-guitar-672.jpg'
import guitar1344jpg from '../images/pages/contact-guitar-1344.jpg'

// The photographs on About and Contact.
//
// Keyed and statically imported for the same reason MusicalHero is: Vite has to
// see the import to hash the file, so the path cannot be assembled at runtime.
// WebP and JPEG only, no AVIF, because these come out of the same canvas in
// `scripts/make-hero-images.mjs --out=pages` and canvas cannot encode it.
//
// `width`/`height` are the intrinsic size of the largest file, so the ratio is
// known before anything downloads and the text does not jump when it lands.
// The second width differs per photograph because the script never upscales —
// the two About pictures are smaller than 1344 to begin with.
//
// The alt text says what is in the picture rather than naming the page again.
const PHOTOS = {
  'about-then': {
    webp: [`${then672webp} 672w`, `${then1192webp} 1192w`],
    jpg: [`${then672jpg} 672w`, `${then1192jpg} 1192w`],
    fallback: then672jpg,
    // The scanned print's paper border is cropped off by the crop recorded in
    // the make-hero-images command, so these are the picture's own dimensions
    // rather than the scan's.
    width: 1192,
    height: 1150,
    alt: 'A young Frank Kirwan singing and playing a Fender acoustic guitar, perched on the arm of a patterned armchair in a front room.',
  },
  'about-now': {
    webp: [`${now672webp} 672w`, `${now1122webp} 1122w`],
    jpg: [`${now672jpg} 672w`, `${now1122jpg} 1122w`],
    fallback: now672jpg,
    width: 1122,
    height: 1402,
    alt: 'Frank Kirwan now, smiling, an acoustic guitar resting across his knee.',
  },
  'contact-guitar': {
    webp: [`${guitar672webp} 672w`, `${guitar1344webp} 1344w`],
    jpg: [`${guitar672jpg} 672w`, `${guitar1344jpg} 1344w`],
    fallback: guitar672jpg,
    width: 1344,
    height: 1008,
    alt: 'A close view of a picking hand over the soundhole of an acoustic guitar.',
  },
}

// `sizes` is told the truth in both layouts or the browser assumes the full
// viewport and fetches the larger file for a phone. The default describes a
// picture set into the text at a fixed width on a desktop and running the full
// column on a phone; Contact overrides it, being the width of the column.
function PagePhoto({ name, sizes = '(min-width: 40rem) 224px, calc(100vw - 2rem)', className = '' }) {
  const photo = PHOTOS[name]
  if (!photo) return null

  return (
    <picture className={`block ${className}`}>
      <source type="image/webp" srcSet={photo.webp.join(', ')} sizes={sizes} />
      <img
        src={photo.fallback}
        srcSet={photo.jpg.join(', ')}
        sizes={sizes}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        className="w-full border border-gray-300"
      />
    </picture>
  )
}

export default PagePhoto
