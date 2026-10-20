import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'
import { shortHash } from '../../utils/format.js'

export default function Hash({ value, head = 6, tail = 4, copy = true, className = '' }) {
  const { t } = useTranslation()
  const [done, setDone] = useState(false)
  if (!value) return <span className="hash">—</span>
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="hash" title={value}>
        {shortHash(value, head, tail)}
      </span>
      {copy && (
        <button
          type="button"
          className="rounded p-0.5 text-faint hover:text-ink-2"
          aria-label={t('common.copy')}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              setDone(true)
              setTimeout(() => setDone(false), 1200)
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      )}
    </span>
  )
}
