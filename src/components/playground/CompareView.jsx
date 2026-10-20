import { useTranslation } from 'react-i18next'
import { RoleDot, StatusPill } from '../ui/Badges.jsx'
import PriceTimelineChart from '../charts/PriceTimelineChart.jsx'
import { fmtAmount, fmtPercent, fmtSigned, tokenSymbols } from '../../utils/format.js'

function Side({ mode, exp }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const m = exp.result.metrics
  const u = m.user
  const sym = tokenSymbols(exp.params.direction)
  const totalGas = exp.result.steps.reduce((a, s) => a + s.gasCost, 0n)
  return (
    <section aria-labelledby={`cmp-${mode}`} className="panel flex min-w-0 flex-col p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={`cmp-${mode}`} className="text-[0.95rem] font-medium">
          {t(`playground.compare.${mode}.title`)}
        </h3>
        <span className="text-[0.7rem] text-faint">{t(`playground.compare.${mode}.sub`)}</span>
      </div>
      <ol className="mt-3 space-y-1" aria-label={t('playground.compare.order')}>
        {exp.result.steps.map((s, i) => (
          <li key={s.txHash} className={`flex items-center gap-2 rounded-md px-2 py-1 text-[0.76rem] ${s.role === 'user' ? 'bg-accent/[0.06]' : s.role === 'attacker' ? 'bg-danger/[0.06]' : ''}`}>
            <span className="w-4 text-right tabular-nums text-faint">{i + 1}</span>
            <RoleDot role={s.role} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{s.transactionId}</span>
            {mode !== 'public' && <span className="text-[0.66rem] text-faint">{t('common.tick')} {s.tick}</span>}
            {s.status !== 'executed' && <StatusPill tone={s.status}>{t(`status.${s.status}`)}</StatusPill>}
          </li>
        ))}
      </ol>
      <div className="mt-3">
        <PriceTimelineChart timeline={m.timeline} height={150} compact stroke={mode === 'public' ? '#e2685f' : '#9fdcc2'} basePrice={m.timeline[0].price} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 text-[0.78rem]">
        <dt className="text-muted">{t('playground.compare.received')}</dt>
        <dd className="text-right tabular-nums">{u.status === 'executed' ? `${fmtAmount(u.actualOut, lng, 6)} ${sym.output}` : t(`status.${u.status}`)}</dd>
        <dt className="text-muted">{t('playground.metrics.priceImpact')}</dt>
        <dd className="text-right tabular-nums">{fmtPercent(u.priceImpact, lng, 3)}</dd>
        <dt className="text-muted">{t('playground.metrics.mevLoss')}</dt>
        <dd className="text-right tabular-nums">{exp.mev.lossQuote === null ? '—' : `${fmtSigned(exp.mev.lossQuote, lng, 2)} USDT`}</dd>
        <dt className="text-muted">{t('playground.compare.attackerNet')}</dt>
        <dd className="text-right tabular-nums">{m.attacker ? `${fmtSigned(m.attacker.netProfitQuote, lng, 2)} USDT` : '—'}</dd>
        <dt className="text-muted">{t('playground.compare.fees')}</dt>
        <dd className="text-right tabular-nums text-ink-2">{fmtAmount(totalGas, lng, 6)} BNB</dd>
      </dl>
    </section>
  )
}

export default function CompareView({ comparison }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const np = comparison.public.params
  const sym = tokenSymbols(np.direction)
  const shared = [
    [t('playground.params.tradeAmount'), `${fmtAmount(np.tradeAmount, lng)} ${sym.input}`],
    [t('playground.compare.pool'), `${fmtAmount(np.poolBase, lng)} BNB / ${fmtAmount(np.poolQuote, lng)} USDT`],
    [t('playground.params.feePercent'), `${Number(np.feeBps) / 100}%`],
    [t('playground.params.slippagePercent'), `${Number(np.slippageBps) / 100}%`],
    [t('playground.compare.adversary'), np.attackerEnabled ? `${fmtAmount(np.attackerAmount, lng)} ${sym.input}` : t('common.off')],
    [t('playground.params.seed'), np.seed],
  ]
  return (
    <div>
      <div className="panel-inset mb-4 p-3.5">
        <div className="text-[0.74rem] font-medium text-ink-2">{t('playground.compare.sharedInputs')}</div>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[0.74rem] sm:grid-cols-3">
          {shared.map(([k, v]) => (
            <div key={k} className="flex min-w-0 justify-between gap-2">
              <dt className="truncate text-muted">{k}</dt>
              <dd className="truncate text-right tabular-nums text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Side mode="public" exp={comparison.public} />
        <Side mode="protected" exp={comparison.protected} />
      </div>
      <div className="mt-4 rounded-xl border border-warn/20 bg-warn/[0.04] p-4 text-[0.78rem] leading-relaxed text-ink-2">
        <p className="font-medium text-warn">{t('playground.compare.caveatTitle')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {t('playground.compare.caveats', { returnObjects: true }).map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
