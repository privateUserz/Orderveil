import { Link } from 'react-router-dom'

const base =
  'inline-flex items-center justify-center gap-2 rounded-[10px] text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none'
const variants = {
  primary: 'bg-ink text-bg hover:bg-white px-5 py-2.5',
  secondary: 'border border-line-strong text-ink hover:border-muted hover:bg-surface-2 px-5 py-2.5',
  ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2 px-3 py-2',
  accent: 'bg-accent text-accent-ink hover:bg-[#b4e6d1] px-4 py-2',
  small: 'border border-line text-ink-2 hover:text-ink hover:border-line-strong px-3 py-1.5 text-[0.8rem]',
}

export function Button({ variant = 'secondary', className = '', ...props }) {
  return <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function ButtonLink({ to, variant = 'secondary', className = '', ...props }) {
  return <Link to={to} className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function ExternalLink({ href, className = '', children, ...props }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>
      {children}
    </a>
  )
}
