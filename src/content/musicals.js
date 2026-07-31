// The three musicals themselves — long-lived editorial copy that changes about
// once a year, so it stays in the repo and is edited here.
//
// Their demo tracks are NOT here: those are songs, they live in the catalogue
// alongside everything else, and MusicalSection pulls them by `slug`. Adding a
// demo is done from /admin, not by editing this file.

import { mailtoUrl } from './contact'

export const musicals = [
  {
    slug: 'pigs',
    title: 'Pigs',
    status: 'Previously published by Warner Chappell',
    teaser:
      'The pigs eat genetically modified food which enhances their brains and they plot to take over the farm and change the world for the better.',
    heroLabel: 'Pigs — hero image',
    heroDims: '1600×900px',
    resumeLabel: 'Resume',
    resume: [
      'As Cerebrus, our narrator tells us, “it was an ordinary pig farm until one day a group of scientists decided to start an experiment that would have consequences beyond their very dreams, or, perhaps, their very nightmares.” Farmer Giles is a rough, vindictive bully who takes easy money in return for letting the said scientists experiment with his pigs’ hormones. The pigs gradually come to realize that their brains, in some cases, are becoming more developed than those of the humans who have controlled them for so long. Unfortunately, in other cases, the effects of the experiment have been more unpredictable, with pigs who think they’re cows and pigs who think they’re sheep, giving much opportunity for humour.',
      'The two principal pigs, Cedric and Frederick, work together to galvanize the others into action in order to take over the farm from Giles. They are aided and abetted by Giles’ two bulldogs, Bazza and Gazza, a couple of cockneys who think they know it all and have also eaten contaminated food. While much of the action is comic, Cerebrus eases the musical into the area of ecological comment by his continuous interventions and dark threats to mankind. These threats are realized in a dream sequence when, in Cedric’s nightmare, all the pigs who in the play are pleasant and good-humoured, turn into a nasty bunch who threaten to slaughter the whole of mankind. In this sequence the “Pig sheep” behave like daleks, and the pigs mirror a Hitler like regime in their vow to destroy all that is human or all that is different from their established norms.',
      'After the dream sequence Cedric vows to make the pigs’ revolution positive and as peaceful as possible, and, via his negotiations with Mr Trustworthy, his trusty human solicitor, he prepares the grounds for a successful seizure of the farm, with much fun to be had in the ultimate demise of the evil Farmer Giles. The musical begins with a newscast about the foot and mouth outbreak and subsequent slaughtering of farm animals, and finishes with a sobering comment from Cerebrus about the fate of mankind. In between we have much fun, but it is fun that comes with the message that man must take more care with his environment and learn that the benefits of life are to be shared by all in a better and more equal world.',
      'Musically “Pigs” is a compendium of styles, with rock ‘n’ roll nestling alongside music inspired by, amongst many others, Sousa, Gilbert and Sullivan, Cockney music hall and American bluegrass. For children, in particular, it is an introduction to the many facets of musical appreciation.',
    ],
    downloads: [{ label: 'Script (PDF)', href: '/scripts/frank-kirwan-pigs-script.pdf' }],
    needsScriptwriter: false,
  },
  {
    slug: 'copperfield-co',
    title: 'Copperfield & Co.',
    status: 'Previously published by Warner Chappell',
    teaser:
      'Loosely based on Dickens’ “David Copperfield”, with Mr Micawber and Uriah Heep having prominent roles. A modern take on a classic novel.',
    heroLabel: 'Copperfield & Co. — hero image',
    heroDims: '1600×900px',
    resumeLabel: 'Synopsis',
    // One paragraph in Frank's document, and left as one here.
    resume: [
      '“Copperfield and Co.” is a quick paced two hour musical based loosely on Dickens’ “David Copperfield” and following the path of David from his early, troubled childhood through to the tribulations of adulthood, where we also chart the villainous path of Uriah Heep. In the course of this journey we encounter many classic Dickens characters. The bullying Murdstones haunt David’s early life, sending him first to the fearsome Mr Creakle’s school and then to their bottle factory, from where he lodges with the inimitable Micawber family. From them, he passes into the care of the eccentric Aunt Betsy and Mr Dick, who chase away the returning Murdstones, to the audience’s great delight. In adulthood, David then comes under the tutelage of Mr Wickfield, who employs the “greasy, oily rogue” Uriah. In the second act, we see Uriah, via much interaction with the audience, wielding more and more power, before his ultimate demise. Mr Micawber, employed by Uriah, also becomes increasingly involved in the drama and collaborates with David and Mr Wickfield to bring about Uriah’s downfall. David, in the meanwhile, suffers the loss of his wife, Dora, through illness, but in a popular denouement gains the love of Agnes Wickfield. Uriah, as the show comes to a close, repents in song for his evil ways. “Copperfield and Co.” is narrated in old age by David Copperfield and, unusually, a now benevolent Uriah Heep.',
    ],
    // A download with no `href` still renders as a placeholder, for anything not
    // supplied yet. `download: true` forces a save rather than letting the
    // browser try to render the file.
    downloads: [
      { label: 'Script (PDF)', href: '/scripts/frank-kirwan-copperfield-and-co-script.pdf' },
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
    // Not written out again here: a second copy of a fact is a second thing to
    // remember, and contact.js is the one place it lives.
    contactHref: mailtoUrl,
  },
]
