import { useTranslation } from 'react-i18next'

export default function Assumptions({ mode }) {
  const { t } = useTranslation()
  const common = t('playground.assumptions.common', { returnObjects: true })
  const specific = t(`playground.assumptions.${mode}`, { returnObjects: true })
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h4 className="text-[0.8rem] font-medium text-ink-2">{t('playground.assumptions.commonTitle')}</h4>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.76rem] leading-relaxed text-muted">
          {common.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-[0.8rem] font-medium text-ink-2">{t('playground.assumptions.modeTitle', { mode: t(`paths.${mode}`) })}</h4>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.76rem] leading-relaxed text-muted">
          {specific.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
