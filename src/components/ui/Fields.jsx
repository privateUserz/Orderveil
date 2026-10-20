import { useId } from 'react'
import { useTranslation } from 'react-i18next'

export function Field({ label, hint, error, children, id }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-[0.78rem] font-medium text-ink-2">
        <span>{label}</span>
        {hint && <span className="truncate text-[0.7rem] font-normal text-faint">{hint}</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-[0.72rem] text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextField({ label, hint, value, onChange, error, suffix, inputMode = 'decimal', name, ...rest }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} id={id}>
      <div className="relative">
        <input id={id} name={name} className={`field-input ${suffix ? 'pr-14' : ''}`} value={value} inputMode={inputMode} autoComplete="off" spellCheck="false" aria-invalid={error ? 'true' : 'false'} onChange={(e) => onChange(e.target.value)} {...rest} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[0.72rem] text-faint">{suffix}</span>}
      </div>
    </Field>
  )
}

export function Segmented({ label, value, onChange, options, name }) {
  const id = useId()
  return (
    <div role="radiogroup" aria-labelledby={label ? id : undefined} className="min-w-0">
      {label && (
        <div id={id} className="mb-1.5 text-[0.78rem] font-medium text-ink-2">
          {label}
        </div>
      )}
      <div className="grid gap-1 rounded-[10px] border border-line bg-bg-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              name={name}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                e.preventDefault()
                const i = options.findIndex((x) => x.value === value)
                const n = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length]
                onChange(n.value)
              }}
              tabIndex={active ? 0 : -1}
              className={`truncate rounded-[7px] px-2 py-1.5 text-[0.8rem] font-medium transition-colors ${active ? 'bg-surface-3 text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)]' : 'text-muted hover:text-ink-2'}`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Toggle({ label, checked, onChange, description }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-[0.82rem] font-medium text-ink-2">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[0.72rem] leading-snug text-faint">{description}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${checked ? 'border-accent-2 bg-accent-2/70' : 'border-line-strong bg-surface-3'}`}>
        <span className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-ink transition-[left] ${checked ? 'left-[18px]' : 'left-[2px]'}`} />
      </button>
    </div>
  )
}

export function SelectField({ label, value, onChange, options }) {
  const id = useId()
  return (
    <Field label={label} id={id}>
      <select id={id} className="field-input appearance-none" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function useErrorText() {
  const { t } = useTranslation()
  return (err) => (err ? t(`errors.${err.code}`, { defaultValue: t('errors.unknown') }) : null)
}
