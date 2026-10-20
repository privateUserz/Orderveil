import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import zhCN from '../locales/zh-CN.json'

export const LANG_STORAGE_KEY = 'orderveil.lang'
export const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'zh-CN', label: '中文' },
]

function storedLanguage() {
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY)
    return LANGUAGES.some((l) => l.code === v) ? v : null
  } catch {
    return null
  }
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, 'zh-CN': { translation: zhCN } },
  lng: (typeof window !== 'undefined' && storedLanguage()) || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

function syncDocument(lng) {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
}
syncDocument(i18n.language)
i18n.on('languageChanged', (lng) => {
  syncDocument(lng)
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lng)
  } catch {
    /* storage unavailable: language still switches for this session */
  }
})

export default i18n
