import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../../app/i18n.js'

export default function LanguageSwitch({ className = '' }) {
  const { i18n, t } = useTranslation()
  return (
    <div className={`flex items-center text-[0.82rem] ${className}`} role="group" aria-label={t('nav.language')}>
      {LANGUAGES.map((l, i) => (
        <span key={l.code} className="flex items-center">
          {i > 0 && <span className="mx-2 h-3 w-px bg-line-strong" aria-hidden="true" />}
          <button
            type="button"
            lang={l.code}
            aria-pressed={i18n.language === l.code}
            onClick={() => i18n.changeLanguage(l.code)}
            className={`rounded px-1 py-0.5 transition-colors ${i18n.language === l.code ? 'text-ink' : 'text-faint hover:text-ink-2'}`}
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  )
}
