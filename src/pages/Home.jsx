import { Link } from 'react-router-dom'
import MusicSection from '../components/MusicSection'
import { profile } from '../content/profile'
import { musicals } from '../content/musicals'
import { instagramUrl } from '../content/contact'

function Home() {
  return (
    <div className="py-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-center">
        <img
          src="/images/frank-kirwan.jpg"
          alt="Frank Kirwan with his guitar"
          width={1000}
          height={1250}
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
          Two of Frank&apos;s musicals were previously published by Warner Chappell.
        </p>
        <ul className="mt-4 space-y-1 text-sm">
          {musicals.map((musical) => (
            <li key={musical.slug}>
              <span className="font-bold">{musical.title}</span> &mdash; {musical.teaser}
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
          <a href={instagramUrl} className="underline" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <Link to="/contact" className="underline">
            Contact
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home
