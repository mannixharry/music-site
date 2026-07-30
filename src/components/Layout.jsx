import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import PlaybackProvider from './PlaybackProvider'
import ScrollToTop from './ScrollToTop'

function Layout() {
  return (
    // The provider sits above the router outlet so the "one snippet at a time"
    // rule holds across every page that embeds a player.
    <PlaybackProvider>
      <ScrollToTop />

      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="mx-auto w-full max-w-2xl flex-1 px-4">
          <Outlet />
        </main>

        <Footer />
      </div>
    </PlaybackProvider>
  )
}

export default Layout
