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
  {
    src: null,
    alt: 'Frank Kirwan playing live',
    label: 'Live shot',
    dims: '1000×1250px',
    aspect: 'aspect-[4/5]',
  },
]
