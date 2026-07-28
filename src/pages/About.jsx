import { about } from '../content/about'

function About() {
  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold">About</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed">
        {about.paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  )
}

export default About
