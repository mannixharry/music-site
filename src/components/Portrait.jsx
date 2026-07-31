import avif672 from '../images/frank-kirwan-672.avif'
import avif1000 from '../images/frank-kirwan-1000.avif'
import webp672 from '../images/frank-kirwan-672.webp'
import webp1000 from '../images/frank-kirwan-1000.webp'
import jpg672 from '../images/frank-kirwan-672.jpg'
import jpg1000 from '../images/frank-kirwan-1000.jpg'

// The photograph at the top of the home page: the largest thing the site sends
// anyone and the first thing they see.
//
// Three formats, best first — a browser takes the first <source> it
// understands, so current ones get AVIF at 33 kB against 146 kB of JPEG. Two
// widths of each, because a 2× screen wants twice the pixels and a 1× screen
// should not pay for them.
//
// `sizes` has to be told the truth or the browser assumes the full viewport:
// 320px above the medium breakpoint, the column below it. width and height are
// the intrinsic ratio, so the space is reserved before the file arrives.
//
// Imported rather than referenced from public/, so each file carries a content
// hash and is cached for a year — see public/_headers.
function Portrait({ className = '' }) {
  return (
    // The sizing goes on the <picture>, which is the flex child, and it is made
    // a non-shrinking block. A <picture> is inline and collapses to its content
    // by default, and unlike a replaced element it will be squeezed by whatever
    // sits beside it — both of which shrink the photograph if left alone.
    <picture className={`block shrink-0 ${className}`}>
      <source
        type="image/avif"
        srcSet={`${avif672} 672w, ${avif1000} 1000w`}
        sizes="(min-width: 768px) 320px, calc(100vw - 4rem)"
      />
      <source
        type="image/webp"
        srcSet={`${webp672} 672w, ${webp1000} 1000w`}
        sizes="(min-width: 768px) 320px, calc(100vw - 4rem)"
      />
      <img
        src={jpg672}
        srcSet={`${jpg672} 672w, ${jpg1000} 1000w`}
        sizes="(min-width: 768px) 320px, calc(100vw - 4rem)"
        alt="Frank Kirwan with his guitar"
        width={1000}
        height={1250}
        // The opposite of every other image here: above the fold on the page
        // most people arrive at, so it is fetched eagerly and early.
        fetchPriority="high"
        decoding="async"
        // Fills whatever the <picture> above has been sized to.
        className="w-full"
      />
    </picture>
  )
}

export default Portrait
