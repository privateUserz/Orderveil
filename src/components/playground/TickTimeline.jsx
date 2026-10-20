import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import Hash from '../ui/Hash.jsx'
import { StatusPill } from '../ui/Badges.jsx'
import { EmptyState } from '../ui/States.jsx'

/** Tick-by-tick view of the simulated gateway: inputs, frozen set, ordering, commitments, SubBlock. */
export default function TickTimeline({ exp }) {
  const { t } = useTranslation()
  const g = exp.result.ordering
  const [sel, setSel] = useState(null)
  if (g.kind !== 'gateway') return <EmptyState title={t('playground.ticks.publicTitle')} message={t('playground.ticks.publicText')} />
  const idOf = new Map(exp.result.steps.map((s) => [s.txHash, s.transactionId]))
  const current = g.ticks.find((tk) => tk.tick === sel) ?? g.ticks.find((tk) => tk.entries.some((e) => e.transactionId === 'user')) ?? g.ticks[0]
  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-2" role="tablist" aria-label={t('playground.ticks.aria')}>
        {g.ticks.map((tk) => {
          const active = tk.tick === current.tick
          const n = tk.subBlock.txCount
          const hasUser = tk.entries.some((e) => e.transactionId === 'user')
          const hasBundle = tk.entries.some((e) => e.kind === 'bundle')
          return (
            <motion.button
              layout
              key={tk.tick}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSel(tk.tick)}
              className={`flex w-[68px] shrink-0 flex-col items-start rounded-lg border px-2 py-1.5 text-left transition-colors ${active ? 'border-accent/60 bg-accent/[0.06]' : 'border-line bg-bg-2 hover:border-line-strong'}`}
            >
              <span className="text-[0.64rem] text-faint">{t('common.tick')} {tk.tick}</span>
              <span className="text-[0.82rem] font-medium tabular-nums text-ink">{n} tx</span>
              <span className="mt-0.5 flex gap-1">
                {hasUser && <span className="h-1.5 w-1.5 rounded-full bg-accent" title={t('roles.user')} />}
                {hasBundle && <span className="h-1.5 w-1.5 rounded-full bg-info" title={t('roles.searcher')} />}
              </span>
              <span className="mt-0.5 text-[0.6rem] tabular-nums text-faint">{tk.logicalTimeMs} ms</span>
            </motion.button>
          )
        })}
      </div>
      <motion.div key={current.tick} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="panel-inset p-3.5">
          <div className="text-[0.78rem] font-medium text-ink-2">{t('playground.ticks.inputs', { tick: current.tick })}</div>
          <dl className="mt-2 space-y-1.5 text-[0.76rem]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('playground.ticks.arrivals')}</dt>
              <dd className="text-right text-ink-2">{current.arrivals.length ? current.arrivals.map((a) => a.transactionId).join(', ') : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('playground.ticks.bundleArrivals')}</dt>
              <dd className="text-right text-ink-2">{current.bundleArrivals.length ? current.bundleArrivals.map((a) => a.bundleId).join(', ') : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('playground.ticks.frozen')}</dt>
              <dd className="text-right text-ink-2">{current.frozenSet.length ? current.frozenSet.map((h) => idOf.get(h)).join(', ') : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('playground.ticks.salt')}</dt>
              <dd>
                <Hash value={current.salt} />
              </dd>
            </div>
          </dl>
          <div className="mt-3 text-[0.72rem] text-faint">{t('playground.ticks.output')}</div>
          <ol className="mt-1.5 space-y-1">
            {current.entries.length === 0 && <li className="text-[0.76rem] text-muted">{t('playground.ticks.emptyTick')}</li>}
            {current.entries.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-[0.76rem]">
                <span className="w-4 text-right tabular-nums text-faint">{i + 1}</span>
                {e.kind === 'tx' ? (
                  <>
                    <span className="text-ink-2">{e.transactionId}</span>
                    <StatusPill tone={e.path === 'optin' ? 'future' : 'ordered'}>{t(`paths.${e.path}`)}</StatusPill>
                  </>
                ) : (
                  <>
                    <span className="text-info">{e.transactionIds.join(', ')}</span>
                    <StatusPill tone="future">{t('playground.ordering.afterRef')}</StatusPill>
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
        <div className="panel-inset p-3.5">
          <div className="text-[0.78rem] font-medium text-ink-2">{t('playground.ticks.subblock')}</div>
          <dl className="mt-2 space-y-1.5 text-[0.76rem]">
            {['gatewayId', 'workloadId', 'rulesetVersion', 'term', 'slot', 'tick', 'txCount'].map((k) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="font-mono text-[0.7rem] text-muted">{k}</dt>
                <dd className="truncate text-right text-ink-2">{String(current.subBlock[k])}</dd>
              </div>
            ))}
            {['parentSubBlockHash', 'inputCommitment', 'payloadHash'].map((k) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="font-mono text-[0.7rem] text-muted">{k}</dt>
                <dd>
                  <Hash value={current.subBlock[k]} />
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-line pt-1.5">
              <dt className="font-mono text-[0.7rem] text-ink-2">subBlockHash</dt>
              <dd>
                <Hash value={current.subBlockHash} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-mono text-[0.7rem] text-muted">enclaveSig</dt>
              <dd className="text-right text-[0.72rem] text-warn">{t('playground.ticks.noEnclaveSig')}</dd>
            </div>
          </dl>
        </div>
      </motion.div>

      {(g.hints.length > 0 || g.bundleDecisions.length > 0) && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="panel-inset p-3.5">
            <div className="text-[0.78rem] font-medium text-ink-2">{t('playground.ticks.hints')}</div>
            {g.hints.map((h) => (
              <dl key={h.targetCommitment} className="mt-2 space-y-1 text-[0.74rem]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">targetCommitment</dt>
                  <dd>
                    <Hash value={h.targetCommitment} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('playground.ticks.window')}</dt>
                  <dd className="text-ink-2">
                    {t('common.tick')} {h.disclosedAtTick} → {h.expiryTick} ({(h.expiryTick - h.disclosedAtTick) * 20} ms)
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('playground.ticks.disclosed')}</dt>
                  <dd className="text-right text-ink-2">{t('playground.ticks.disclosedValue')}</dd>
                </div>
              </dl>
            ))}
            <p className="mt-2 text-[0.68rem] text-faint">{t('playground.ticks.hintsNote')}</p>
          </div>
          <div className="panel-inset p-3.5">
            <div className="text-[0.78rem] font-medium text-ink-2">{t('playground.ticks.bundles')}</div>
            {g.bundleDecisions.length === 0 ? (
              <p className="mt-2 text-[0.76rem] text-muted">{t('playground.ticks.noBundles')}</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-[0.76rem]">
                {(exp.result.metrics.searchers?.tips ?? []).map((tp) => (
                  <li key={tp.bundleId} className="flex items-center justify-between gap-2">
                    <span className="text-ink-2">{tp.bundleId}</span>
                    <span className="tabular-nums text-muted">{t('playground.ticks.tip', { v: (Number(tp.committedTipWei) / 1e18).toFixed(5) })}</span>
                    <StatusPill tone={tp.status === 'excluded_on_execution' ? 'excluded' : tp.status}>{t(`bundleStatus.${tp.status}`, { defaultValue: tp.status })}</StatusPill>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[0.68rem] text-faint">{t('playground.ticks.bundlesNote')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
