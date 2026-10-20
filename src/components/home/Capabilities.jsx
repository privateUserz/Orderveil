import { useTranslation } from 'react-i18next'
import { ShieldCheck, Hexagon, LineChart, Waves, History } from 'lucide-react'
import { Reveal } from '../ui/Section.jsx'

const ITEMS = [
  { key: 'protected', icon: ShieldCheck },
  { key: 'deterministic', icon: Hexagon },
  { key: 'mev', icon: LineChart },
  { key: 'subblock', icon: Waves },
  { key: 'audit', icon: History },
]

export default function Capabilities() {
  const { t } = useTranslation()
  return (
    <section aria-label={t('home.capabilities.aria')} className="border-b border-line bg-bg-2/60">
      <ul className="container-ov grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
        {ITEMS.map(({ key, icon: Icon }, i) => (
          <Reveal as="li" key={key} delay={i * 0.05} className={`flex gap-3.5 py-6 sm:px-4 lg:px-5 ${i === 0 ? 'lg:pl-0' : ''} ${i === ITEMS.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="text-[0.86rem] font-medium text-ink">{t(`home.capabilities.items.${key}.title`)}</h3>
              <p className="mt-1 text-[0.78rem] leading-snug text-muted">{t(`home.capabilities.items.${key}.text`)}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
