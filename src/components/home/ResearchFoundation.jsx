import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Check, Minus } from 'lucide-react'
import { Reveal, SectionHeader } from '../ui/Section.jsx'
import { ExternalLink } from '../ui/Button.jsx'
import { REFERENCES } from '../../content/references.js'

export default function ResearchFoundation() {
  const { t } = useTranslation()
  const relation = t('home.research.relation', { returnObjects: true })
  return (
    <section aria-labelledby="research-title" className="container-ov mt-20">
      <Reveal>
        <SectionHeader id="research-title" eyebrow={t('home.research.eyebrow')} title={t('home.research.title')} subtitle={t('home.research.subtitle')} />
      </Reveal>
      <div className="mt-8 grid gap-4 lg:grid-cols-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {REFERENCES.map((r, i) => (
            <Reveal key={r.id} delay={i * 0.06}>
              <ExternalLink href={r.url} className="panel group flex h-full flex-col p-5 transition-colors hover:border-line-strong">
                <div className="flex items-start justify-between gap-3">
                  <span className="eyebrow">{t(`references.${r.id}.kind`)}</span>
                  <ArrowUpRight className="h-4 w-4 text-faint transition-colors group-hover:text-ink" aria-hidden="true" />
                </div>
                <h3 className="mt-3 text-[1rem] font-medium leading-snug text-ink">{t(`references.${r.id}.title`)}</h3>
                <p className="mt-2 flex-1 text-[0.8rem] leading-relaxed text-muted">{t(`references.${r.id}.summary`)}</p>
                <span className="mt-4 truncate text-[0.7rem] text-faint">forum.bnbchain.org</span>
              </ExternalLink>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1} className="panel p-5 lg:col-span-5">
          <h3 className="text-[0.95rem] font-medium">{t('home.research.relationTitle')}</h3>
          <ul className="mt-4 space-y-3">
            {relation.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-[0.8rem] leading-relaxed">
                {item.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> : <Minus className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />}
                <span className="text-ink-2">{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-[0.74rem] leading-relaxed text-faint">{t('brand.disclaimer')}</p>
        </Reveal>
      </div>
    </section>
  )
}
