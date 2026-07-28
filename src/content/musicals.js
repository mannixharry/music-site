// The three musicals themselves — long-lived editorial copy that changes about
// once a year, so it stays in the repo and is edited here.
//
// Their demo tracks are NOT here: those are songs, they live in the catalogue
// alongside everything else, and MusicalSection pulls them by `slug`. Adding a
// demo is done from /admin, not by editing this file.

export const musicals = [
  {
    slug: 'pigs',
    title: 'Pigs',
    status: 'Previously published by Warner Chappell',
    teaser: 'One-line description of Pigs goes here.',
    heroLabel: 'Pigs — hero image',
    heroDims: '1600×900px',
    resumeLabel: 'Resume',
    resume: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Praesent euismod, nisi eu consectetur consectetur, nisl nunc consectetur nisi, euismod consectetur nisi nunc euismod.',
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    ],
    downloads: [{ label: 'Script (PDF)' }],
    needsScriptwriter: false,
  },
  {
    slug: 'copperfield-co',
    title: 'Copperfield & Co.',
    status: 'Previously published by Warner Chappell',
    teaser: 'One-line description of Copperfield & Co. goes here.',
    heroLabel: 'Copperfield & Co. — hero image',
    heroDims: '1600×900px',
    resumeLabel: 'Resume',
    resume: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Praesent euismod, nisi eu consectetur consectetur, nisl nunc consectetur nisi, euismod consectetur nisi nunc euismod.',
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    ],
    // A download with no `href` still renders as a placeholder — the script
    // hasn't been supplied yet. `download: true` forces a save rather than
    // letting the browser try to render the file.
    downloads: [
      { label: 'Script (PDF)' },
      { label: 'Score (PDF)', href: '/scores/frank-kirwan-copperfield-and-co.pdf' },
      {
        label: 'Sibelius score',
        href: '/scores/frank-kirwan-copperfield-and-co.sib',
        download: true,
      },
    ],
    needsScriptwriter: false,
  },
  {
    slug: 'guyana-skies',
    title: 'Guyana Skies',
    status: 'Windrush-inspired — in development',
    teaser: 'A Windrush-inspired show charting one man’s journey from Guyana to the UK.',
    heroLabel: 'Guyana Skies — hero image',
    heroDims: '1600×900px',
    resumeLabel: 'Prospective synopsis',
    resume: [
      'An on-going project in the musical field, a Windrush-inspired show charting the development of the principal character from his early days in Guyana, through his departure after independence, to his early struggles — eventually overcome — on arrival in the U.K.',
    ],
    downloads: [],
    needsScriptwriter: true,
    contactHref: 'mailto:frank@example.com',
  },
]
