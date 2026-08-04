import Placeholder from './Placeholder'

import pigs672webp from '../images/heroes/pigs-672.webp'
import pigs1344webp from '../images/heroes/pigs-1344.webp'
import pigs672jpg from '../images/heroes/pigs-672.jpg'
import pigs1344jpg from '../images/heroes/pigs-1344.jpg'
import pigsThumbWebp from '../images/thumbs/pigs-256.webp'
import pigsThumbJpg from '../images/thumbs/pigs-256.jpg'

import copperfield672webp from '../images/heroes/copperfield-co-672.webp'
import copperfield1344webp from '../images/heroes/copperfield-co-1344.webp'
import copperfield672jpg from '../images/heroes/copperfield-co-672.jpg'
import copperfield1344jpg from '../images/heroes/copperfield-co-1344.jpg'
import copperfieldThumbWebp from '../images/thumbs/copperfield-co-256.webp'
import copperfieldThumbJpg from '../images/thumbs/copperfield-co-256.jpg'

import guyana672webp from '../images/heroes/guyana-skies-672.webp'
import guyana1344webp from '../images/heroes/guyana-skies-1344.webp'
import guyana672jpg from '../images/heroes/guyana-skies-672.jpg'
import guyana1344jpg from '../images/heroes/guyana-skies-1344.jpg'
import guyanaThumbWebp from '../images/thumbs/guyana-skies-256.webp'
import guyanaThumbJpg from '../images/thumbs/guyana-skies-256.jpg'

// The artwork at the head of each musical, and the square icon of it that the
// home page's list draws.
//
// Keyed by the show's slug and imported statically, which is the whole reason
// this is a component rather than a field in musicals.js: Vite has to see the
// import to hash the file and rewrite the path, so the filename cannot be built
// at runtime. `scripts/make-hero-images.mjs` produces both sets and names them
// from the same slug, so replacing artwork changes no code here.
//
// The two are separate artwork rather than two crops of one file, which is why
// they are in two directories. The hero is 16:9 and runs the content column;
// the icon is square, because a row of 16:9 pictures beside two or three lines
// of text leaves the picture shorter than the words next to it and the list
// reads as a column of letterboxes. A square is what fits a paragraph.
//
// The alt text describes the picture rather than repeating the show's name,
// which is the heading immediately above it — hearing "Pigs" twice says nothing
// the second time. What it says instead is what someone looking at it sees.
const HEROES = {
  pigs: {
    hero: { webp: [pigs672webp, pigs1344webp], jpg: [pigs672jpg, pigs1344jpg] },
    thumb: { webp: [pigsThumbWebp], jpg: [pigsThumbJpg] },
    alt: 'An engraving on aged paper of seven pigs dancing upright in a farmyard, with a fence, a barn and a silo behind them.',
  },
  'copperfield-co': {
    hero: {
      webp: [copperfield672webp, copperfield1344webp],
      jpg: [copperfield672jpg, copperfield1344jpg],
    },
    thumb: { webp: [copperfieldThumbWebp], jpg: [copperfieldThumbJpg] },
    alt: 'An engraving in dark blue of a boy and a gentleman in a top hat facing each other across a Victorian London skyline with the dome of St Paul’s.',
  },
  'guyana-skies': {
    hero: { webp: [guyana672webp, guyana1344webp], jpg: [guyana672jpg, guyana1344jpg] },
    thumb: { webp: [guyanaThumbWebp], jpg: [guyanaThumbJpg] },
    alt: 'A man holding a suitcase stands on a riverbank of palms and stilt houses under a high yellow sun, looking across the water to Big Ben and the Houses of Parliament.',
  },
}

// The two sizes this artwork is drawn at, and what the browser should assume it
// is drawing into before it has any layout.
//
// `hero` runs the content column, which is max-w-2xl (42rem) with 1rem of the
// page's own padding either side of it — told the truth in both cases, because
// the alternative is the browser assuming the full viewport and fetching the
// 1344 for a phone.
//
// `thumb` is the home page's list, where the picture is 96px wide on a desktop
// and the 672 would be seven times more file than it can show. It offers the 256
// alone: one candidate needs no `sizes` to choose between.
//
// On a phone that icon is 160px, so a 2× screen is asking for 320 of a 256 and
// a 3× one rather more. That is the price of the row being level with the words
// beside it, and it is paid knowingly: see the note on the row in Home.jsx.
// Two of the three icons are the show's own hero padded out square and could be
// regenerated larger from the committed 1344 (see make-hero-images.mjs);
// Guyana Skies' is separate square artwork whose original is not in the repo,
// which is the one that would still need Frank.
//
// `ratio` is the shape of the files that size actually names, so the space is
// held before the picture lands and the page does not jump as three arrive. The
// two sizes are two different shapes, so this cannot be one pair of numbers on
// the img.
//
// `fit` is how the picture meets the box it is given. The hero is always drawn
// at its own shape and simply fills the width. The thumb is stretched to the
// height of the words beside it on a phone, which is a box the artwork's own
// square does not match, so it covers rather than distorts — see Home.jsx.
const SIZES = {
  hero: {
    widths: [672, 1344],
    sizes: '(min-width: 44rem) 672px, calc(100vw - 2rem)',
    ratio: { width: 1344, height: 756 },
    fit: 'w-full',
  },
  thumb: {
    widths: [256],
    sizes: undefined,
    ratio: { width: 256, height: 256 },
    fit: 'h-full w-full object-cover',
  },
}

function MusicalHero({ musical, size = 'hero', className = '' }) {
  const hero = HEROES[musical.slug]
  const s = SIZES[size]

  // A show whose artwork has not arrived keeps the dashed box that says what is
  // wanted, which is what all three of these had until it did. The thumbnail is
  // too small to say it in words, so there it is the empty frame alone — and it
  // is square, like the icons it stands in for.
  if (!hero) {
    return (
      <Placeholder
        label={size === 'hero' ? musical.heroLabel : undefined}
        dims={size === 'hero' ? musical.heroDims : undefined}
        aspect={size === 'hero' ? 'aspect-video' : 'aspect-square'}
        className={className}
      />
    )
  }

  const files = hero[size]
  const srcSet = (list) => s.widths.map((width, i) => `${list[i]} ${width}w`).join(', ')

  return (
    <picture className={`block ${className}`}>
      <source type="image/webp" srcSet={srcSet(files.webp)} sizes={s.sizes} />
      <img
        src={files.jpg[0]}
        srcSet={srcSet(files.jpg)}
        sizes={s.sizes}
        // Decorative at thumbnail size: the link around it names the show and
        // its title is the line beside it, so describing the picture there puts
        // a paragraph inside the link's announcement to say what the next two
        // words already say.
        alt={size === 'hero' ? hero.alt : ''}
        width={s.ratio.width}
        height={s.ratio.height}
        // Below the fold on a page nobody arrives at first — unlike the
        // portrait, which is fetched eagerly for the opposite reason.
        loading="lazy"
        decoding="async"
        className={`border border-gray-300 ${s.fit}`}
      />
    </picture>
  )
}

export default MusicalHero
