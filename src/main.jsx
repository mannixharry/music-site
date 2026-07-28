import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ContentProvider from './components/ContentProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Above the router: the catalogue is fetched once for the whole session,
        not per page, and the eventual /admin route sits outside Layout. */}
    <ContentProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ContentProvider>
  </StrictMode>,
)