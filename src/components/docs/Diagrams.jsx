import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowDown } from 'lucide-react'

/** Simplified architecture after the proposal's Figure 1 / §3.1 component table. */
export function ArchitectureDiagram() {
  const { t } = useTranslation()
  const gateway = ['ingress', 'classifier', 'ordering', 'subblock', 'packager']
  return (
    <figure className="panel-inset p-4" aria-labelledby="arch-cap">
      <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        <Box title={t('tech.arch.users')} sub={t('tech.arch.usersSub')} />
        <Arrow />
        <div className="flex-1 rounded-xl border border-dashed border-accent/35 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.74rem] font-medium text-accent">{t('tech.arch.gateway')}</span>
            <span className="text-[0.66rem] text-faint">{t('tech.arch.gatewaySub')}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            {gateway.map((g) => (
              <div key={g} className="rounded-lg border border-line bg-surface-2 px-2.5 py-2">
                <div className="text-[0.72rem] font-medium text-ink">{t(`tech.arch.parts.${g}.title`)}</div>
                <div className="mt-0.5 text-[0.64rem] leading-snug text-faint">{t(`tech.arch.parts.${g}.out`)}</div>
              </div>
            ))}
          </div>
        </div>
        <Arrow />
        <Box title={t('tech.arch.validator')} sub={t('tech.arch.validatorSub')} />
        <Arrow />
        <Box title={t('tech.arch.chain')} sub={t('tech.arch.chainSub')} />
      </div>
      <figcaption id="arch-cap" className="mt-3 text-[0.7rem] text-faint">
        {t('tech.arch.caption')}
      </figcaption>
    </figure>
  )
}

function Box({ title, sub }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 lg:w-[128px]">
      <div className="text-[0.76rem] font-medium text-ink">{title}</div>
      <div className="mt-0.5 text-[0.64rem] leading-snug text-faint">{sub}</div>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex justify-center text-faint" aria-hidden="true">
      <ArrowRight className="hidden h-4 w-4 lg:block" />
      <ArrowDown className="h-4 w-4 lg:hidden" />
    </div>
  )
}

/** 20 ms logical ticks: protected enters its arrival tick, opt-in waits 5 ticks with a hint window. */
export function TickDiagram() {
  const { t } = useTranslation()
  const ticks = [0, 1, 2, 3, 4, 5, 6, 7]
  return (
    <figure className="panel-inset overflow-x-auto p-4" aria-labelledby="tick-cap">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[110px_repeat(8,1fr)] gap-1 text-[0.66rem] text-faint">
          <span />
          {ticks.map((k) => (
            <span key={k} className="text-center tabular-nums">
              {t('common.tick')} {k}
              <br />
              {k * 20} ms
            </span>
          ))}
        </div>
        <Row label={t('paths.protected')} cells={ticks.map((k) => (k === 1 ? 'inc' : null))} t={t} />
        <Row label={t('paths.optin')} cells={ticks.map((k) => (k === 1 ? 'disc' : k > 1 && k < 6 ? 'win' : k === 6 ? 'inc' : null))} t={t} />
        <Row label={t('tech.ticks.backrun')} cells={ticks.map((k) => (k > 1 && k < 6 ? 'sub' : k === 6 ? 'after' : null))} t={t} />
      </div>
      <figcaption id="tick-cap" className="mt-3 text-[0.7rem] text-faint">
        {t('tech.ticks.caption')}
      </figcaption>
    </figure>
  )
}

function Row({ label, cells, t }) {
  const styles = {
    inc: 'bg-accent/80 text-accent-ink',
    disc: 'bg-info/70 text-bg',
    win: 'bg-info/15 text-info',
    sub: 'bg-info/10 text-info',
    after: 'bg-info/70 text-bg',
  }
  return (
    <div className="mt-1.5 grid grid-cols-[110px_repeat(8,1fr)] items-center gap-1">
      <span className="text-[0.72rem] text-ink-2">{label}</span>
      {cells.map((c, i) => (
        <span key={i} className={`flex h-7 items-center justify-center rounded text-[0.62rem] font-medium ${c ? styles[c] : 'bg-bg-2'}`}>
          {c ? t(`tech.ticks.cells.${c}`) : ''}
        </span>
      ))}
    </div>
  )
}
