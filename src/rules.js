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

// Every section heading on the public site. The home page had two at one size
// and a third at another, on the same screen.
export const HEADING = 'text-xl font-bold'
