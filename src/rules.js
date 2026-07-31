// Where the grey lines go, in one place, because they had drifted into four
// different treatments: songs drew a rule above themselves (so the first one in
// a group put a line directly under its own heading), the musicals page stacked
// an <hr> on top of padding that was already there, and the home page separated
// its sections with nothing at all.
//
// Two weights, and the difference carries the hierarchy:
//
//   SECTION  gray-300, between the major blocks of a page
//   LIST     gray-200, between repeated items inside one of them
//
// `divide-y` rather than a border on each item, deliberately: it draws lines
// *between* children and never before the first or after the last, which is the
// rule that kept being broken by hand.

export const SECTION = 'mt-12 border-t border-gray-300 pt-8'

// For the first section on a page that opens with a row of quick links. That
// row already draws a rule, so the full SECTION margin left two lines with an
// awkward stretch of nothing between them.
export const SECTION_FIRST = 'mt-5 border-t border-gray-300 pt-6'

// Which is also why the quick-links rows on /songs and /musicals carry only a
// top rule: the first section's own rule closes them. A border on both sides
// left two lines with an empty band between.

export const LIST = 'divide-y divide-gray-200'

// `last:pb-0` is the difference between a gap and a gap plus nothing. `divide-y`
// draws lines between items, so the padding under the final one separates it
// from no line at all — and then the section's own margin is added on top,
// which is how the space between the last song on a page and the next heading
// came out half as big again as the space anywhere else.
export const LIST_ITEM = 'py-6 last:pb-0'

// The "go deeper" link that closes a section — "Hear more songs", "Explore the
// musicals". One distance, because they are one thing: these were written at
// two different margins, which is exactly the kind of difference that reads as
// carelessness without being noticeable enough to name.
export const SECTION_LINK = 'mt-6 inline-block text-sm underline'

// Side padding for the two blocks that run the length of the page — the content
// and the footer. Even on both sides at every width.
//
// It used to carry a wider right-hand lane on small screens, to keep the
// floating back-to-top control off the content. That control is gone — the
// pinned header and section links are the way around a long page — so the lane
// went with it rather than being left as space reserved for nothing.
export const COLUMN = 'px-4'

// Every section heading on the public site. The home page had two at one size
// and a third at another, on the same screen.
export const HEADING = 'text-xl font-bold'

// How far an in-page anchor holds off the top, so a hash jump does not land
// with its heading under the pinned header.
//
// Whatever that block actually measures: Layout publishes it as --chrome and
// the class reads it. Defined in index.css because no Tailwind utility takes a
// custom property without an arbitrary value, which this project does not use.
export const ANCHOR = 'clears-chrome'
