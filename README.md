# music-site

The website of Frank Kirwan — singer-songwriter, musician and composer of three
musicals. It is live at [frankkirwan.com](https://frankkirwan.com).

Frank is a real musician, and this is his real site: a catalogue of his songs
with a player, the three musicals with their synopses, scripts and scores, and
a private admin page where he adds songs, uploads recordings and artwork, and
publishes previews of longer tracks — all without a developer in the loop.

## How it was made

The code was written with AI, using Claude Code. The architecture, the product
decisions and the review were mine: what the site is for, how it is hosted,
what Frank needs to be able to do himself, what the admin must and must not
allow, and which of the AI's suggestions were kept. `CLAUDE.md` is the standing
brief the AI works from, and it records the decisions and the reasons behind
them in more detail than a README should.

## Running it

It is a small React site on Cloudflare. `CLAUDE.md` has the commands, and
`docs/cloudflare-setup.md` is the runbook for the hosting side. Everything
needed to run it locally is in the repo; nothing that could grant access to
the live site is.

## Rights

The code is here to be read. The songs, recordings, scripts, scores and
artwork are Frank Kirwan's and are not licensed for reuse.
