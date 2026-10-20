import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { ExternalLink } from '../components/ui/Button.jsx'
import { ArchitectureDiagram, TickDiagram } from '../components/docs/Diagrams.jsx'
import { REFERENCES } from '../content/references.js'
import { usePageMeta } from '../hooks/usePageMeta.js'

export const DOC_SECTIONS = ['introduction', 'newl1-research', 'architecture', 'simulation-model', 'amm-math', 'ordering-rules', 'audit-records', 'limitations', 'roadmap']

function Block({ block }) {
  switch (block.type) {
    case 'h':
      return <h3 className="mt-8 text-[1.05rem] font-semibold text-ink">{block.text}</h3>
    case 'list':
      return (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[0.9rem] leading-relaxed text-ink-2 marker:text-faint">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )
    case 'code':
      return <pre className="panel-inset mt-4 overflow-x-auto p-4 font-mono text-[0.78rem] leading-relaxed text-ink-2">{block.text}</pre>
    case 'note':
      return <p className="mt-4 rounded-lg border border-warn/25 bg-warn/[0.05] px-4 py-3 text-[0.84rem] leading-relaxed text-ink-2">{block.text}</p>
    case 'table':
      return (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[0.82rem]">
            <thead>
              <tr className="text-[0.7rem] uppercase tracking-wider text-faint">
                {block.head.map((h) => (
                  <th key={h} className="border-b border-line px-2 pb-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-b border-line">
                  {r.map((c, j) => (
                    <td key={j} className={`px-2 py-2 align-top ${j === 0 ? 'text-ink' : 'text-ink-2'}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'diagram':
      return <div className="mt-5">{block.name === 'ticks' ? <TickDiagram /> : <ArchitectureDiagram />}</div>
    case 'refs':
      return (
        <ul className="mt-4 space-y-2">
          {REFERENCES.map((r) => (
            <li key={r.id}>
              <ExternalLink href={r.url} className="inline-flex items-center gap-1 text-[0.88rem] text-accent hover:text-ink">
                {r.url}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ExternalLink>
            </li>
          ))}
        </ul>
      )
    default:
      return <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-2">{block.text}</p>
  }
}

export default function Docs() {
  const { t } = useTranslation()
  usePageMeta('docs')
  const { section = DOC_SECTIONS[0] } = useParams()
  if (!DOC_SECTIONS.includes(section)) return <Navigate to="/docs" replace />
  const idx = DOC_SECTIONS.indexOf(section)
  const blocks = t(`docs.sections.${section}.blocks`, { returnObjects: true })
  const prev = DOC_SECTIONS[idx - 1]
  const next = DOC_SECTIONS[idx + 1]
  return (
    <div className="container-ov pb-8 pt-10 md:pt-14">
      <div className="grid gap-10 lg:grid-cols-12">
        <nav aria-label={t('docs.navLabel')} className="lg:col-span-3">
          <div className="lg:sticky lg:top-24">
            <div className="eyebrow mb-3">{t('docs.eyebrow')}</div>
            <ol className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:border-l lg:border-line lg:pb-0">
              {DOC_SECTIONS.map((s, i) => (
                <li key={s} className="shrink-0">
                  <Link
                    to={`/docs/${s}`}
                    aria-current={s === section ? 'page' : undefined}
                    className={`block whitespace-nowrap rounded-md px-3 py-1.5 text-[0.84rem] lg:-ml-px lg:rounded-none lg:border-l lg:pl-4 ${s === section ? 'bg-surface-2 text-ink lg:border-accent lg:bg-transparent' : 'text-muted hover:text-ink lg:border-transparent'}`}
                  >
                    <span className="mr-2 tabular-nums text-faint">{String(i + 1).padStart(2, '0')}</span>
                    {t(`docs.nav.${s}`)}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </nav>
        <article className="min-w-0 max-w-3xl lg:col-span-9">
          <h1 className="text-[2rem] font-semibold tracking-tight">{t(`docs.sections.${section}.title`)}</h1>
          {t(`docs.sections.${section}.lead`, { defaultValue: '' }) && <p className="mt-3 text-[1.02rem] leading-relaxed text-muted">{t(`docs.sections.${section}.lead`)}</p>}
          <div className="mt-4">
            {Array.isArray(blocks) && blocks.map((b, i) => <Block key={i} block={b} />)}
          </div>
          <div className="mt-14 flex justify-between gap-4 border-t border-line pt-6 text-[0.85rem]">
            {prev ? (
              <Link to={`/docs/${prev}`} className="group inline-flex items-center gap-2 text-muted hover:text-ink">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t(`docs.nav.${prev}`)}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`/docs/${next}`} className="group inline-flex items-center gap-2 text-muted hover:text-ink">
                {t(`docs.nav.${next}`)}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
          <p className="mt-8 text-[0.74rem] leading-relaxed text-faint">{t('brand.disclaimer')}</p>
        </article>
      </div>
    </div>
  )
}
