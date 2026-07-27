import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Musicals from './pages/Musicals'
import About from './pages/About'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="musicals" element={<Musicals />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  )
}

export default App
