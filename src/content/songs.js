// The wider catalogue: everything that doesn't make the home page. Add as many
// entries as you like — /songs just maps over this list.
//
// Every field except `id` and `title` is optional:
//
//   id           unique string, also used as the playback slot key
//   title        song title
//   description  a paragraph about the song; omit to hide
//   audioSrc     path to a snippet in public/audio/. Omit for a links-only
//                entry — the player is skipped entirely
//   links        streaming links; omit or leave empty to hide the row
//
// TODO: the two entries below are examples showing the shape. Replace them
// with real songs (and delete this note).

export const songs = [
  {
    id: 'example-with-snippet',
    title: 'Example song with a snippet',
    description:
      'An optional paragraph about the song — where it came from, who played on it, what it is about. Delete this field entirely if a song does not need one.',
    audioSrc: null,
    links: [{ label: 'Spotify', href: '#' }],
  },
  {
    id: 'example-links-only',
    title: 'Example song, streaming links only',
    links: [{ label: 'Spotify', href: '#' }],
  },
]
