import { useMemo } from 'react'
import MusicalSection from '../components/MusicalSection'
import { musicals } from '../content/musicals'
import { useSectionNav } from '../context/sectionNavContext'
import { ANCHOR } from '../rules'
import { usePageMeta } from '../usePageMeta'

function Musicals() {
  usePageMeta({
    title: 'Musicals',
    description:
      'Pigs, Copperfield & Co. and Guyana Skies. Scripts, scores and demos for two musicals previously published by Warner Chappell, and a third looking for a scriptwriter.',
  })

  // Handed to Layout, which pins it under the header while this page is on
  // screen. Memoised because the hook clears and re-sets whenever it changes,
  // and a fresh array on every render would mean every render.
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
