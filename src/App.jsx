import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Songs from './pages/Songs'
import Musicals from './pages/Musicals'
import About from './pages/About'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'

// Split out of the main bundle, and mounted outside <Layout> — it wants the
// full width and none of the site chrome. The split is the point: the admin
// carries an MP3 encoder, and no visitor should download that to read a bio.
const Admin = lazy(() => import('./pages/Admin'))

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="songs" element={<Songs />} />
        <Route path="musicals" element={<Musicals />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />

        {/* Everything else, inside the layout so an unknown address still has
            the site around it. Without this the router matched nothing and
            rendered nothing, and a typo was a blank white page. Last, because
            it matches anything. */}
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        path="admin"
        element={
          <Suspense fallback={<div className="p-8 text-sm">Loading…</div>}>
            <Admin />
          </Suspense>
        }
      />
    </Routes>
  )
}

export default App
