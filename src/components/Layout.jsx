import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import AdminBar from './AdminBar'
import BackToTop from './BackToTop'
import Header from './Header'
import Footer from './Footer'
import NowPlaying from './NowPlaying'
import PlaybackProvider from './PlaybackProvider'
import RefreshOnNavigate from './RefreshOnNavigate'
import ScrollToTop from './ScrollToTop'
import SectionNav from './SectionNav'
import { SectionNavContext } from '../context/sectionNavContext'
import { ANCHOR, COLUMN } from '../rules'

function Layout() {
  // Set by whichever page has sections worth listing; null on the ones that do
  // not, which is most of them. The setter from useState is already stable, so
  // it can go straight into the context without a useMemo around it.
  const [sections, setSections] = useState(null)

  // How tall the pinned block currently is, published as --chrome so a heading
  // jumped to by a hash link lands below it rather than under it.
  //
  // Measured rather than written down: every piece of that block comes and goes
  // independently — the strip when something plays, the section links per page,
  // the header itself when the phone menu opens — so the only number right in
  // all of those is the one taken from the block.
  const chrome = useRef(null)

  useEffect(() => {
    const node = chrome.current
    if (!node || typeof ResizeObserver === 'undefined') return

    const publish = () =>
      document.documentElement.style.setProperty('--chrome', `${node.offsetHeight}px`)

    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(node)

    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--chrome')
    }
  }, [])

  return (
    // The provider sits above the router outlet so the "one snippet at a time"
    // rule holds across every page that embeds a player.
    <PlaybackProvider remember>
      <ScrollToTop />
      <RefreshOnNavigate />

      <div className="flex min-h-screen flex-col">
        {/* Hidden until it has focus, which is the whole design: the first tab
            stop on every page is a way past a header that is otherwise five
            links to tab through before reaching anything. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:border focus:border-gray-500 focus:bg-white focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to the content
        </a>

        <AdminBar />

        {/* Header, now-playing and the page's own section links pinned as one
            unit, because the pages this serves are long: /songs runs to a few
            dozen entries and each musical carries a synopsis.

            One block rather than three sticky elements — each after the first
            would need to know the height of the ones above it, and the strip is
            only there some of the time. */}
        <div ref={chrome} className="sticky top-0 z-20">
          <Header />
          <NowPlaying />
          {sections && <SectionNav items={sections} />}
        </div>

        {/* tabIndex so the skip link actually moves focus here rather than only
            scrolling; scroll-mt so the sticky header does not cover the top of
            the page it lands on. */}
        <main
          id="main"
          tabIndex={-1}
          className={`mx-auto w-full max-w-2xl flex-1 focus:outline-none ${COLUMN} ${ANCHOR}`}
        >
          <SectionNavContext.Provider value={setSections}>
            <Outlet />
          </SectionNavContext.Provider>
        </main>

        <Footer />

        {/* Last in the document so it is the last thing tabbed to, not
            something between the content and the footer links. It shows itself
            only once there is somewhere to go back to. */}
        <BackToTop />
      </div>
    </PlaybackProvider>
  )
}

export default Layout
