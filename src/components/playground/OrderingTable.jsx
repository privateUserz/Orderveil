import { useTranslation } from 'react-i18next'
import { RoleDot, StatusPill } from '../ui/Badges.jsx'
import { fmtAmount, fmtGwei } from '../../utils/format.js'
import Hash from '../ui/Hash.jsx'

export default function OrderingTable({ exp, compact = false }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const steps = exp.result.steps
  const gateway = exp.result.ordering.kind === 'gateway'
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[0.76rem]">
        <caption className="sr-only">{t('playground.ordering.caption')}</caption>
        <thead>
          <tr className="text-[0.66rem] uppercase tracking-wider text-faint">
            <th className="px-1.5 pb-2 font-medium">#</th>
            {gateway && <th className="px-1.5 pb-2 font-medium">{t('common.tick')}</th>}
            <th className="px-1.5 pb-2 font-medium">{t('playground.ordering.tx')}</th>
            {!compact && <th className="px-1.5 pb-2 font-medium">{t('playground.ordering.hash')}</th>}
            <th className="px-1.5 pb-2 text-right font-medium">{t('playground.ordering.fee')}</th>
            <th className="px-1.5 pb-2 font-medium">{t('playground.ordering.side')}</th>
            <th className="px-1.5 pb-2 text-right font-medium">{t('playground.ordering.in')}</th>
            <th className="px-1.5 pb-2 text-right font-medium">{t('playground.ordering.out')}</th>
            <th className="px-1.5 pb-2 font-medium">{t('playground.ordering.status')}</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => {
            const inSym = s.side === 'buy' ? 'USDT' : 'BNB'
            const outSym = s.side === 'buy' ? 'BNB' : 'USDT'
            return (
              <tr key={s.txHash} className={`border-t border-line ${s.role === 'user' ? 'bg-accent/[0.04]' : ''}`}>
                <td className="px-1.5 py-2 tabular-nums text-faint">{i + 1}</td>
                {gateway && <td className="px-1.5 py-2 tabular-nums text-ink-2">{s.tick}</td>}
                <td className="px-1.5 py-2">
                  <span className="flex items-center gap-2">
                    <RoleDot role={s.role} />
                    <span className={s.role === 'user' ? 'font-medium text-ink' : 'text-ink-2'}>{s.transactionId}</span>
                    {s.group && <span className="rounded border border-info/30 px-1 text-[0.62rem] text-info">{t('playground.ordering.afterRef')}</span>}
                  </span>
                </td>
                {!compact && (
                  <td className="px-1.5 py-2">
                    <Hash value={s.txHash} copy={false} head={4} />
                  </td>
                )}
                <td className="px-1.5 py-2 text-right tabular-nums text-ink-2">{fmtGwei(s.effectiveFeeRate, lng)}</td>
                <td className="px-1.5 py-2 text-ink-2">{t(`playground.params.${s.side}`)}</td>
                <td className="px-1.5 py-2 text-right tabular-nums">{s.amountIn > 0n ? `${fmtAmount(s.amountIn, lng, 4)} ${inSym}` : '—'}</td>
                <td className="px-1.5 py-2 text-right tabular-nums">{s.amountOut > 0n ? `${fmtAmount(s.amountOut, lng, 4)} ${outSym}` : '—'}</td>
                <td className="px-1.5 py-2">
                  <StatusPill tone={s.status}>{t(`status.${s.status}`)}</StatusPill>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
