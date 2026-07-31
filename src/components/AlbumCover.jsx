import Placeholder from './Placeholder'

// A record's artwork, at the head of its songs.
//
// Square, because that is what a sleeve is, and small: this sits beside a
// heading rather than above the page, and an album on the songs list is a label
// for what follows rather than the thing itself.
//
// A placeholder when there is none, unlike a song's cover, which simply does
// not render. The difference is that a song with no art is one row among dozens
// and an empty box beside each would be noise, while an album is a heading —
// there are a handful of them, the space is reserved either way by the heading
// beside it, and holding it stops the page reflowing when the picture arrives.
function AlbumCover({ album }) {
  if (!album.coverSrc) {
    return (
      <Placeholder
        label={album.title}
        aspect="aspect-square"
        className="w-20 shrink-0 sm:w-24"
      />
    )
  }

  return (
    <img
      src={album.coverSrc}
      // Named for what it is rather than described: a screen reader reaching
      // this has just heard the album's title from the heading beside it, and
      // "Pigs, cover art for Pigs" is the same word twice.
      alt={`${album.title} cover art`}
      loading="lazy"
      decoding="async"
      className="aspect-square w-20 shrink-0 border border-gray-300 object-cover sm:w-24"
    />
  )
}

export default AlbumCover
