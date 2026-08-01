import PagePhoto from '../components/PagePhoto'
import { about } from '../content/about'
import { usePageMeta } from '../usePageMeta'

// A paragraph with a photograph beside it.
//
// Side by side rather than floated, which is the whole point: text wrapped
// around a float runs on underneath the picture once it passes the bottom of
// it, and a closing line stranded under a photograph is what this page looked
// like before. Two columns cannot do that — the text has its own column and
// stays in it however long it runs.
//
// `items-start` tops the picture level with the first line of the paragraph.
// Below the breakpoint there is no second column to sit in, so they stack in
// the order they are written; `side` only decides which way round they sit
// once there is room, and never changes the reading order.
//
// `stretch` also foots it level with the last line: `self-stretch` overrides
// `items-start` for that one child, so the frame takes the row's height — which
// is the paragraph's — and `object-cover` scales the photograph up to fill it,
// trimming the sides. A fixed larger width could not do this. The paragraph's
// height depends on how wide the picture leaves the column, so any width that
// happened to line up at one viewport would be short or long at the next; this
// lines up at every width, and the cost is a crop that varies with it.
function WithPhoto({ name, side = 'right', stretch = false, children }) {
  return (
    <div className="sm:flex sm:items-start sm:gap-6">
      <div className={`sm:flex-1 ${side === 'left' ? 'sm:order-2' : ''}`}>{children}</div>
      <PagePhoto
        name={name}
        className={`mt-4 sm:mt-0 sm:w-52 sm:shrink-0 ${stretch ? 'sm:self-stretch' : ''} ${side === 'left' ? 'sm:order-1' : ''}`}
        imgClassName={stretch ? 'sm:h-full sm:object-cover' : ''}
      />
    </div>
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

      {/* One picture to a paragraph, on alternating sides: the man today
          against what he writes today, and the photograph from the theatre
          years against the paragraph about them. The middle paragraph runs the
          full column, which is what keeps the two from facing each other
          across it. */}
      <div className="mt-6 space-y-4 text-sm leading-relaxed">
        <WithPhoto name="about-now" side="right">
          <p>{opening}</p>
        </WithPhoto>

        <p>{theatre}</p>

        <WithPhoto name="about-then" side="left" stretch>
          <p>{projects}</p>
        </WithPhoto>
      </div>
    </div>
  )
}

export default About
