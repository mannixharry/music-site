import PageImages from '../components/PageImages'
import { about, aboutImages } from '../content/about'
import { usePageMeta } from '../usePageMeta'

function About() {
  usePageMeta({
    title: 'About',
    description:
      'Frank Kirwan on songwriting, on twice having musicals published by Warner Chappell, and on the work he is doing now.',
  })

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold">About</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed">
        {about.paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <PageImages images={aboutImages} />
    </div>
  )
}

export default About
