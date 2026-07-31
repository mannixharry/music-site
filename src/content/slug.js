// The address a song gets of its own.
//
// Its own module, with no imports, because two things need it: the site, which
// renders the links, and scripts/build-sitemap.mjs, which lists them. A copy in
// each would be a copy to keep in step.
//
// Built from the words rather than the id, so a link Frank sends somebody says
// what it is — /songs/pigs-animals-rule, not a database key. A demo is prefixed
// with its musical because that is what makes it unique: three songs are called
// "Musical snapshot".
//
// Renaming a song changes its address, and any link already shared with the old
// one stops resolving. The route accepts a song's id as well for that reason,
// so there is always one address that cannot break.
export function songSlug(row) {
  const words =
    row.kind === 'demo' && row.musicalSlug ? `${row.musicalSlug} ${row.title}` : row.title

  return words
    .toLowerCase()
    .normalize('NFD')
    // Strip the accents, not the letters: "Chérie" becomes "cherie", not "chrie".
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
