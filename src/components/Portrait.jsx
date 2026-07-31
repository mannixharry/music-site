import avif672 from '../images/frank-kirwan-672.avif'
import avif1000 from '../images/frank-kirwan-1000.avif'
import webp672 from '../images/frank-kirwan-672.webp'
import webp1000 from '../images/frank-kirwan-1000.webp'
import jpg672 from '../images/frank-kirwan-672.jpg'
import jpg1000 from '../images/frank-kirwan-1000.jpg'

// The photograph at the top of the home page.
//
// It is the largest thing the site sends anyone and the first thing they see —
// which makes it the one image worth this much fuss. It was a single 1000-pixel
// JPEG, 146 kB, for a slot that is never wider than 336 CSS pixels; a phone on a
// slow connection downloaded three times the picture it could display, in the
// oldest format there is, before the page had a face on it.
//
// Three formats, best first: a browser takes the first <source> it understands,
// so Safari and Chrome get AVIF at 33 kB, anything a few years older gets WebP,
// and the <img> underneath is the JPEG that has always worked. Two widths of
// each, because a 2× screen wants twice the pixels and a 1× screen should not
// pay for them.
//
// `sizes` has to be told the truth or the browser guesses the full viewport:
// half of the 42rem column above the medium breakpoint, the column itself below
// it. width and height are the intrinsic ratio, so the space is reserved before
// the file arrives and the text below does not jump when it does.
//
// Imported rather than referenced from public/, so each file carries a content
// hash and is cached for a year — see public/_headers.
function Portrait({ className = '' }) {
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${avif672} 672w, ${avif1000} 1000w`}
        sizes="(min-width: 768px) 336px, calc(100vw - 4rem)"
      />
      <source
        type="image/webp"
        srcSet={`${webp672} 672w, ${webp1000} 1000w`}
        sizes="(min-width: 768px) 336px, calc(100vw - 4rem)"
      />
      <img
        src={jpg672}
        srcSet={`${jpg672} 672w, ${jpg1000} 1000w`}
        sizes="(min-width: 768px) 336px, calc(100vw - 4rem)"
        alt="Frank Kirwan with his guitar"
        width={1000}
        height={1250}
        // The opposite of every other image on the site: this one is above the
        // fold on the page most people arrive at, so it should be fetched
        // eagerly and early rather than lazily.
        fetchPriority="high"
        decoding="async"
        className={className}
      />
    </picture>
  )
}

export default Portrait
