import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '../ui/Button.jsx'
import HeroIsometric from './HeroIsometric.jsx'
import HeroWaveGrid from './HeroWaveGrid.jsx'

const ease = [0.22, 1, 0.36, 1]

export default function Hero() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_72%_45%,rgba(79,211,160,0.07),transparent_70%)]" aria-hidden="true" />
      <HeroWaveGrid className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="container-ov relative grid items-center gap-6 py-14 md:py-16 lg:min-h-[540px] lg:grid-cols-12">
        <div className="relative z-10 max-w-[640px] lg:col-span-6">
          <motion.p className="eyebrow mb-6 flex items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
            <span className="h-px w-6 bg-accent/70" aria-hidden="true" />
            {t('home.hero.eyebrow')}
          </motion.p>
          <motion.h1 id="hero-title" className="text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[3.6rem] lg:text-[4.2rem]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.08, ease }}>
            {t('home.hero.title')}
          </motion.h1>
          <motion.p className="mt-6 max-w-[520px] text-[1.05rem] leading-relaxed text-ink-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.18, ease }}>
            {t('home.hero.subtitle')}
          </motion.p>
          <motion.p className="mt-3 text-[0.9rem] text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.26 }}>
            {t('home.hero.inspired')}
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.32, ease }}>
            <ButtonLink to="/playground" variant="primary" className="group min-w-[200px]">
              {t('home.hero.ctaPrimary')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink to="/docs" variant="secondary" className="min-w-[180px]">
              {t('home.hero.ctaSecondary')}
            </ButtonLink>
          </motion.div>
          <motion.p className="mt-6 text-[0.75rem] text-faint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}>
            {t('home.hero.caption')}
          </motion.p>
        </div>
        <motion.div className="relative z-0 lg:col-span-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2, ease }}>
          <HeroIsometric className="h-auto w-full overflow-visible" />
        </motion.div>
      </div>
    </section>
  )
}
