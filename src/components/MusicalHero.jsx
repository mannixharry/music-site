import Placeholder from './Placeholder'

import pigs672webp from '../images/heroes/pigs-672.webp'
import pigs1344webp from '../images/heroes/pigs-1344.webp'
import pigs672jpg from '../images/heroes/pigs-672.jpg'
import pigs1344jpg from '../images/heroes/pigs-1344.jpg'

import copperfield672webp from '../images/heroes/copperfield-co-672.webp'
import copperfield1344webp from '../images/heroes/copperfield-co-1344.webp'
import copperfield672jpg from '../images/heroes/copperfield-co-672.jpg'
import copperfield1344jpg from '../images/heroes/copperfield-co-1344.jpg'

import guyana672webp from '../images/heroes/guyana-skies-672.webp'
import guyana1344webp from '../images/heroes/guyana-skies-1344.webp'
import guyana672jpg from '../images/heroes/guyana-skies-672.jpg'
import guyana1344jpg from '../images/heroes/guyana-skies-1344.jpg'

// The title artwork at the head of each musical.
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
    webp: [pigs672webp, pigs1344webp],
    jpg: [pigs672jpg, pigs1344jpg],
    alt: 'Title artwork: an engraved black pig standing below the show’s name in red, above the words “the musical”.',
  },
  'copperfield-co': {
    webp: [copperfield672webp, copperfield1344webp],
    jpg: [copperfield672jpg, copperfield1344jpg],
    alt: 'Title artwork: silhouettes of a boy and a gentleman in a top hat standing either side of a Victorian London skyline with the dome of St Paul’s.',
  },
  'guyana-skies': {
    webp: [guyana672webp, guyana1344webp],
    jpg: [guyana672jpg, guyana1344jpg],
    alt: 'Title artwork: a man holding a suitcase looks out from a riverbank of palms and stilt houses towards the Empire Windrush and the Houses of Parliament.',
  },
}

// What the browser should assume it is drawing into before it has any layout.
// The content column is max-w-2xl (42rem) with 1rem of the page's own padding
// either side of it. Told the truth in both cases, because the alternative is
// the browser assuming the full viewport and fetching the 1344 for a phone.
const SIZES = '(min-width: 44rem) 672px, calc(100vw - 2rem)'

function MusicalHero({ musical, className = '' }) {
  const hero = HEROES[musical.slug]

  // A show whose artwork has not arrived keeps the dashed box that says what is
  // wanted, which is what all three of these had until it did.
  if (!hero) {
    return (
      <Placeholder
        label={musical.heroLabel}
        dims={musical.heroDims}
        aspect="aspect-video"
        className={className}
      />
    )
  }

  return (
    <picture className={`block ${className}`}>
      <source type="image/webp" srcSet={`${hero.webp[0]} 672w, ${hero.webp[1]} 1344w`} sizes={SIZES} />
      <img
        src={hero.jpg[0]}
        srcSet={`${hero.jpg[0]} 672w, ${hero.jpg[1]} 1344w`}
        sizes={SIZES}
        alt={hero.alt}
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
