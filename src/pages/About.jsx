import PagePhoto from '../components/PagePhoto'
import { about } from '../content/about'
import { usePageMeta } from '../usePageMeta'

// A caption in the same small-caps vocabulary as the snapshot tag and the
// download buttons, so a photograph set into the text reads as part of the page
// rather than as something pasted onto it.
// `width` is per-picture rather than shared because the two are different
// shapes: a floated figure taller than the paragraph beside it drops that
// paragraph's last line on its own underneath the picture.
function Figure({ name, caption, className, width = 'sm:w-56' }) {
  return (
    <figure className={`my-4 sm:my-1 ${width} ${className}`}>
      <PagePhoto name={name} />
      <figcaption className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
        {caption}
      </figcaption>
    </figure>
  )
}

function About() {
  usePageMeta({
    title: 'About',
    description:
      'Frank Kirwan on songwriting, on twice having musicals published by Warner Chappell, and on the work he is doing now.',
  })

  const [opening, theatre, projects] = about.paragraphs

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold">About</h1>

      {/* The pictures float only once there is a column wide enough to wrap
          text around them — below that they are full-width blocks in the order
          they are read, which is why each <figure> carries its own margin for
          the stacked case and a tighter one for the floated case.

          Now on the right against the opening, then on the left against the
          musicals — one picture per paragraph rather than two facing each other
          across the column, which leaves the paragraph between them starting in
          a two-word gutter. Each float also begins at the top of its own
          paragraph, so neither lands mid-sentence and strands a short line.

          The trailing pseudo-element clears both, so a picture cannot hang past
          the end of the text it belongs to. */}
      <div className="mt-6 text-sm leading-relaxed after:block after:clear-both after:content-['']">
        <Figure name="about-now" caption="Now" className="sm:float-right sm:ml-6" />
        <p>{opening}</p>

        <p className="mt-4">{theatre}</p>

        {/* Narrower than the portrait above it: this one is nearly square, so
            at the same width it stands taller than the paragraph beside it. */}
        <Figure
          name="about-then"
          caption="Then"
          className="sm:float-left sm:mr-6 sm:clear-both"
          width="sm:w-48"
        />
        <p className="mt-4">{projects}</p>
      </div>
    </div>
  )
}

export default About
