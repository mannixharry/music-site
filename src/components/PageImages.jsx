import Placeholder from './Placeholder'

// A row of pictures belonging to a page, two up on anything wider than a phone.
//
// A slot whose `src` is still null draws a placeholder rather than vanishing,
// which is the opposite of what ReleaseItem does with a missing cover — and
// deliberately so. There, art arrives per song and an empty box is noise on a
// page full of them; here the slots are fixed, few, and waiting on one specific
// photograph, so holding the space is what keeps the page from reflowing when
// the file finally lands.
//
// The aspect ratio is declared per slot and applied to the image as well as the
// placeholder, so swapping one for the other does not move anything below it.
function PageImages({ images }) {
  if (images.length === 0) return null

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {images.map((image) =>
        image.src ? (
          <img
            key={image.label}
            src={image.src}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            className={`w-full border border-gray-300 object-cover ${image.aspect}`}
          />
        ) : (
          <Placeholder
            key={image.label}
            label={image.label}
            dims={image.dims}
            aspect={image.aspect}
          />
        ),
      )}
    </div>
  )
}

export default PageImages
