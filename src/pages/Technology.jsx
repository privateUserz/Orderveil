import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, ArrowRight } from 'lucide-react'
import { Reveal } from '../components/ui/Section.jsx'
import { SimBadge, StatusPill } from '../components/ui/Badges.jsx'
import { ExternalLink } from '../components/ui/Button.jsx'
import { ArchitectureDiagram, TickDiagram } from '../components/docs/Diagrams.jsx'
import { TEE_URL, ABOUT_URL, SOURCE_SECTIONS } from '../content/references.js'
import { MAPPING } from '../content/mapping.js'
import { usePageMeta } from '../hooks/usePageMeta.js'

const TOPICS = [
  { id: 'newl1', source: null, url: ABOUT_URL },
  { id: 'whyOrdering', source: 'goals' },
  { id: 'architecture', source: 'architecture', diagram: 'arch' },
  { id: 'protected', source: 'mev' },
  { id: 'deterministic', source: 'ordering', diagram: 'ticks' },
  { id: 'backruns', source: 'searchers' },
  { id: 'subblocks', source: 'architecture' },
  { id: 'auditing', source: 'attestation' },
]

const STATUS_TONE = { simulated: 'executed', simplified: 'excluded', notImplemented: 'neutral' }

function SourceLink({ topic }) {
  const { t } = useTranslation()
  return (
    <ExternalLink href={topic.url ?? TEE_URL} className="group inline-flex items-center gap-1 text-[0.74rem] text-accent hover:text-ink">
      {t('tech.source')}: {topic.source ? SOURCE_SECTIONS[topic.source] : t('references.newl1About.short')}
      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
    </ExternalLink>
  )
}

export default function Technology() {
  const { t } = useTranslation()
  usePageMeta('technology')
  return (
    <div className="container-ov pb-8 pt-10 md:pt-14">
      <header className="max-w-3xl">
        <span className="eyebrow">{t('tech.eyebrow')}</span>
        <h1 className="mt-3 text-[2rem] font-semibold tracking-tight md:text-[2.6rem]">{t('tech.title')}</h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-muted">{t('tech.subtitle')}</p>
        <p className="mt-3 text-[0.78rem] text-faint">{t('brand.disclaimer')}</p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <nav aria-label={t('tech.toc')} className="hidden lg:col-span-3 lg:block">
          <ol className="sticky top-24 space-y-1 border-l border-line">
            {TOPICS.map((tp, i) => (
              <li key={tp.id}>
                <a href={`#${tp.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[0.82rem] text-muted hover:border-ink-2 hover:text-ink">
                  <span className="mr-2 tabular-nums text-faint">{String(i + 1).padStart(2, '0')}</span>
                  {t(`tech.topics.${tp.id}.title`)}
                </a>
              </li>
            ))}
            <li>
              <a href="#mapping" className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[0.82rem] text-muted hover:border-ink-2 hover:text-ink">
                <span className="mr-2 tabular-nums text-faint">09</span>
                {t('tech.mapping.title')}
              </a>
            </li>
          </ol>
        </nav>

        <div className="min-w-0 space-y-14 lg:col-span-9">
          {TOPICS.map((tp, i) => (
            <Reveal as="section" key={tp.id} className="scroll-mt-24" >
              <div id={tp.id} className="scroll-mt-24" />
              <div className="flex items-baseline gap-3">
                <span className="hash text-faint">{String(i + 1).padStart(2, '0')}</span>
                <h2 className="text-[1.35rem] font-semibold tracking-tight">{t(`tech.topics.${tp.id}.title`)}</h2>
              </div>
              <div className="prose-ov mt-3 max-w-3xl text-[0.92rem]">
                {t(`tech.topics.${tp.id}.body`, { returnObjects: true }).map((p, k) => (
                  <p key={k}>{p}</p>
                ))}
              </div>
              {tp.diagram === 'arch' && (
                <div className="mt-5">
                  <ArchitectureDiagram />
                </div>
              )}
              {tp.diagram === 'ticks' && (
                <div className="mt-5">
                  <TickDiagram />
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <SourceLink topic={tp} />
                <span className="text-[0.74rem] text-faint">
                  {t('tech.inOrderveil')}: {t(`tech.topics.${tp.id}.orderveil`)}
                </span>
              </div>
            </Reveal>
          ))}

          <section aria-labelledby="mapping" className="scroll-mt-24">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="mapping" className="scroll-mt-24 text-[1.5rem] font-semibold tracking-tight">
                {t('tech.mapping.title')}
              </h2>
              <SimBadge />
            </div>
            <p className="mt-2 max-w-3xl text-[0.9rem] text-muted">{t('tech.mapping.subtitle')}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-[0.72rem] text-muted">
              {['simulated', 'simplified', 'notImplemented'].map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <StatusPill tone={STATUS_TONE[s]}>{t(`tech.mapping.status.${s}`)}</StatusPill>
                  {t(`tech.mapping.statusHelp.${s}`)}
                </span>
              ))}
            </div>
            <ul className="mt-6 space-y-3">
              {MAPPING.map((row) => (
                <li key={row.id} className="panel grid gap-4 p-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <div className="text-[0.95rem] font-medium">{t(`tech.mapping.rows.${row.id}.concept`)}</div>
                    <div className="mt-2">
                      <StatusPill tone={STATUS_TONE[row.status]}>{t(`tech.mapping.status.${row.status}`)}</StatusPill>
                    </div>
                    <ExternalLink href={TEE_URL} className="mt-3 inline-flex items-center gap-1 text-[0.7rem] text-accent hover:text-ink">
                      {SOURCE_SECTIONS[row.section]}
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </ExternalLink>
                  </div>
                  <dl className="grid gap-3 text-[0.8rem] leading-relaxed sm:grid-cols-2 md:col-span-9">
                    <div>
                      <dt className="text-[0.68rem] uppercase tracking-wider text-faint">{t('tech.mapping.cols.official')}</dt>
                      <dd className="mt-1 text-ink-2">{t(`tech.mapping.rows.${row.id}.official`)}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.68rem] uppercase tracking-wider text-faint">{t('tech.mapping.cols.impl')}</dt>
                      <dd className="mt-1 text-ink-2">
                        {t(`tech.mapping.rows.${row.id}.impl`)}
                        {row.link && (
                          <Link to={row.link} className="ml-1 inline-flex items-center gap-0.5 text-accent hover:text-ink">
                            {t('tech.mapping.try')}
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </Link>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.68rem] uppercase tracking-wider text-faint">{t('tech.mapping.cols.assumptions')}</dt>
                      <dd className="mt-1 text-muted">{t(`tech.mapping.rows.${row.id}.assumptions`)}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.68rem] uppercase tracking-wider text-faint">{t('tech.mapping.cols.missing')}</dt>
                      <dd className="mt-1 text-muted">{t(`tech.mapping.rows.${row.id}.missing`)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
