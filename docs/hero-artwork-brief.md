# Brief: the musicals' hero artwork

What to ask for when the three images on `/musicals` are next made, and why the
current ones are being replaced. Hand this to whoever draws or generates them.

## Why they are being replaced

The first set were **title cards** — each one has the show's name set large
inside the picture. The page already gives the show its name, in the site's own
type, immediately below. So every show announced itself twice within a
centimetre, in two different typefaces.

Cropping the lettering out was tried and does not work as a treatment. The
largest text-free region in each is a completely different shape, because the
type is composed through each picture differently:

| Show | text-free region | aspect |
|---|---|---|
| Pigs | the pig and the two stars | 4.07 : 1 |
| Copperfield & Co. | the boy and the skyline | 1.46 : 1 |
| Guyana Skies | the man and the ship | 1.06 : 1 |

Three unrelated shapes, and the best Copperfield crop still catches the
descenders of "COPP" and a sliver of the "a" from "and". The type is not
sitting on top of these compositions, it *is* the composition.

## The one rule

**No lettering anywhere in the image.** Not the show's name, not a tagline, not
a ship's name, not a shop sign in the background. The site sets the titles.

This is also the fix for a real error in the current Guyana Skies picture: the
Windrush's hull reads **"EMPARE WINDRUSIS"**. It is legible at the size the site
serves, and on a Windrush-inspired show it is the one detail that has to be
right. Either leave the hull blank or spell it **Empire Windrush**.

## Format

- **16:9**, one per show.
- **At least 1400px wide.** The site draws them at 672px and serves a 1344px
  copy to high-density screens, and never upscales — so anything narrower than
  1400 arrives soft on a good display. Bigger is safe.
- PNG or JPEG, full quality. The site makes its own WebP and JPEG copies at two
  widths; do not pre-compress.
- No transparency needed, and no rounded corners or drop shadows — the site
  draws its own hairline border.

## How they have to sit on the page

The site is committed to paper, ink and one accent, and the artwork has to look
like it belongs on that paper rather than pasted onto it. The current set does
this well and it is the thing worth keeping.

```
paper      #fbf9f4     the page behind the image
ink        #221f1a     a warm near-black, not pure black
accent     #8a3b32     oxblood — the site's only colour, used sparingly
```

- A cream or warm off-white ground reads as continuous with the page. A picture
  that bleeds to its own edges is fine too, but a **cold white** ground will
  look like a hole cut in the paper.
- Warm, printed, slightly aged. Engraving, woodcut, letterpress, screen print,
  vintage travel poster — all right. Photographic realism and glossy digital
  rendering are not.
- Red, where wanted, should be the oxblood above rather than a bright red.

## What each one should show

Taken from what already works in the current set, minus the type.

**Pigs** — the engraved black pig standing on its patch of grass, on a cream
ground. The existing engraving is the strongest thing in the whole set; it wants
reproducing, not reinventing. Room around it rather than filling the frame.

**Copperfield & Co.** — the boy in silhouette, the Victorian London skyline with
the dome of St Paul's, and the gentleman in the top hat. All three in the same
frame, on cream. The current picture has them arranged around the lettering;
without it they can be composed as one scene.

**Guyana Skies** — the man with the suitcase seen from behind, the stilt houses
and palms of the riverbank, the ship, and Westminster in the distance. The
sweep from Guyana to London in one image, which the current one does well. **The
hull carries no name** — see above.

## What happens when they arrive

Three files, any filenames. Then:

```
node scripts/make-hero-images.mjs \
  pigs=<file> copperfield-co=<file> guyana-skies=<file>
```

That writes WebP and JPEG at 672 and 1344 into `src/images/heroes/`, named from
the slug, which is what `src/components/MusicalHero.jsx` already imports. No
component changes, no new imports — replacing artwork is the script plus a
commit.

Two things to change at the same time, both held back until there is artwork
without type in it:

- **Move the picture above the heading.** It currently sits after the title, the
  status line and the teaser, so it arrives once the show has already been
  named. Without lettering it can open the section as a plate, with the site's
  heading under it as its caption.
- **Drop `heroLabel` and `heroDims` from `src/content/musicals.js`** if the
  dashed placeholder is retired with them, or leave them for a fourth show that
  has no artwork yet. `MusicalHero` falls back to the placeholder for any show
  missing from its `HEROES` map, which is what makes that safe either way.
