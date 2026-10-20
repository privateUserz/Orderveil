import { Suspense } from 'react'
import { lazyPage } from '../../app/lazyPage.js'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowDown, Repeat, Send, Boxes, Lock, ListOrdered, Blocks, FileSignature, ShieldCheck, LayoutGrid } from 'lucide-react'
import { Reveal } from '../ui/Section.jsx'
import { Spinner } from '../ui/States.jsx'

const TopologyPreview = lazyPage(() => import('./TopologyPreview.jsx'))

const COLUMNS = [
  { key: 'users', items: [{ k: 'swap', icon: Repeat }, { k: 'transfer', icon: Send }, { k: 'defi', icon: Boxes }] },
  { key: 'gateway', highlight: true, items: [{ k: 'encrypt', icon: Lock }, { k: 'order', icon: ListOrdered }, { k: 'subblocks', icon: Blocks }, { k: 'signed', icon: FileSignature }] },
  { key: 'validators', items: [{ k: 'verify', icon: ShieldCheck }, { k: 'propose', icon: LayoutGrid }] },
]

function FlowColumn({ col, t }) {
  return (
    <div className={`panel flex-1 p-4 ${col.highlight ? 'bg-surface-2' : ''}`}>
      <h3 className="text-[0.95rem] font-medium text-ink">{t(`home.how.columns.${col.key}.title`)}</h3>
      <p className="mt-0.5 text-[0.74rem] text-faint">{t(`home.how.columns.${col.key}.sub`)}</p>
      <ul className="mt-4 space-y-2">
        {col.items.map(({ k, icon: Icon }) => (
          <li key={k} className="panel-inset flex items-center gap-2.5 px-2.5 py-2">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
            <span className="text-[0.78rem] text-ink-2">{t(`home.how.columns.${col.key}.items.${k}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function HowItWorks() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="how-title" className="container-ov mt-16 grid gap-6 lg:grid-cols-12">
      <Reveal className="lg:col-span-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="how-title" className="text-[1.45rem] font-semibold tracking-tight">
              {t('home.how.title')}
            </h2>
            <p className="mt-1 text-[0.85rem] text-muted">{t('home.how.subtitle')}</p>
          </div>
          <Link to="/technology" className="group inline-flex shrink-0 items-center gap-1.5 text-[0.8rem] text-ink-2 hover:text-ink">
            {t('common.learnMore')}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          {COLUMNS.map((col, i) => (
            <div key={col.key} className="contents">
              {i > 0 && (
                <div className="flex justify-center text-faint" aria-hidden="true">
                  <ArrowRight className="hidden h-4 w-4 md:block" />
                  <ArrowDown className="h-4 w-4 md:hidden" />
                </div>
              )}
              <FlowColumn col={col} t={t} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[0.72rem] text-faint">{t('home.how.note')}</p>
      </Reveal>
      <Reveal delay={0.08} className="lg:col-span-5">
        <Suspense fallback={<div className="panel flex h-[360px] items-center justify-center"><Spinner label={t('common.loading')} /></div>}>
          <TopologyPreview />
        </Suspense>
      </Reveal>
    </section>
  )
}
