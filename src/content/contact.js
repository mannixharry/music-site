// Single source of truth for how to reach Frank — used by the contact page,
// the footer, and the "Elsewhere" block on the home page. Update it here and
// every one of those follows.
//
// TODO: confirm the Instagram handle. It is the part after the @; the URL is
// built from it, so a wrong one is a link to someone else's account.

export const contact = {
  email: 'frank@frankkirwan.com',
  instagramHandle: 'frankkirwan',

  intro: 'Email is the surest way to reach me.',
}

export const instagramUrl = `https://instagram.com/${contact.instagramHandle}`
export const mailtoUrl = `mailto:${contact.email}`

// Two pictures for the foot of the Contact page — see aboutImages in
// src/content/about.js, which works the same way. Set `src` to a path under
// public/ once the file is in public/images.
export const contactImages = [
  {
    src: null,
    alt: 'Frank Kirwan with his guitar',
    label: 'Guitar shot',
    dims: '1000×1250px',
    aspect: 'aspect-[4/5]',
  },
]
