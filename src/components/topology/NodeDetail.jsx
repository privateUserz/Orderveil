import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import Hash from '../ui/Hash.jsx'
import { StatusPill } from '../ui/Badges.jsx'
import { NODES } from './graph.js'
import { RULESET } from '../../simulation/ordering/ruleset.js'
import { COMMITMENTS_ADDRESS, TARGET_CHAIN, explorerAddress } from '../../config/onchain.js'

/** Live data for a node, read from the experiment (never invented). */
function liveData(id, exp, t) {
  const sc = exp.result
  const g = sc.ordering
  const txs = sc.inputs.transactions
  const ids = (pred) => txs.filter(pred).map((x) => x.transactionId)
  switch (id) {
    case 'walletA':
      return [[t('network.data.transactions'), ids((x) => x.transactionId === 'user').join(', ') || '—']]
    case 'walletB':
      return [[t('network.data.transactions'), ids((x) => x.transactionId.startsWith('bg-')).join(', ') || '—']]
    case 'walletC':
      return [
        [t('network.data.transactions'), ids((x) => x.transactionId.startsWith('attacker')).join(', ') || '—'],
        [t('network.data.bundles'), sc.inputs.bundles.map((b) => b.bundleId).join(', ') || '—'],
      ]
    case 'ingress':
      return [[t('network.data.received'), String(txs.length + sc.inputs.bundles.length)]]
    case 'classifier':
      return [
        [t('paths.protected'), String(g.classified.filter((c) => c.path === 'protected').length)],
        [t('paths.optin'), String(g.classified.filter((c) => c.path === 'optin').length)],
      ]
    case 'protectedQueue':
      return [
        [t('network.data.queued'), g.classified.filter((c) => c.path === 'protected').map((c) => c.transactionId).join(', ') || '—'],
        [t('network.data.hints'), '0'],
      ]
    case 'optinQueue':
      return [
        [t('network.data.queued'), g.classified.filter((c) => c.path === 'optin').map((c) => `${c.transactionId} (${t('common.tick')} ${c.arrivalTick}→${c.inclusionTick})`).join(', ') || '—'],
        [t('network.data.hints'), String(g.hints.length)],
        ['targetCommitment', g.hints[0] ? <Hash key="h" value={g.hints[0].targetCommitment} /> : '—'],
      ]
    case 'ordering':
      return [
        ['rulesetVersion', RULESET.version],
        [t('network.data.rule'), RULESET.feeOrder],
        [t('network.data.tieBreak'), RULESET.tieBreak],
        [t('network.data.ordered'), String(g.finalOrder.length)],
        [t('network.data.bundleResult'), g.bundleDecisions.map((d) => `${d.bundleId}: ${t(`bundleStatus.${d.status}`, { defaultValue: d.status })}`).join(', ') || '—'],
      ]
    case 'subblock':
      return [
        [t('network.data.subblocks'), String(g.ticks.length)],
        [t('network.data.range'), `${t('common.tick')} ${g.ticks[0]?.tick} – ${g.ticks[g.ticks.length - 1]?.tick}`],
        ['finalSubBlockHash', <Hash key="f" value={g.finalSubBlockHash} />],
      ]
    case 'packaging':
      return [[t('network.data.packaged'), t('network.data.packagedValue', { txs: g.finalOrder.length, sb: g.ticks.length })]]
    case 'validator':
      return [
        [t('network.data.userStatus'), <StatusPill key="s" tone={sc.metrics.user.status}>{t(`status.${sc.metrics.user.status}`)}</StatusPill>],
        [t('network.data.failed'), String(sc.metrics.failedCount)],
      ]
    case 'settlementContract':
      return [
        [t('network.data.contract'), COMMITMENTS_ADDRESS ? (
          <a key="c" href={explorerAddress(COMMITMENTS_ADDRESS)} target="_blank" rel="noopener noreferrer" className="hash text-accent hover:text-ink">
            {`${COMMITMENTS_ADDRESS.slice(0, 8)}…${COMMITMENTS_ADDRESS.slice(-6)}`}
          </a>
        ) : t('network.data.notDeployed')],
      ]
    case 'bscTestnet':
      return [['chainId', String(TARGET_CHAIN.id)], [t('network.data.status'), TARGET_CHAIN.name]]
    default:
      return []
  }
}

export default function NodeDetail({ id, exp, onClose }) {
  const { t } = useTranslation()
  const node = NODES.find((n) => n.id === id)
  const rows = exp ? liveData(id, exp, t) : []
  return (
    <div className="panel p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">{node.future ? t('topology.testnetTag') : t(`topology.layers.${node.layer}`)}</div>
          <h3 className="mt-1 text-[1rem] font-medium">{t(`topology.nodes.${id}.label`)}</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-faint hover:text-ink" aria-label={t('common.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-2">{t(`topology.nodes.${id}.desc`)}</p>
      {rows.length > 0 && (
        <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[0.76rem]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="shrink-0 text-muted">{k}</dt>
              <dd className="min-w-0 break-words text-right text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 text-[0.68rem] text-faint">{t(`topology.nodes.${id}.source`, { defaultValue: '' })}</p>
    </div>
  )
}
