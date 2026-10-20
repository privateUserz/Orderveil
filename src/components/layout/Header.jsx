import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import LanguageSwitch from './LanguageSwitch.jsx'
import WalletButton from './WalletButton.jsx'
import XIcon from '../ui/XIcon.jsx'
import { X_URL } from '../../content/social.js'

export const NAV = [
  { to: '/', key: 'home', end: true },
  { to: '/technology', key: 'technology' },
  { to: '/playground', key: 'playground' },
  { to: '/network', key: 'network' },
  { to: '/docs', key: 'docs' },
]

export default function Header() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className={`sticky top-0 z-40 transition-colors duration-200 ${scrolled || open ? 'border-b border-line bg-bg/85 backdrop-blur-md' : 'border-b border-transparent bg-transparent'}`}>
      <div className="flex h-16 w-full items-center justify-between gap-4 px-5 md:px-8 xl:px-10">
        <div className="flex items-center gap-10">
          <Link to="/" aria-label={t('nav.homeAria')} className="shrink-0">
            <Logo />
          </Link>
          <nav aria-label={t('nav.primary')} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} end={n.end} className={({ isActive }) => `rounded-md px-3 py-2 text-[0.85rem] transition-colors ${isActive ? 'text-ink' : 'text-muted hover:text-ink'}`}>
                    {t(`nav.${n.key}`)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="hidden items-center gap-6 lg:flex">
          <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label={t('social.followX')} title={t('social.followX')} className="rounded-md p-1.5 text-muted transition-colors hover:text-ink">
            <XIcon className="h-[17px] w-[17px]" />
          </a>
          <LanguageSwitch />
          <WalletButton />
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <LanguageSwitch />
          <button type="button" className="rounded-md p-2 text-ink-2 hover:bg-surface-2" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav id="mobile-nav" aria-label={t('nav.primary')} className="border-t border-line lg:hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <ul className="container-ov flex flex-col py-3">
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} end={n.end} className={({ isActive }) => `block rounded-md px-2 py-3 text-[0.95rem] ${isActive ? 'text-ink' : 'text-muted'}`}>
                    {t(`nav.${n.key}`)}
                  </NavLink>
                </li>
              ))}
              <li>
                <a href={X_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md px-2 py-3 text-[0.95rem] text-muted">
                  <XIcon className="h-4 w-4" />
                  {t('social.followX')}
                </a>
              </li>
              <li className="pt-3">
                <WalletButton className="w-full justify-center" />
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
