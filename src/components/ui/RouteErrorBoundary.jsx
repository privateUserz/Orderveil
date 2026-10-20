import { Component } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RefreshCcw } from 'lucide-react'
import { isChunkLoadError } from '../../app/lazyPage.js'
import { Button, ButtonLink } from './Button.jsx'

function Fallback({ error }) {
  const { t } = useTranslation()
  const stale = isChunkLoadError(error)
  return (
    <section role="alert" className="container-ov flex min-h-[50vh] flex-col items-start justify-center py-20">
      <h1 className="text-2xl font-semibold tracking-tight">{stale ? t('errors.staleTitle') : t('errors.pageTitle')}</h1>
      <p className="mt-2 max-w-md text-muted">{stale ? t('errors.staleText') : t('errors.pageText')}</p>
      <div className="mt-6 flex gap-3">
        <Button variant="primary" onClick={() => window.location.reload()}>
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          {t('errors.reload')}
        </Button>
        <ButtonLink to="/">{t('notFound.home')}</ButtonLink>
      </div>
    </section>
  )
}

class Boundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('Route render failed', error, info?.componentStack)
  }
  render() {
    return this.state.error ? <Fallback error={this.state.error} /> : this.props.children
  }
}

/** Keeps header/footer alive when a page fails; resets when the route changes. */
export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation()
  return <Boundary key={pathname}>{children}</Boundary>
}
