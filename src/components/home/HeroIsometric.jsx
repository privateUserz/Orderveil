// Hero illustration: isometric view of the experiment path, drawn as SVG so it stays sharp
// at any resolution and its labels follow the active language.
// User → encrypted ingress → gateway (off-chain, simulated) → validator → BSC Testnet (Phase 2).
import { useTranslation } from 'react-i18next'

const S = 34 // px per iso unit
const OX = 380
const OY = 58
const C = 0.866

function P(x, y, z = 0) {
  return [OX + (x - y) * C * S, OY + (x + y) * 0.5 * S - z * S]
}
const pts = (list) => list.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')

function Box({ x, y, w, d, h, tone = 'dark', detail, glow }) {
  const top = [P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)]
  const right = [P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x + w, y, h)]
  const left = [P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x, y + d, h)]
  const fills = tone === 'lit' ? ['url(#ov-lit-top)', 'url(#ov-lit-l)', 'url(#ov-lit-r)'] : ['url(#ov-top)', 'url(#ov-left)', 'url(#ov-right)']
  const stroke = tone === 'dashed' ? 'var(--hero-line-dim)' : 'var(--hero-line)'
  const dash = tone === 'dashed' ? '4 4' : undefined
  return (
    <g filter={glow ? 'url(#ov-glow)' : undefined}>
      <polygon points={pts(left)} fill={fills[1]} stroke={stroke} strokeWidth="1" strokeDasharray={dash} strokeLinejoin="round" />
      <polygon points={pts(right)} fill={fills[2]} stroke={stroke} strokeWidth="1" strokeDasharray={dash} strokeLinejoin="round" />
      <polygon points={pts(top)} fill={fills[0]} stroke={stroke} strokeWidth="1" strokeDasharray={dash} strokeLinejoin="round" />
      {detail === 'server' &&
        Array.from({ length: 6 }, (_, i) => {
          const z = h * (0.18 + i * 0.13)
          const a = P(x + w * 0.18, y + d, z)
          const b = P(x + w * 0.62, y + d, z)
          const c = P(x + w, y + d * 0.25, z)
          const e = P(x + w, y + d * 0.55, z)
          return (
            <g key={i} stroke="var(--hero-line)" strokeOpacity="0.55" strokeWidth="1">
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
              <line x1={c[0]} y1={c[1]} x2={e[0]} y2={e[1]} />
            </g>
          )
        })}
      {detail === 'glyph' && (
        <g stroke="var(--hero-line)" strokeOpacity="0.7" strokeWidth="1.1" fill="none">
          <polyline points={pts([P(x + w * 0.25, y + d, h * 0.62), P(x + w * 0.45, y + d, h * 0.45), P(x + w * 0.7, y + d, h * 0.62)])} />
          <line x1={P(x + w, y + d * 0.3, h * 0.35)[0]} y1={P(x + w, y + d * 0.3, h * 0.35)[1]} x2={P(x + w, y + d * 0.3, h * 0.7)[0]} y2={P(x + w, y + d * 0.3, h * 0.7)[1]} />
          <line x1={P(x + w, y + d * 0.55, h * 0.3)[0]} y1={P(x + w, y + d * 0.55, h * 0.3)[1]} x2={P(x + w, y + d * 0.55, h * 0.6)[0]} y2={P(x + w, y + d * 0.55, h * 0.6)[1]} />
        </g>
      )}
    </g>
  )
}

/** Dashed flow along the ground plane, first along x then along y. */
function Flow({ from, to, z = 0, future, delay = 0, yFirst, direct }) {
  const a = P(from[0], from[1], z)
  const m = yFirst ? P(from[0], to[1], z) : P(to[0], from[1], z)
  const b = P(to[0], to[1], z)
  return (
    <g>
      <polyline points={pts(direct ? [a, b] : [a, m, b])} fill="none" stroke={future ? 'var(--hero-line-dim)' : 'var(--hero-flow)'} strokeWidth="1.4" strokeDasharray="5 6" className={future ? '' : 'ov-hero-flow'} style={{ animationDelay: `${delay}s` }} />
      <circle cx={b[0]} cy={b[1]} r="2.6" fill={future ? 'var(--hero-line-dim)' : 'var(--hero-flow)'} />
    </g>
  )
}

function Label({ at, title, sub, boxed, align = 'middle' }) {
  const [x, y] = at
  if (boxed) {
    const w = 132
    return (
      <g>
        <rect x={x - w / 2} y={y - 26} width={w} height="52" rx="9" fill="rgba(15,22,22,0.85)" stroke="var(--hero-line)" strokeOpacity="0.8" />
        <text x={x} y={y - 4} textAnchor="middle" className="fill-ink" style={{ fontSize: 14, fontWeight: 500 }}>
          {title}
        </text>
        <text x={x} y={y + 14} textAnchor="middle" style={{ fontSize: 11.5, fill: 'var(--hero-flow)' }}>
          {sub}
        </text>
      </g>
    )
  }
  return (
    <g>
      <text x={x} y={y} textAnchor={align} className="fill-ink" style={{ fontSize: 13.5, fontWeight: 500 }}>
        {title}
      </text>
      {sub && (
        <text x={x} y={y + 15} textAnchor={align} style={{ fontSize: 11, fill: 'var(--color-muted)' }}>
          {sub}
        </text>
      )}
    </g>
  )
}

