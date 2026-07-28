// Single source of truth for how to reach Frank — used by the contact page,
// the footer, and the "Elsewhere" block on the home page. Update it here and
// every one of those follows.
//
// TODO: swap in the real address and handle. `instagramHandle` is the part
// after the @; the URL is built from it.

export const contact = {
  email: 'frank@example.com',
  instagramHandle: 'frankkirwan',

  intro: 'Email is the surest way to reach me.',
}

export const instagramUrl = `https://instagram.com/${contact.instagramHandle}`
export const mailtoUrl = `mailto:${contact.email}`
