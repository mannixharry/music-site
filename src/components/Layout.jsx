import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import PlaybackProvider from './PlaybackProvider'
import RefreshOnNavigate from './RefreshOnNavigate'
import ScrollToTop from './ScrollToTop'

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

        <Header />

        {/* tabIndex so the skip link actually moves focus here rather than only
            scrolling; scroll-mt so the sticky header does not cover the top of
            the page it lands on. */}
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-2xl flex-1 scroll-mt-20 px-4 focus:outline-none"
        >
          <Outlet />
        </main>

        <Footer />
      </div>
    </PlaybackProvider>
  )
}

export default Layout
