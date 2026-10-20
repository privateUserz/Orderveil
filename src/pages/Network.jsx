import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Play, StepForward, RotateCcw, Maximize } from 'lucide-react'
import { useSimulation } from '../app/SimulationContext.jsx'
import TopologyCanvas from '../components/topology/TopologyCanvas.jsx'
import NodeDetail from '../components/topology/NodeDetail.jsx'
import { activeAt, STAGES } from '../components/topology/graph.js'
import { useTopologyRun } from '../components/topology/useTopologyRun.js'
import { Segmented } from '../components/ui/Fields.jsx'
import { Button } from '../components/ui/Button.jsx'
import { SimBadge, StatusPill } from '../components/ui/Badges.jsx'
import { ErrorState } from '../components/ui/States.jsx'
import Hash from '../components/ui/Hash.jsx'
import OrderingTable from '../components/playground/OrderingTable.jsx'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import { usePageMeta } from '../hooks/usePageMeta.js'

function StageStepper({ stageIdx }) {
  const { t } = useTranslation()
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label={t('network.stageLabel')}>
      {STAGES.map((s, i) => {
        const state = i < stageIdx ? 'done' : i === stageIdx ? 'current' : 'todo'
        return (
          <li key={s} className="flex items-center gap-1" aria-current={state === 'current' ? 'step' : undefined}>
            {i > 0 && <span className={`h-px w-4 sm:w-6 ${i <= stageIdx ? 'bg-accent/60' : 'bg-line-strong'}`} aria-hidden="true" />}
            <span className={`rounded-full border px-2.5 py-1 text-[0.72rem] transition-colors duration-300 ${state === 'current' ? 'border-accent/60 bg-accent/10 text-ink' : state === 'done' ? 'border-accent/25 text-ink-2' : 'border-line text-faint'}`}>{t(`network.stages.${s}`)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function StageSummary({ stage, info }) {
  const { t } = useTranslation()
  if (!info) return null
  const text = t(`network.stageText.${stage}`, { ...info, path: t(`paths.${info.path}`), userStatus: t(`status.${info.user.status}`), finalHash: info.finalSubBlockHash.slice(0, 10) })
  return (
    <motion.p key={stage} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="text-[0.8rem] leading-relaxed text-ink-2" aria-live="polite">
      {text}
    </motion.p>
  )
}

export default function Network() {
  const { t } = useTranslation()
  usePageMeta('network')
  const { params } = useSimulation()
  const [path, setPath] = useState(params.mode === 'optin' ? 'optin' : 'protected')
  const [selected, setSelected] = useState(null)
  const [resetView, setResetView] = useState(0)
  const narrow = useMediaQuery('(max-width: 767px)')
  const orientation = narrow ? 'vertical' : 'horizontal'
  const run = useTopologyRun(params, path)

  const active = useMemo(() => (run.info ? activeAt(run.stage, run.info) : { nodes: new Set(), edges: new Set() }), [run.stage, run.info])
  const done = useMemo(() => {
    if (!run.info) return new Set()
    const s = new Set()
    for (let i = 1; i < run.stageIdx; i++) activeAt(STAGES[i], run.info).nodes.forEach((n) => s.add(n))
    return s
  }, [run.stageIdx, run.info])

  const badges = useMemo(() => {
    if (!run.info || run.stageIdx === 0) return {}
    const i = run.info
    const b = {}
    if (run.stageIdx >= 1) b.ingress = i.txCount + i.bundleCount
    if (run.stageIdx >= 2) {
      b.protectedQueue = i.protectedCount
      if (i.path === 'optin') b.optinQueue = i.optinCount
    }
    if (run.stageIdx >= 3) b.ordering = i.orderedCount
    if (run.stageIdx >= 4) b.subblock = i.tickCount
    return b
  }, [run.info, run.stageIdx])

  const g = run.exp?.result.ordering
  const userTick = run.info?.user.tick

  return (
    <div className="container-ov pb-8 pt-10 md:pt-14">
      <header className="mb-6 max-w-3xl">
        <div className="mb-3 flex items-center gap-3">
          <span className="eyebrow">{t('network.eyebrow')}</span>
          <SimBadge />
        </div>
        <h1 className="text-[2rem] font-semibold tracking-tight md:text-[2.4rem]">{t('network.title')}</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{t('network.subtitle')}</p>
      </header>

      <div className="panel mb-4 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full sm:w-[280px]">
          <Segmented
            label={t('network.path')}
            value={path}
            onChange={(v) => {
              setPath(v)
              setSelected(null)
            }}
            options={[
              { value: 'protected', label: t('paths.protected') },
              { value: 'optin', label: t('paths.optin') },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" onClick={run.run} disabled={!run.info || run.running}>
            <Play className="h-4 w-4" aria-hidden="true" />
            {run.stageIdx === STAGES.length - 1 ? t('network.runAgain') : t('network.runRound')}
          </Button>
          <Button variant="small" onClick={run.step} disabled={!run.info || run.stageIdx === STAGES.length - 1}>
            <StepForward className="h-3.5 w-3.5" aria-hidden="true" />
            {t('network.step')}
          </Button>
          <Button variant="small" onClick={run.reset} disabled={run.stageIdx === 0}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t('network.resetRun')}
          </Button>
          <Button variant="small" onClick={() => setResetView((v) => v + 1)}>
            <Maximize className="h-3.5 w-3.5" aria-hidden="true" />
            {t('network.resetView')}
          </Button>
        </div>
      </div>

      {run.error ? (
        <ErrorState title={t('errors.title')} message={t('errors.paramsInvalid')} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3">
            <StageStepper stageIdx={run.stageIdx} />
            <StageSummary stage={run.stage} info={run.info} />
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="panel overflow-hidden lg:col-span-12">
              <TopologyCanvas variant="full" orientation={orientation} active={active} done={done} badges={badges} selected={selected} onSelect={setSelected} resetSignal={resetView} height={narrow ? 760 : 430} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:col-span-12 lg:grid-cols-3">
              {selected ? (
                <div className="md:col-span-2">
                  <NodeDetail id={selected} exp={run.exp} onClose={() => setSelected(null)} />
                </div>
              ) : (
                <div className="panel p-4 md:col-span-2">
                  <h2 className="text-[0.92rem] font-medium">{t('network.statusTitle')}</h2>
                  <dl className="mt-3 space-y-1.5 text-[0.78rem]">
                    <div className="flex justify-between">
                      <dt className="text-muted">{t('network.stageLabel')}</dt>
                      <dd className="text-ink">{t(`network.stages.${run.stage}`)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">{t('network.path')}</dt>
                      <dd className="text-ink-2">{t(`paths.${path}`)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">{t('network.inputs')}</dt>
                      <dd className="tabular-nums text-ink-2">{t('network.inputsValue', { txs: run.info.txCount, bundles: run.info.bundleCount })}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">{t('network.ticks')}</dt>
                      <dd className="tabular-nums text-ink-2">
                        {run.info.firstTick}–{run.info.lastTick} ({run.info.tickCount * 20} ms)
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">{t('network.seed')}</dt>
                      <dd className="hash truncate">{params.seed}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[0.72rem] leading-relaxed text-faint">{t('network.clickHint')}</p>
                </div>
              )}
              <div className="panel p-4 text-[0.72rem] leading-relaxed text-faint">
                <p>{t('network.legend')}</p>
                <ul className="mt-2 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-px w-5 bg-accent" />
                    {t('network.legendActive')}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-px w-5 border-t border-dashed border-line-strong" />
                    {t('network.legendFuture')}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <section className="mt-6 grid gap-4 lg:grid-cols-12" aria-labelledby="sb-title">
            <div className="panel p-4 lg:col-span-5">
              <h2 id="sb-title" className="text-[0.92rem] font-medium">
                {t('network.subblocksTitle')}
              </h2>
              <p className="mt-1 text-[0.72rem] text-faint">{t('network.subblocksSub')}</p>
              <ol className="mt-3 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
                {g.ticks.map((tk, i) => {
                  const visible = run.stageIdx >= 4
                  return (
                    <motion.li
                      key={tk.tick}
                      initial={false}
                      animate={{ opacity: visible ? 1 : 0.35 }}
                      transition={{ duration: 0.3, delay: visible ? i * 0.04 : 0 }}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[0.76rem] ${tk.tick === userTick ? 'border-accent/40 bg-accent/[0.04]' : 'border-line bg-bg-2'}`}
                    >
                      <span className="w-14 shrink-0 tabular-nums text-ink-2">
                        {t('common.tick')} {tk.tick}
                      </span>
                      <span className="w-12 shrink-0 tabular-nums text-muted">{tk.subBlock.txCount} tx</span>
                      <Hash value={tk.subBlockHash} copy={false} head={8} tail={4} />
                      {tk.entries.some((e) => e.kind === 'bundle') ? <StatusPill tone="future">{t('playground.ordering.afterRef')}</StatusPill> : <span className="w-[52px]" />}
                    </motion.li>
                  )
                })}
              </ol>
            </div>
            <div className="panel min-w-0 p-4 lg:col-span-7">
              <h2 className="text-[0.92rem] font-medium">{t('network.orderTitle')}</h2>
              <p className="mt-1 mb-3 text-[0.72rem] text-faint">{t('network.orderSub')}</p>
              {run.stageIdx >= 3 ? <OrderingTable exp={run.exp} compact /> : <p className="py-6 text-center text-[0.8rem] text-muted">{t('network.orderPending')}</p>}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
