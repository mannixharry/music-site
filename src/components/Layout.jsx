import { Outlet } from 'react-router-dom'
import AdminBar from './AdminBar'
import BackToTop from './BackToTop'
import Header from './Header'
import Footer from './Footer'
import NowPlaying from './NowPlaying'
import PlaybackProvider from './PlaybackProvider'
import RefreshOnNavigate from './RefreshOnNavigate'
import ScrollToTop from './ScrollToTop'
import { ANCHOR } from '../rules'

function Layout() {
  return (
    // The provider sits above the router outlet so the "one snippet at a time"
    // rule holds across every page that embeds a player.
    <PlaybackProvider>
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

        {/* Header and now-playing pinned as one unit. Sticky, because the pages
            this serves are long — /songs runs to a few dozen entries and each
            musical carries a synopsis — and reaching another page used to mean
            scrolling back to the top first. */}
        <div className="sticky top-0 z-20">
          <Header />
          <NowPlaying />
        </div>

        {/* tabIndex so the skip link actually moves focus here rather than only
            scrolling; scroll-mt so the sticky header does not cover the top of
            the page it lands on. */}
        <main
          id="main"
          tabIndex={-1}
          className={`mx-auto w-full max-w-2xl flex-1 px-4 focus:outline-none ${ANCHOR}`}
        >
          <Outlet />
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
