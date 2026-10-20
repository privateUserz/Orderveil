import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './app/i18n.js'
import './styles/index.css'
import App from './App.jsx'
import { reloadOnceForNewBuild } from './app/lazyPage.js'

// Vite emits this when a preloaded chunk of an old build is gone (site redeployed).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewBuild()) event.preventDefault()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
