import { useId, useRef } from 'react'

export function Tabs({ tabs, value, onChange, label }) {
  const base = useId()
  const refs = useRef([])
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-px">
      {tabs.map((t, i) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            ref={(el) => (refs.current[i] = el)}
            id={`${base}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
              e.preventDefault()
              const n = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
              onChange(tabs[n].id)
              refs.current[n]?.focus()
            }}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink-2'}`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
