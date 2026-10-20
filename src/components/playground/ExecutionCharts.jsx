import { useTranslation } from 'react-i18next'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from 'recharts'
import { AXIS, GRID, TOOLTIP_STYLE, MODE_COLORS } from '../charts/chartTheme.js'
import PriceTimelineChart, { RoleLegend } from '../charts/PriceTimelineChart.jsx'

/** Execution price per mode vs the quote at submission — all values from the engine. */
export function ExecPriceChart({ comparison }) {
  const { t } = useTranslation()
  const quoted = Number(comparison.public.result.metrics.user.quotedPriceX18) / 1e18
  const data = ['public', 'protected', 'optin'].map((m) => {
    const u = comparison[m].result.metrics.user
    const base = comparison[m].baseline.metrics.user
    return {
      mode: t(`paths.${m}`),
      key: m,
      price: u.status === 'executed' ? Number(u.executionPriceX18) / 1e18 : null,
      baseline: base.status === 'executed' ? Number(base.executionPriceX18) / 1e18 : null,
    }
  })
  const vals = data.flatMap((d) => [d.price, d.baseline]).filter((v) => v !== null)
  const min = Math.min(quoted, ...vals)
  const max = Math.max(quoted, ...vals)
  const pad = (max - min || 1) * 0.4
  return (
    <div className="h-[220px]" role="img" aria-label={t('charts.execPriceAria')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="mode" {...AXIS} tickLine={false} />
          <YAxis domain={[min - pad, max + pad]} {...AXIS} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => v.toFixed(1)} />
          <ReferenceLine y={quoted} stroke="#96a29e" strokeDasharray="4 3" label={{ value: t('charts.quoted'), fill: '#96a29e', fontSize: 10, position: 'insideTopRight' }} />
          <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v, k) => [v === null ? t('status.reverted') : Number(v).toFixed(4), k === 'price' ? t('charts.withAdversary') : t('charts.baseline')]} />
          <Bar dataKey="baseline" fill="#34403f" radius={[3, 3, 0, 0]} maxBarSize={26} isAnimationActive={false} />
          <Bar dataKey="price" radius={[3, 3, 0, 0]} maxBarSize={26} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={MODE_COLORS[d.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PriceTimelinePanel({ exp }) {
  const { t } = useTranslation()
  const m = exp.result.metrics
  return (
    <div>
      <PriceTimelineChart timeline={m.timeline} height={240} basePrice={m.timeline[0].price} />
      <div className="mt-2">
        <RoleLegend />
      </div>
      <p className="mt-2 text-[0.7rem] text-faint">{t('charts.timelineNote')}</p>
    </div>
  )
}
