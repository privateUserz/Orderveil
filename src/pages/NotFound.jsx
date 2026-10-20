import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../components/ui/Button.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function NotFound() {
  const { t } = useTranslation()
  usePageMeta('notFound')
  return (
    <section className="container-ov flex min-h-[60vh] flex-col items-start justify-center py-24">
      <span className="hash text-faint">404 · {t('notFound.code')}</span>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">{t('notFound.title')}</h1>
      <p className="mt-3 max-w-md text-muted">{t('notFound.text')}</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/" variant="primary">
          {t('notFound.home')}
        </ButtonLink>
        <ButtonLink to="/playground">{t('nav.playground')}</ButtonLink>
      </div>
    </section>
  )
}
