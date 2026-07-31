import { useMemo } from 'react'
import MusicalSection from '../components/MusicalSection'
import { musicals } from '../content/musicals'
import { useSectionNav } from '../context/sectionNavContext'
import { ANCHOR } from '../rules'
import { usePageTitle } from '../usePageTitle'

function Musicals() {
  usePageTitle('Musicals')

  // Handed to Layout, which pins it under the header for as long as this page
  // is on screen. It used to be a row drawn here, at the top, where it stopped
  // being reachable the moment you started reading.
  //
  // Memoised because the hook clears and re-sets whenever this changes, and a
  // fresh array on every render would mean every render.
  const sections = useMemo(
    () => musicals.map((musical) => ({ slug: musical.slug, label: musical.title })),
    [],
  )

  useSectionNav(sections)

  return (
    <div className={`${ANCHOR} py-8`}>
      <h1 className="text-4xl font-bold">Musicals</h1>
      <p className="mt-2 text-sm leading-relaxed">
        Two of these were published by Warner Chappell and are no longer tied to it, so their
        scripts, scores and demos are all here. The third is looking for a scriptwriter.
      </p>

      {musicals.map((musical) => (
        <MusicalSection key={musical.slug} musical={musical} />
      ))}
    </div>
  )
}

export default Musicals
