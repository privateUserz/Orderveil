import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { fmtAmount, fmtPercent, fmtPrice, fmtSigned, tokenSymbols } from '../../utils/format.js'
import { StatusPill } from '../ui/Badges.jsx'

function Metric({ label, value, sub, tone, wide }) {
  return (
    <div className={`panel-inset min-w-0 p-3.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="text-[0.7rem] text-faint">{label}</div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={String(value)} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className={`mt-1 truncate text-[1.08rem] font-semibold tabular-nums ${tone ?? 'text-ink'}`}>
          {value}
        </motion.div>
      </AnimatePresence>
      {sub && <div className="mt-0.5 truncate text-[0.7rem] text-muted">{sub}</div>}
    </div>
  )
}

export default function MetricsGrid({ exp }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const np = exp.params
  const m = exp.result.metrics
  const u = m.user
  const sym = tokenSymbols(np.direction)
  const executed = u.status === 'executed'
  const a = m.attacker
  const loss = exp.mev.lossQuote
  const lossTone = loss === null ? 'text-ink' : loss > 0n ? 'text-danger' : 'text-accent'

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
        <span>{t('playground.metrics.userTx')}</span>
        <StatusPill tone={u.status}>{t(`status.${u.status}`)}</StatusPill>
        {u.reason && <span className="text-[0.72rem] text-danger">{t(`reasons.${u.reason}`, { defaultValue: u.reason })}</span>}
        {u.tick !== null && np.mode !== 'public' && <span className="text-[0.72rem]">· {t('common.tick')} {u.tick}</span>}
        <span className="text-[0.72rem]">· {t('playground.metrics.position', { n: u.position + 1 })}</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
        <Metric label={t('playground.metrics.userInput')} value={`${fmtAmount(u.amountIn, lng, 4)} ${sym.input}`} sub={t('playground.metrics.direction', { dir: t(`playground.params.${np.direction}`) })} />
        <Metric label={t('playground.metrics.userOutput')} value={executed ? `${fmtAmount(u.actualOut, lng, 6)} ${sym.output}` : t(`status.${u.status}`)} tone={executed ? 'text-ink' : 'text-danger'} sub={t('playground.metrics.quoted', { v: `${fmtAmount(u.expectedOut, lng, 6)} ${sym.output}` })} />
        <Metric label={t('playground.metrics.execPrice')} value={executed ? fmtPrice(u.executionPriceX18, lng, 4) : '—'} sub={t('playground.metrics.spotBefore', { v: fmtPrice(u.spotBeforeX18, lng, 2) })} />
        <Metric label={t('playground.metrics.priceImpact')} value={fmtPercent(u.priceImpact, lng, 3)} sub={t('playground.metrics.quotedImpact', { v: fmtPercent(u.quotedImpact, lng, 3) })} />
        <Metric label={t('playground.metrics.slippage')} value={fmtPercent(u.slippage, lng, 3)} sub={t('playground.metrics.minOut', { v: `${fmtAmount(u.minOut, lng, 6)} ${sym.output}` })} />
        <Metric label={t('playground.metrics.mevLoss')} value={loss === null ? (exp.mev.userFailedOnlyWithAdversary ? t('playground.metrics.failedByAdversary') : '—') : `${fmtSigned(loss, lng, 2)} USDT`} tone={exp.mev.userFailedOnlyWithAdversary ? 'text-danger' : lossTone} sub={t('playground.metrics.mevLossSub')} />
        {np.mode === 'optin' && <Metric label={t('playground.metrics.refund')} value={`${fmtAmount(exp.mev.refundQuote, lng, 2)} USDT`} tone="text-accent" sub={t('playground.metrics.refundSub', { pct: Number(np.refundBps) / 100 })} />}
        <Metric label={t('playground.metrics.userGas')} value={`${fmtAmount(u.gasCost, lng, 6)} BNB`} sub={t('playground.metrics.gasSub')} />
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <div className="panel-inset p-3.5">
          <div className="flex items-center justify-between">
            <div className="text-[0.78rem] font-medium text-ink-2">{t('playground.metrics.attacker')}</div>
            {a && <span className="text-[0.7rem] text-faint">{t(`playground.strategy.${a.strategy}`)}</span>}
          </div>
          {!a ? (
            <p className="mt-2 text-[0.78rem] text-muted">{t('playground.metrics.noAttacker')}</p>
          ) : (
            <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[0.78rem]">
              <dt className="text-muted">{t('playground.metrics.gross')}</dt>
              <dd className="text-right tabular-nums">{fmtSigned(a.grossProfitQuote, lng, 2)} USDT</dd>
              <dt className="text-muted">{t('playground.metrics.lpFees')}</dt>
              <dd className="text-right tabular-nums text-ink-2">{fmtAmount(a.lpFeesQuote, lng, 2)} USDT</dd>
              <dt className="text-muted">{t('playground.metrics.gas')}</dt>
              <dd className="text-right tabular-nums text-ink-2">−{fmtAmount(a.gasCostQuote, lng, 4)} USDT</dd>
              <dt className="border-t border-line pt-1.5 font-medium text-ink-2">{t('playground.metrics.net')}</dt>
              <dd className={`border-t border-line pt-1.5 text-right font-semibold tabular-nums ${a.netProfitQuote > 0n ? 'text-danger' : 'text-accent'}`}>{fmtSigned(a.netProfitQuote, lng, 2)} USDT</dd>
              {a.guessedCorrectly !== undefined && (
                <>
                  <dt className="text-muted">{t('playground.metrics.blindGuess')}</dt>
                  <dd className="text-right text-ink-2">{t(`playground.params.${a.frontSide}`)} · {a.guessedCorrectly ? t('playground.metrics.guessRight') : t('playground.metrics.guessWrong')}</dd>
                </>
              )}
            </dl>
          )}
        </div>
        <div className="panel-inset p-3.5">
          <div className="text-[0.78rem] font-medium text-ink-2">{t('playground.metrics.reserves')}</div>
          <table className="mt-2.5 w-full text-[0.78rem]">
            <thead>
              <tr className="text-[0.68rem] text-faint">
                <th className="pb-1 text-left font-normal" />
                <th className="pb-1 text-right font-normal">{t('playground.metrics.before')}</th>
                <th className="pb-1 text-right font-normal">{t('playground.metrics.after')}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr>
                <td className="text-muted">BNB</td>
                <td className="text-right">{fmtAmount(m.poolBefore.reserveBase, lng, 4)}</td>
                <td className="text-right">{fmtAmount(m.poolAfter.reserveBase, lng, 4)}</td>
              </tr>
              <tr>
                <td className="text-muted">USDT</td>
                <td className="text-right">{fmtAmount(m.poolBefore.reserveQuote, lng, 2)}</td>
                <td className="text-right">{fmtAmount(m.poolAfter.reserveQuote, lng, 2)}</td>
              </tr>
              <tr>
                <td className="text-muted">{t('charts.spotPrice')}</td>
                <td className="text-right">{fmtPrice(u.spotBeforeX18, lng, 4)}</td>
                <td className="text-right">{fmtPrice(m.spotAfterX18, lng, 4)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[0.68rem] text-faint">{t('playground.metrics.reservesNote', { count: exp.result.steps.length })}</p>
        </div>
      </div>
    </div>
  )
}
