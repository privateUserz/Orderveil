import { useTranslation } from 'react-i18next'
import { FlaskConical } from 'lucide-react'

export function SimBadge({ className = '' }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/[0.07] px-2.5 py-0.5 text-[0.7rem] font-medium tracking-wide text-warn ${className}`} title={t('common.simulationTooltip')}>
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      {t('common.simulation')}
    </span>
  )
}

const tones = {
  executed: 'text-accent bg-accent/10 border-accent/25',
  included: 'text-accent bg-accent/10 border-accent/25',
  ordered: 'text-accent bg-accent/10 border-accent/25',
  passed: 'text-accent bg-accent/10 border-accent/25',
  reverted: 'text-danger bg-danger/10 border-danger/25',
  failed: 'text-danger bg-danger/10 border-danger/25',
  excluded: 'text-warn bg-warn/10 border-warn/25',
  outbid: 'text-muted bg-surface-3 border-line',
  rejected: 'text-danger bg-danger/10 border-danger/25',
  future: 'text-info bg-info/10 border-info/25',
  neutral: 'text-muted bg-surface-3 border-line',
}

export function StatusPill({ tone = 'neutral', children }) {
  const key = tone.startsWith('rejected') ? 'rejected' : tone in tones ? tone : 'neutral'
  return <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[0.7rem] font-medium ${tones[key]}`}>{children}</span>
}

const roleTones = {
  user: 'bg-accent',
  attacker: 'bg-danger',
  searcher: 'bg-info',
  background: 'bg-faint',
}
export function RoleDot({ role }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${roleTones[role] ?? 'bg-faint'}`} aria-hidden="true" />
}
