import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { useSimulation } from '../../app/SimulationContext.jsx'
import { SimBadge, StatusPill } from '../ui/Badges.jsx'
import Hash from '../ui/Hash.jsx'
import { EmptyState } from '../ui/States.jsx'

/** Last SubBlocks of the current opt-in experiment, computed by the ordering engine. */
export default function SubBlockLog() {
  const { t } = useTranslation()
  const { comparison } = useSimulation()
  const rows = useMemo(() => {
    const g = comparison?.optin.result.ordering
    if (!g) return []
    return g.ticks
      .filter((tk) => tk.entries.length > 0)
      .slice(-4)
      .reverse()
      .map((tk) => ({
        hash: tk.subBlockHash,
        tick: tk.tick,
        txs: tk.subBlock.txCount,
        hasBundle: tk.entries.some((e) => e.kind === 'bundle'),
        hasOptin: tk.entries.some((e) => e.path === 'optin'),
      }))
  }, [comparison])

  return (
    <div className="panel h-full p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[1.05rem] font-medium">{t('home.subblocks.title')}</h2>
          <SimBadge />
        </div>
        <Link to="/network" className="group inline-flex items-center gap-1 text-[0.76rem] text-accent hover:text-ink">
          {t('home.subblocks.more')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t('home.subblocks.empty')} message={t('errors.paramsInvalid')} />
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[0.78rem]">
            <thead>
              <tr className="text-[0.68rem] uppercase tracking-wider text-faint">
                <th className="px-1 pb-2 font-medium">{t('home.subblocks.cols.hash')}</th>
                <th className="px-1 pb-2 font-medium">{t('home.subblocks.cols.tick')}</th>
                <th className="px-1 pb-2 font-medium">{t('home.subblocks.cols.txs')}</th>
                <th className="px-1 pb-2 font-medium">{t('home.subblocks.cols.content')}</th>
                <th className="px-1 pb-2 text-right font-medium">{t('home.subblocks.cols.time')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.hash} className="border-t border-line">
                  <td className="px-1 py-2.5">
                    <Hash value={r.hash} copy={false} />
                  </td>
                  <td className="px-1 py-2.5 tabular-nums text-ink-2">{r.tick}</td>
                  <td className="px-1 py-2.5 tabular-nums text-ink-2">{r.txs}</td>
                  <td className="px-1 py-2.5">
                    {r.hasBundle ? <StatusPill tone="included">{t('home.subblocks.withBackrun')}</StatusPill> : r.hasOptin ? <StatusPill tone="future">{t('paths.optin')}</StatusPill> : <StatusPill tone="ordered">{t('paths.protected')}</StatusPill>}
                  </td>
                  <td className="px-1 py-2.5 text-right tabular-nums text-muted">{t('home.subblocks.logicalMs', { ms: r.tick * 20 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[0.7rem] text-faint">{t('home.subblocks.note')}</p>
    </div>
  )
}
