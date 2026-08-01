import Placeholder from './Placeholder'

import pigs256webp from '../images/heroes/pigs-256.webp'
import pigs672webp from '../images/heroes/pigs-672.webp'
import pigs1344webp from '../images/heroes/pigs-1344.webp'
import pigs256jpg from '../images/heroes/pigs-256.jpg'
import pigs672jpg from '../images/heroes/pigs-672.jpg'
import pigs1344jpg from '../images/heroes/pigs-1344.jpg'

import copperfield256webp from '../images/heroes/copperfield-co-256.webp'
import copperfield672webp from '../images/heroes/copperfield-co-672.webp'
import copperfield1344webp from '../images/heroes/copperfield-co-1344.webp'
import copperfield256jpg from '../images/heroes/copperfield-co-256.jpg'
import copperfield672jpg from '../images/heroes/copperfield-co-672.jpg'
import copperfield1344jpg from '../images/heroes/copperfield-co-1344.jpg'

import guyana256webp from '../images/heroes/guyana-skies-256.webp'
import guyana672webp from '../images/heroes/guyana-skies-672.webp'
import guyana1344webp from '../images/heroes/guyana-skies-1344.webp'
import guyana256jpg from '../images/heroes/guyana-skies-256.jpg'
import guyana672jpg from '../images/heroes/guyana-skies-672.jpg'
import guyana1344jpg from '../images/heroes/guyana-skies-1344.jpg'

// The artwork at the head of each musical.
//
// Keyed by the show's slug and imported statically, which is the whole reason
// this is a component rather than a field in musicals.js: Vite has to see the
// import to hash the file and rewrite the path, so the filename cannot be built
// at runtime. `scripts/make-hero-images.mjs` produces the four files per show
// and names them from the same slug, so replacing artwork changes no code here.
//
// The alt text describes the picture rather than repeating the show's name,
// which is the heading immediately above it — hearing "Pigs" twice says nothing
// the second time. What it says instead is what someone looking at it sees.
const HEROES = {
  pigs: {
    webp: [pigs256webp, pigs672webp, pigs1344webp],
    jpg: [pigs256jpg, pigs672jpg, pigs1344jpg],
    alt: 'An engraving on aged paper of seven pigs dancing upright in a farmyard, with a fence, a barn and a silo behind them.',
  },
  'copperfield-co': {
    webp: [copperfield256webp, copperfield672webp, copperfield1344webp],
    jpg: [copperfield256jpg, copperfield672jpg, copperfield1344jpg],
    alt: 'An engraving in dark blue of a boy and a gentleman in a top hat facing each other across a Victorian London skyline with the dome of St Paul’s.',
  },
  'guyana-skies': {
    webp: [guyana256webp, guyana672webp, guyana1344webp],
    jpg: [guyana256jpg, guyana672jpg, guyana1344jpg],
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
// `thumb` is the home page's list, where the picture is 112px wide and the 672
// would be six times more file than it can show. It offers the 256 alone: one
// candidate needs no `sizes` to choose between, and at 112px a 2× screen is
// still asking for less than 256.
const SIZES = {
  hero: {
    widths: [672, 1344],
    from: 1,
    sizes: '(min-width: 44rem) 672px, calc(100vw - 2rem)',
  },
  thumb: {
    widths: [256],
    from: 0,
    sizes: undefined,
  },
}

function MusicalHero({ musical, size = 'hero', className = '' }) {
  const hero = HEROES[musical.slug]
  const s = SIZES[size]

  // A show whose artwork has not arrived keeps the dashed box that says what is
  // wanted, which is what all three of these had until it did. The thumbnail is
  // too small to say it in words, so there it is the empty frame alone.
  if (!hero) {
    return (
      <Placeholder
        label={size === 'hero' ? musical.heroLabel : undefined}
        dims={size === 'hero' ? musical.heroDims : undefined}
        aspect="aspect-video"
        className={className}
      />
    )
  }

  const srcSet = (files) => s.widths.map((width, i) => `${files[s.from + i]} ${width}w`).join(', ')

  return (
    <picture className={`block ${className}`}>
      <source type="image/webp" srcSet={srcSet(hero.webp)} sizes={s.sizes} />
      <img
        src={hero.jpg[s.from]}
        srcSet={srcSet(hero.jpg)}
        sizes={s.sizes}
        // Decorative at thumbnail size: the link around it names the show and
        // its title is the line beside it, so describing the picture there puts
        // a paragraph inside the link's announcement to say what the next two
        // words already say.
        alt={size === 'hero' ? hero.alt : ''}
        // The real 16:9 of the generated files, so the space is held before the
        // picture lands and the page does not jump as three of them arrive.
        width={1344}
        height={756}
        // Below the fold on a page nobody arrives at first — unlike the
        // portrait, which is fetched eagerly for the opposite reason.
        loading="lazy"
        decoding="async"
        className="w-full border border-gray-300"
      />
    </picture>
  )
}

export default MusicalHero
