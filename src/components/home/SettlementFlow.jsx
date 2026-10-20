import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '../ui/Section.jsx'
import SubBlockLog from './SubBlockLog.jsx'

const STEPS = ['submit', 'order', 'execute', 'settle']

export default function SettlementFlow() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="settle-title" className="container-ov mt-6 grid gap-6 lg:grid-cols-12">
      <Reveal className="panel p-5 lg:col-span-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h2 id="settle-title" className="text-[1.05rem] font-medium">
              {t('home.settlement.title')}
            </h2>
            <span className="text-[0.78rem] text-faint">{t('home.settlement.sub')}</span>
          </div>
          <Link to="/docs/architecture" className="group inline-flex items-center gap-1 text-[0.76rem] text-accent hover:text-ink">
            {t('home.settlement.detail')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s} className="panel-inset relative p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[0.8rem] font-semibold text-accent-ink">{i + 1}</span>
                <span className="text-[0.84rem] font-medium text-ink">{t(`home.settlement.steps.${s}.title`)}</span>
              </div>
              <p className="mt-2.5 text-[0.74rem] leading-snug text-muted">{t(`home.settlement.steps.${s}.text`)}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[0.72rem] text-faint">{t('home.settlement.note')}</p>
      </Reveal>
      <Reveal delay={0.08} className="lg:col-span-5">
        <SubBlockLog />
      </Reveal>
    </section>
  )
}
