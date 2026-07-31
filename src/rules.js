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
export const LIST_ITEM = 'py-6'

// Side padding for the two blocks that run the length of the page — the content
// and the footer — with a wider right-hand lane on small screens.
//
// The lane is for the back-to-top control, which is pinned to the bottom-right
// corner of the window. On a desktop the column is 42rem in the middle of a
// wide window and the corner is empty margin, so nothing is ever underneath it.
// On a phone the column runs edge to edge and the control sat on top of the
// content — over a song's length, most visibly.
//
// Reserved at every scroll position rather than only while the control is
// showing: making it conditional would slide the whole page sideways as you
// scrolled past the first screen, which is a worse thing to look at than a
// slightly narrower column.
//
// Both blocks, because the control floats over the footer too once you reach
// the end of a page.
export const COLUMN = 'pl-4 pr-16 sm:pr-4'

// Every section heading on the public site. The home page had two at one size
// and a third at another, on the same screen.
export const HEADING = 'text-xl font-bold'

// How far an in-page anchor holds off the top, so a hash jump does not land
// with its heading under the sticky header.
//
// This was `scroll-mt-28`, a fixed 7rem covering the header and the now-playing
// strip — too much whenever nothing was playing, and not enough at all once a
// page could also pin a row of section links. It is now whatever the pinned
// block actually measures: Layout publishes that as --chrome and the class
// below reads it. Defined in index.css because no Tailwind utility takes a
// custom property without an arbitrary value, which this project does not use.
export const ANCHOR = 'clears-chrome'
