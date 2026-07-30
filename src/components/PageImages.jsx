import Placeholder from './Placeholder'

// The pictures belonging to a page.
//
// One of them sits at half width on a desktop and full width on a phone: a
// portrait photograph across the whole 42rem column is taller than the screen
// and pushes everything else off it. Two or more share the row.
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
    <div className={`mt-10 grid gap-4 ${images.length > 1 ? 'sm:grid-cols-2' : 'sm:max-w-xs'}`}>
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