export default function HeroIsometric({ className = '' }) {
  const { t } = useTranslation()
  const user = P(6.6, 15.6)
  const tower = { x: 3.6, y: 8.6, w: 1.5, d: 1.5, h: 4.6 }
  const gw = { x: 5.2, y: 2.4, w: 2.2, d: 2.2, h: 2.2 }
  const val = { x: 6.2, y: -2.6, w: 1.4, d: 1.4, h: 1.4 }
  const bsc = { x: 12.6, y: 3.2, w: 1.5, d: 1.5, h: 2.3 }
  const gatewayLabel = P(10.6, 10.4)
  return (
    <svg viewBox="0 0 760 520" className={className} overflow="visible" role="img" aria-label={t('home.hero.art.aria')}>
      <defs>
        <linearGradient id="ov-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d3330" />
          <stop offset="1" stopColor="#14211f" />
        </linearGradient>
        <linearGradient id="ov-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13201f" />
          <stop offset="1" stopColor="#0d1515" />
        </linearGradient>
        <linearGradient id="ov-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#172826" />
          <stop offset="1" stopColor="#0f1817" />
        </linearGradient>
        <linearGradient id="ov-lit-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3f8f74" />
          <stop offset="1" stopColor="#2a6553" />
        </linearGradient>
        <linearGradient id="ov-lit-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#245446" />
          <stop offset="1" stopColor="#163a31" />
        </linearGradient>
        <linearGradient id="ov-lit-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6b58" />
          <stop offset="1" stopColor="#1b453a" />
        </linearGradient>
        <radialGradient id="ov-user-glow">
          <stop offset="0" stopColor="#7ff0c0" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#4fd3a0" stopOpacity="0.35" />
          <stop offset="1" stopColor="#4fd3a0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ov-fade-g" gradientUnits="userSpaceOnUse" cx="470" cy="270" r="820">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="ov-fade" maskUnits="userSpaceOnUse" x="-900" y="-500" width="2600" height="1500">
          <rect x="-900" y="-500" width="2600" height="1500" fill="url(#ov-fade-g)" />
        </mask>
        <filter id="ov-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* flows (under the boxes) */}
      <Flow from={[6.6, 15.1]} to={[tower.x + tower.w * 0.5, tower.y + tower.d + 0.2]} delay={0} yFirst />
      <Flow from={[tower.x + tower.w + 0.1, tower.y + 0.6]} to={[gw.x + gw.w * 0.4, gw.y + gw.d + 0.15]} delay={0.4} />
      <Flow from={[gw.x + gw.w + 0.1, gw.y + gw.d * 0.7]} to={[10.4, 9.4]} delay={0.7} />
      <Flow from={[gw.x + gw.w * 0.6, gw.y - 0.1]} to={[val.x + val.w * 0.5, val.y + val.d + 0.15]} delay={1} />
      <Flow from={[val.x + val.w + 0.1, val.y + val.d * 0.6]} to={[bsc.x + bsc.w * 0.3, bsc.y - 0.1]} future direct />

      {/* user platform */}
      <ellipse cx={user[0]} cy={user[1]} rx="46" ry="26" fill="url(#ov-user-glow)" className="ov-hero-pulse" />
      <Box x={6.15} y={15.15} w={0.9} d={0.9} h={0.25} tone="lit" glow />

      <Box {...tower} detail="server" />
      <Box {...gw} detail="glyph" />
      <Box {...val} tone="lit" glow detail="glyph" />
      <Box {...bsc} detail="server" />

      {/* labels */}
      <Label at={[user[0], user[1] + 44]} title={t('home.hero.art.user')} />
      <Label at={[P(tower.x, tower.y + tower.d)[0] - 14, P(tower.x, tower.y + tower.d)[1] - 4]} title={t('home.hero.art.ingress')} sub={t('home.hero.art.ingressSub')} align="end" />
      <Label at={gatewayLabel} title={t('home.hero.art.gateway')} sub={t('home.hero.art.gatewaySub')} boxed />
      <Label at={[P(val.x + val.w, val.y)[0] + 22, P(val.x + val.w, val.y)[1] - 10]} title={t('home.hero.art.validator')} align="start" />
      <Label at={[P(bsc.x + bsc.w, bsc.y + bsc.d)[0], P(bsc.x + bsc.w, bsc.y + bsc.d)[1] + 30]} title={t('home.hero.art.bsc')} sub={t('home.hero.art.bscSub')} />
    </svg>
  )
}
