// Every song on the site, in one list — this is what /songs renders.
//
// The singles and the musical snapshots are pulled in from releases.js and
// musicals.js rather than repeated here, so each audio file is named in exactly
// one place. To write about a song, fill in its `description` where the song is
// defined:
//
//   singles          → `description` in releases.js
//   snapshots        → `description` on the demo in musicals.js
//   everything else  → `description` in the `standalone` list below
//
// An empty description simply doesn't render.

import { releases } from './releases'
import { musicals } from './musicals'

// Songs that are neither a single nor a musical snapshot. Add as many as you
// like; every field except `id` and `title` is optional:
//
//   id           unique string, also used as the playback slot key
//   title        song title
//   description  a paragraph about the song
//   audioSrc     path to a file in public/audio/. Omit for a links-only entry
//                — the player is skipped entirely
//   links        streaming links; omit or leave empty to hide the row
const standalone = []

export const songs = [
  ...releases.map((release) => ({
    id: release.id,
    title: release.title,
    description: release.description,
    audioSrc: release.audioSrc,
    links: release.streamingLinks,
  })),

  ...musicals.flatMap((musical) =>
    musical.demos.map((demo) => ({
      id: demo.id,
      title: `${musical.title} — ${demo.title}`,
      description: demo.description,
      audioSrc: demo.src,
    })),
  ),

  ...standalone,
]
