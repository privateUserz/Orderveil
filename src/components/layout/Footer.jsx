import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Eye, Fingerprint, Layers, BookOpen } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import { ExternalLink } from '../ui/Button.jsx'
import { REFERENCES } from '../../content/references.js'
import { NAV } from './Header.jsx'
import XIcon from '../ui/XIcon.jsx'
import { X_HANDLE, X_URL } from '../../content/social.js'

const pillars = [
  { key: 'privacy', icon: Eye },
  { key: 'deterministic', icon: Fingerprint },
  { key: 'composable', icon: Layers },
  { key: 'research', icon: BookOpen },
]

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-ov grid gap-y-6 border-b border-line py-6 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map(({ key, icon: Icon }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <div className="text-[0.82rem] text-ink-2">{t(`footer.pillars.${key}.title`)}</div>
              <div className="text-[0.72rem] text-faint">{t(`footer.pillars.${key}.text`)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="container-ov grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo />
          <p className="mt-4 max-w-xs text-[0.85rem] leading-relaxed text-muted">{t('brand.taglineLong')}</p>
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-[10px] border border-line px-3 py-2 text-[0.82rem] text-ink-2 transition-colors hover:border-line-strong hover:text-ink">
            <XIcon className="h-3.5 w-3.5" />
            {t('social.followOn')} <span className="text-muted">@{X_HANDLE}</span>
          </a>
          <p className="mt-4 text-[0.75rem] text-faint">{t('footer.tokenNote')}</p>
        </div>
        <nav aria-label={t('footer.navigation')} className="md:col-span-2">
          <h3 className="eyebrow mb-3">{t('footer.navigation')}</h3>
          <ul className="space-y-2 text-[0.85rem]">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="text-ink-2 hover:text-ink">
                  {t(`nav.${n.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-3">
          <h3 className="eyebrow mb-3">{t('footer.documentation')}</h3>
          <ul className="space-y-2 text-[0.85rem]">
            {['introduction', 'simulation-model', 'ordering-rules', 'limitations'].map((s) => (
              <li key={s}>
                <Link to={`/docs/${s}`} className="text-ink-2 hover:text-ink">
                  {t(`docs.nav.${s}`)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[0.75rem] text-faint">{t('footer.sourceNote')}</p>
        </div>
        <div className="md:col-span-3">
          <h3 className="eyebrow mb-3">{t('footer.references')}</h3>
          <ul className="space-y-2 text-[0.85rem]">
            {REFERENCES.map((r) => (
              <li key={r.id}>
                <ExternalLink href={r.url} className="group inline-flex items-start gap-1 text-ink-2 hover:text-ink">
                  <span>{t(`references.${r.id}.short`)}</span>
                  <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint group-hover:text-ink-2" aria-hidden="true" />
                </ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-ov flex flex-col gap-3 py-6 text-[0.75rem] leading-relaxed text-faint md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl">{t('brand.disclaimer')}</p>
          <p className="shrink-0">© {new Date().getFullYear()} Orderveil · {t('footer.simulationOnly')}</p>
        </div>
      </div>
    </footer>
  )
}
