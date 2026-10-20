import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSimulation } from '../app/SimulationContext.jsx'
import ParamPanel from '../components/playground/ParamPanel.jsx'
import MetricsGrid from '../components/playground/MetricsGrid.jsx'
import { ExecPriceChart, PriceTimelinePanel } from '../components/playground/ExecutionCharts.jsx'
import OrderingTable from '../components/playground/OrderingTable.jsx'
import TickTimeline from '../components/playground/TickTimeline.jsx'
import CompareView from '../components/playground/CompareView.jsx'
import AuditPanel from '../components/playground/AuditPanel.jsx'
import Assumptions from '../components/playground/Assumptions.jsx'
import { Tabs } from '../components/ui/Tabs.jsx'
import { Segmented, useErrorText } from '../components/ui/Fields.jsx'
import { SimBadge } from '../components/ui/Badges.jsx'
import { ErrorState } from '../components/ui/States.jsx'
import { Button } from '../components/ui/Button.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

function Card({ title, sub, children, className = '' }) {
  return (
    <section className={`panel p-4 md:p-5 ${className}`}>
      {title && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[0.92rem] font-medium">{title}</h3>
          {sub && <span className="text-[0.72rem] text-faint">{sub}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

export default function Playground() {
  const { t } = useTranslation()
  usePageMeta('playground')
  const { params, setParam, comparison, error, reset } = useSimulation()
  const errText = useErrorText()
  const [tab, setTab] = useState('results')
  const exp = comparison?.[params.mode]

  return (
    <div className="container-ov pb-8 pt-10 md:pt-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="eyebrow">{t('playground.eyebrow')}</span>
            <SimBadge />
          </div>
          <h1 className="text-[2rem] font-semibold tracking-tight md:text-[2.4rem]">{t('playground.title')}</h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{t('playground.subtitle')}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="lg:sticky lg:top-20">
            <ParamPanel />
          </div>
        </aside>

        <div className="min-w-0 space-y-5 lg:col-span-8 xl:col-span-9">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line">
            <Tabs
              label={t('playground.tabs.label')}
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'results', label: t('playground.tabs.results') },
                { id: 'compare', label: t('playground.tabs.compare') },
                { id: 'ordering', label: t('playground.tabs.ordering') },
                { id: 'audit', label: t('playground.tabs.audit') },
              ]}
            />
            {tab !== 'compare' && (
              <div className="mb-2 w-full sm:w-[300px]">
                <Segmented value={params.mode} onChange={(v) => setParam('mode', v)} options={['public', 'protected', 'optin'].map((v) => ({ value: v, label: t(`paths.${v}`) }))} name="mode-quick" />
              </div>
            )}
          </div>

          {error || !exp ? (
            <ErrorState
              title={t('errors.title')}
              message={`${errText(error)}${error?.field ? ` — ${t(`playground.params.${error.field}`, { defaultValue: error.field })}` : ''}`}
              action={
                <Button variant="small" onClick={reset}>
                  {t('playground.params.reset')}
                </Button>
              }
            />
          ) : (
            <div role="tabpanel" aria-label={t(`playground.tabs.${tab}`)}>
              {tab === 'results' && (
                <div className="space-y-5">
                  <Card title={t('playground.sections.outcome', { mode: t(`paths.${params.mode}`) })} sub={t('playground.sections.outcomeSub')}>
                    <MetricsGrid exp={exp} />
                  </Card>
                  <div className="grid gap-5 xl:grid-cols-5">
                    <Card className="xl:col-span-3" title={t('playground.sections.timeline')} sub={t('playground.sections.timelineSub')}>
                      <PriceTimelinePanel exp={exp} />
                    </Card>
                    <Card className="xl:col-span-2" title={t('playground.sections.execPrice')} sub={t('playground.sections.execPriceSub')}>
                      <ExecPriceChart comparison={comparison} />
                    </Card>
                  </div>
                  <Card title={t('playground.sections.sequence')} sub={t('playground.sections.sequenceSub')}>
                    <OrderingTable exp={exp} compact />
                  </Card>
                  <Card title={t('playground.sections.assumptions')}>
                    <Assumptions mode={params.mode} />
                  </Card>
                </div>
              )}
              {tab === 'compare' && <CompareView comparison={comparison} />}
              {tab === 'ordering' && (
                <div className="space-y-5">
                  <Card title={t('playground.sections.ticks')} sub={t('playground.sections.ticksSub')}>
                    <TickTimeline exp={exp} />
                  </Card>
                  <Card title={t('playground.sections.ordering')} sub={t('playground.sections.orderingSub')}>
                    <OrderingTable exp={exp} />
                  </Card>
                </div>
              )}
              {tab === 'audit' && (
                <Card title={t('playground.sections.audit')} sub={t('playground.sections.auditSub')}>
                  <AuditPanel exp={exp} />
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
