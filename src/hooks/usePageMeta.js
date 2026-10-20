import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/** Sets document title + description per route and language (static hosting friendly). */
export function usePageMeta(page) {
  const { t, i18n } = useTranslation()
  useEffect(() => {
    const title = t(`meta.${page}.title`)
    document.title = page === 'home' ? title : `${title} · Orderveil`
    const desc = t(`meta.${page}.description`, { defaultValue: t('meta.home.description') })
    let el = document.querySelector('meta[name="description"]')
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', 'description')
      document.head.appendChild(el)
    }
    el.setAttribute('content', desc)
  }, [page, t, i18n.language])
}
