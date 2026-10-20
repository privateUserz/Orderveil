import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Play } from 'lucide-react'
import { useSimulation } from '../../app/SimulationContext.jsx'
import TopologyCanvas from '../topology/TopologyCanvas.jsx'
import { compactActiveAt, STAGES } from '../topology/graph.js'
import { useTopologyRun } from '../topology/useTopologyRun.js'
import { SimBadge } from '../ui/Badges.jsx'
import { Button } from '../ui/Button.jsx'

export default function TopologyPreview() {
  const { t } = useTranslation()
  const { params } = useSimulation()
  const [selected, setSelected] = useState(null)
  const run = useTopologyRun(params, 'protected', { stepMs: 650 })
  const active = useMemo(() => (run.info ? compactActiveAt(run.stage, run.info) : { nodes: new Set(), edges: new Set() }), [run.stage, run.info])

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[0.98rem] font-medium">{t('home.topology.title')}</h2>
          <SimBadge />
        </div>
        <Link to="/network" className="group inline-flex items-center gap-1 text-[0.76rem] text-accent hover:text-ink">
          {t('home.topology.open')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="relative flex-1 bg-bg-2/40">
        <TopologyCanvas variant="compact" orientation="horizontal" active={active} selected={selected} onSelect={setSelected} height={320} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <div className="min-w-0 text-[0.76rem] text-muted" aria-live="polite">
          {selected ? (
            <span>
              <span className="text-ink-2">{t(`topology.nodes.${selected}.label`)}</span> — {t(`topology.nodes.${selected}.short`)}
            </span>
          ) : run.error ? (
            <span className="text-danger">{t('errors.paramsInvalid')}</span>
          ) : (
            <span>
              {t('network.stageLabel')}: <span className="text-ink-2">{t(`network.stages.${run.stage}`)}</span>
              {run.stage === 'completed' && run.info && <> · {t('home.topology.done', { count: run.info.orderedCount, ticks: run.info.tickCount })}</>}
            </span>
          )}
        </div>
        <Button variant="small" onClick={run.run} disabled={!run.info || run.running}>
          <Play className="h-3 w-3" aria-hidden="true" />
          {run.stageIdx === STAGES.length - 1 ? t('network.runAgain') : t('network.runRound')}
        </Button>
      </div>
    </div>
  )
}
