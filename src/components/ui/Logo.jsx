import { LOGO_DEFS, LOGO_SHAPES } from './logoMarkSvg.js'

export function LogoMark({ className = 'h-7 w-7' }) {
  return <svg viewBox="0 0 32 32" className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<defs>${LOGO_DEFS}</defs>${LOGO_SHAPES}` }} />
}

export default function Logo({ product = true }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-ink">
      <LogoMark />
      <span className="text-[1.05rem] font-semibold tracking-tight">Orderveil</span>
      {product && <span className="hidden rounded-md border border-line px-1.5 py-0.5 text-[0.68rem] font-medium tracking-wide text-muted sm:inline">Gateway Lab</span>}
    </span>
  )
}
