// Music currently renders inside Home via <MusicSection />. To lift it onto its
// own /music route later: create src/pages/Music.jsx rendering <MusicSection />,
// add the route in App.jsx, and drop the section from Home. No component or data
// changes needed — MusicSection owns its own heading and layout.

export const releases = [
  {
    id: 'release-1',
    title: 'Release title one',
    year: '2025',
    coverArt: '/images/releases/release-1.jpg',
    audioSrc: '/audio/releases/release-1.mp3',
    duration: '0:30',
    status: 'released',
    streamingLinks: [
      { label: 'Spotify', href: '#' },
      { label: 'Apple Music', href: '#' },
    ],
  },
  {
    id: 'release-2',
    title: 'Release title two',
    year: '2025',
    coverArt: '/images/releases/release-2.jpg',
    audioSrc: '/audio/releases/release-2.mp3',
    duration: '0:30',
    status: 'released',
    streamingLinks: [
      { label: 'Spotify', href: '#' },
      { label: 'Apple Music', href: '#' },
    ],
  },
  {
    id: 'release-3',
    title: 'Release title three',
    year: '2024',
    coverArt: '/images/releases/release-3.jpg',
    audioSrc: '/audio/releases/release-3.mp3',
    duration: '0:30',
    status: 'released',
    streamingLinks: [
      { label: 'Spotify', href: '#' },
      { label: 'Apple Music', href: '#' },
    ],
  },
  {
    id: 'release-4',
    title: 'Release title four',
    year: '2024',
    coverArt: '/images/releases/release-4.jpg',
    audioSrc: '/audio/releases/release-4.mp3',
    duration: '0:30',
    status: 'released',
    streamingLinks: [
      { label: 'Spotify', href: '#' },
      { label: 'Apple Music', href: '#' },
    ],
  },
  {
    id: 'release-5',
    title: 'Release title five',
    year: '2023',
    coverArt: '/images/releases/release-5.jpg',
    audioSrc: '/audio/releases/release-5.mp3',
    duration: '0:30',
    status: 'released',
    streamingLinks: [
      { label: 'Spotify', href: '#' },
      { label: 'Apple Music', href: '#' },
    ],
  },
  {
    id: 'release-6',
    title: 'Release title six',
    year: '2026',
    coverArt: '/images/releases/release-6.jpg',
    audioSrc: '/audio/releases/release-6.mp3',
    duration: '0:30',
    status: 'coming-soon',
    streamingLinks: [],
  },
  {
    id: 'release-7',
    title: 'Release title seven',
    year: '2026',
    coverArt: '/images/releases/release-7.jpg',
    audioSrc: '/audio/releases/release-7.mp3',
    duration: '0:30',
    status: 'coming-soon',
    streamingLinks: [],
  },
]
