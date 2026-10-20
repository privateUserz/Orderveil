import { Suspense, useEffect } from 'react'
import { lazyPage } from './app/lazyPage.js'
import WalletProviders from './app/WalletProviders.jsx'
import { Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { SimulationProvider } from './app/SimulationContext.jsx'
import Layout from './components/layout/Layout.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import PageLoader from './components/ui/PageLoader.jsx'

const loaders = {
  technology: () => import('./pages/Technology.jsx'),
  playground: () => import('./pages/Playground.jsx'),
  network: () => import('./pages/Network.jsx'),
  docs: () => import('./pages/Docs.jsx'),
}
const Technology = lazyPage(loaders.technology)
const Playground = lazyPage(loaders.playground)
const Network = lazyPage(loaders.network)
const Docs = lazyPage(loaders.docs)

/** Warm the other routes once the first page is idle, so navigation doesn't flash a loader. */
function usePrefetchRoutes() {
  useEffect(() => {
    // not requestIdleCallback: the animated hero keeps the main thread busy enough to delay it for seconds
    const id = window.setTimeout(() => [Technology, Playground, Network, Docs].forEach((page) => page.preload()), 600)
    return () => window.clearTimeout(id)
  }, [])
}

export default function App({ initialParams }) {
  usePrefetchRoutes()
  return (
    <WalletProviders>
    <MotionConfig reducedMotion="user">
      <SimulationProvider initialParams={initialParams}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="technology" element={<Suspense fallback={<PageLoader />}><Technology /></Suspense>} />
            <Route path="playground" element={<Suspense fallback={<PageLoader />}><Playground /></Suspense>} />
            <Route path="network" element={<Suspense fallback={<PageLoader />}><Network /></Suspense>} />
            <Route path="docs" element={<Suspense fallback={<PageLoader />}><Docs /></Suspense>} />
            <Route path="docs/:section" element={<Suspense fallback={<PageLoader />}><Docs /></Suspense>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SimulationProvider>
    </MotionConfig>
    </WalletProviders>
  )
}
