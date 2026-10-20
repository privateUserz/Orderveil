import { Suspense } from 'react'
import { lazyPage } from '../../app/lazyPage.js'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, TrendingDown, Scale, Users, Hexagon } from 'lucide-react'
import { useSimulation } from '../../app/SimulationContext.jsx'
import { Reveal } from '../ui/Section.jsx'
import { ErrorState, Spinner } from '../ui/States.jsx'
import { ButtonLink } from '../ui/Button.jsx'
import { fmtPercent, fmtSigned } from '../../utils/format.js'

const PriceTimelineChart = lazyPage(() => import('../charts/PriceTimelineChart.jsx'))

const BENEFITS = [
  { key: 'reduce', icon: TrendingDown },
  { key: 'fair', icon: Scale },
  { key: 'better', icon: Users },
  { key: 'open', icon: Hexagon },
]

function ModeCard({ mode, exp, t, lng }) {
  const m = exp.result.metrics
  const legend = mode === 'public' ? ['attacker', 'user'] : ['user', 'background']
  const failed = m.user.status !== 'executed'
  return (
    <div className="panel flex flex-col p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[0.95rem] font-medium">{t(`home.compare.${mode}.title`)}</h3>
        <span className="text-[0.72rem] text-faint">{t(`home.compare.${mode}.sub`)}</span>
      </div>
      <div className="mt-2">
        <Suspense fallback={<div className="flex h-[150px] items-center justify-center"><Spinner /></div>}>
          <PriceTimelineChart timeline={m.timeline} height={150} compact stroke={mode === 'public' ? '#e2685f' : '#9fdcc2'} />
        </Suspense>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <ul className="space-y-1 text-[0.72rem] text-muted">
          {legend.map((r) => (
            <li key={r}>{t(`roles.${r}`)}</li>
          ))}
        </ul>
        <div className="text-right">
          <div className="text-[0.7rem] text-faint">{failed ? t('home.compare.userStatus') : t('home.compare.priceImpact')}</div>
          <div className={`text-[1.35rem] font-semibold tabular-nums ${mode === 'public' ? 'text-danger' : 'text-accent'}`}>{failed ? t(`status.${m.user.status}`) : fmtPercent(m.user.priceImpact, lng, 2)}</div>
          <div className="text-[0.7rem] text-faint">
            {t('home.compare.mevLoss')}: <span className="tabular-nums text-ink-2">{exp.mev.lossQuote === null ? '—' : `${fmtSigned(-exp.mev.lossQuote, lng, 2)} USDT`}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CompareDifference() {
  const { t, i18n } = useTranslation()
  const { comparison, params } = useSimulation()
  return (
    <section aria-labelledby="compare-title" className="container-ov mt-16">
      <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="compare-title" className="text-[1.45rem] font-semibold tracking-tight">
            {t('home.compare.title')}
          </h2>
          <p className="mt-1 text-[0.85rem] text-muted">{t('home.compare.subtitle', { seed: params.seed })}</p>
        </div>
        <Link to="/playground" className="group inline-flex items-center gap-1 text-[0.8rem] text-ink-2 hover:text-ink">
          {t('home.compare.more')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Reveal>
      {!comparison ? (
        <ErrorState title={t('errors.title')} message={t('errors.paramsInvalid')} action={<ButtonLink to="/playground" variant="small">{t('home.compare.fix')}</ButtonLink>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Reveal>
            <ModeCard mode="public" exp={comparison.public} t={t} lng={i18n.language} />
          </Reveal>
          <Reveal delay={0.06}>
            <ModeCard mode="protected" exp={comparison.protected} t={t} lng={i18n.language} />
          </Reveal>
          <Reveal delay={0.12} className="panel flex flex-col p-4">
            <h3 className="text-[0.95rem] font-medium">{t('home.compare.benefits.title')}</h3>
            <ul className="mt-4 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
              {BENEFITS.map(({ key, icon: Icon }) => (
                <li key={key} className="flex gap-2.5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
                  <div>
                    <div className="text-[0.8rem] text-ink">{t(`home.compare.benefits.items.${key}.title`)}</div>
                    <div className="mt-0.5 text-[0.72rem] leading-snug text-muted">{t(`home.compare.benefits.items.${key}.text`)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <ButtonLink to="/playground" variant="small" className="mt-5 self-start">
              {t('home.compare.cta')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </ButtonLink>
          </Reveal>
        </div>
      )}
      <p className="mt-3 text-[0.72rem] leading-relaxed text-faint">{t('home.compare.disclaimer')}</p>
    </section>
  )
}
