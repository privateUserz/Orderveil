import { useTranslation } from 'react-i18next'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { ROLE_COLORS, AXIS, GRID, TOOLTIP_STYLE } from './chartTheme.js'

function RoleDot({ cx, cy, payload, compact }) {
  if (cx == null || cy == null) return null
  const color = ROLE_COLORS[payload.role] ?? ROLE_COLORS.background
  const failed = payload.status !== 'executed'
  const r = compact ? (payload.role === 'user' || payload.role === 'attacker' ? 3.5 : 2) : payload.role === 'background' ? 3 : 4.5
  return failed ? (
    <circle cx={cx} cy={cy} r={r} fill="#0f1416" stroke={color} strokeWidth={1.5} strokeDasharray="2 1.5" />
  ) : (
    <circle cx={cx} cy={cy} r={r} fill={color} stroke="#0f1416" strokeWidth={1} />
  )
}

/** Pool spot price after each executed step, straight from the simulation timeline. */
export default function PriceTimelineChart({ timeline, height = 220, compact = false, stroke = '#c4ccc9', basePrice }) {
  const { t } = useTranslation()
  const prices = timeline.map((d) => d.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const pad = (max - min || max * 0.002) * 0.25
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={t('charts.priceTimelineAria')}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={timeline} margin={{ top: 8, right: compact ? 4 : 12, bottom: 0, left: compact ? -18 : 0 }}>
          {!compact && <CartesianGrid stroke={GRID} vertical={false} />}
          <XAxis dataKey="index" {...AXIS} tickLine={false} axisLine={{ stroke: AXIS.stroke }} interval="preserveStartEnd" />
          <YAxis domain={[min - pad, max + pad]} {...AXIS} tickLine={false} axisLine={false} width={compact ? 52 : 64} tickFormatter={(v) => v.toFixed(compact ? 0 : 1)} />
          {basePrice && <ReferenceLine y={basePrice} stroke="#34403f" strokeDasharray="3 3" />}
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v) => [Number(v).toFixed(4), t('charts.spotPrice')]}
            labelFormatter={(i) => {
              const d = timeline[i]
              if (!d) return ''
              return `#${d.index} · ${d.label === 'start' ? t('charts.start') : d.label}${d.tick != null ? ` · ${t('common.tick')} ${d.tick}` : ''}${d.status !== 'executed' ? ` · ${t(`status.${d.status}`)}` : ''}`
            }}
          />
          <Line type="linear" dataKey="price" stroke={stroke} strokeWidth={1.4} dot={(p) => <RoleDot key={p.index} {...p} compact={compact} />} activeDot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RoleLegend({ roles = ['user', 'attacker', 'searcher', 'background'] }) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.72rem] text-muted">
      {roles.map((r) => (
        <li key={r} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: ROLE_COLORS[r] }} />
          {t(`roles.${r}`)}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border border-dashed border-muted" />
        {t('charts.failedStep')}
      </li>
    </ul>
  )
}
