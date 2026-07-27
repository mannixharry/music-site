import { Link } from 'react-router-dom'
import Placeholder from '../components/Placeholder'
import MusicSection from '../components/MusicSection'
import { profile } from '../content/profile'
import { musicals } from '../content/musicals'

function Home() {
  return (
    <div className="py-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-center">
        <Placeholder
          label="Artist photo"
          dims="1000×1250px"
          aspect="aspect-[4/5]"
          className="w-full md:w-1/2"
        />
        <div>
          <h1 className="text-4xl font-bold">{profile.name}</h1>
          <p className="mt-2 text-lg">{profile.descriptor}</p>
        </div>
      </section>

      <section className="mt-10 space-y-3 text-sm leading-relaxed">
        {profile.paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </section>

      <div className="mt-12">
        <MusicSection />
      </div>

      <section className="mt-16">
        <h2 className="text-xl font-bold">Musicals</h2>
        <p className="mt-2 text-sm">
          Two of Frank&apos;s musicals have been published by Warner Chappell.
        </p>
        <ul className="mt-4 space-y-1 text-sm">
          {musicals.map((musical) => (
            <li key={musical.slug}>
              <span className="font-bold">{musical.title}</span> ({musical.year}) &mdash;{' '}
              {musical.teaser}
            </li>
          ))}
        </ul>
        <Link to="/musicals" className="mt-3 inline-block text-sm underline">
          Explore the musicals
        </Link>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-bold">Elsewhere</h2>
        <div className="mt-3 flex gap-4 text-sm">
          {profile.socialLinks.map((link) => (
            <a key={link.label} href={link.href} className="underline">
              {link.label}
            </a>
          ))}
          <span>More links soon</span>
        </div>
      </section>
    </div>
  )
}

export default Home
