import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'

export function ErrorState({ title, message, action }) {
  return (
    <div role="alert" className="panel flex flex-col items-start gap-2 border-danger/30 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-danger">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        {title}
      </div>
      {message && <p className="text-sm text-ink-2">{message}</p>}
      {action}
    </div>
  )
}

export function EmptyState({ title, message, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <Icon className="h-5 w-5 text-faint" aria-hidden="true" />
      <div className="text-sm font-medium text-ink-2">{title}</div>
      {message && <p className="max-w-sm text-[0.8rem] text-muted">{message}</p>}
    </div>
  )
}

export function Spinner({ label }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </span>
  )
}
