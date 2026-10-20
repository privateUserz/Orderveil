import { motion } from 'motion/react'

export function Reveal({ children, delay = 0, className = '', as = 'div' }) {
  const M = motion[as]
  return (
    <M className={className} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </M>
  )
}

export function SectionHeader({ title, subtitle, action, eyebrow, id, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-2 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h2 id={id} className="text-[1.45rem] font-semibold tracking-tight text-ink md:text-[1.6rem]">
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[0.95rem] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
