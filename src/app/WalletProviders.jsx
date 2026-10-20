import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { wagmiConfig } from './wagmi.js'
import { TARGET_CHAIN } from '../config/onchain.js'

const base = darkTheme({ accentColor: '#9fdcc2', accentColorForeground: '#0f1c17', borderRadius: 'medium', overlayBlur: 'small' })
const theme = {
  ...base,
  colors: {
    ...base.colors,
    modalBackground: '#161d1f',
    modalBorder: '#263032',
    modalText: '#eef2ef',
    modalTextSecondary: '#96a29e',
    actionButtonSecondaryBackground: '#1b2426',
    generalBorder: '#263032',
    menuItemBackground: '#1b2426',
    profileForeground: '#161d1f',
    closeButtonBackground: '#1b2426',
    connectButtonBackground: '#161d1f',
  },
  fonts: { body: "'Inter', ui-sans-serif, system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif" },
}

function Inner({ children }) {
  const { i18n, t } = useTranslation()
  return (
    <RainbowKitProvider
      theme={theme}
      locale={i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US'}
      initialChain={TARGET_CHAIN}
      modalSize="wide"
      appInfo={{ appName: 'Orderveil Gateway Lab', disclaimer: ({ Text }) => <Text>{t('wallet.disclaimer')}</Text> }}
    >
      {children}
    </RainbowKitProvider>
  )
}

export default function WalletProviders({ children }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }))
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Inner>{children}</Inner>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
