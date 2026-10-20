// Wallet configuration: RainbowKit's wallet picker on top of wagmi v2.
// Desktop browser-extension wallets only: no WalletConnect, no QR codes, no mobile apps.
import { createConfig, createConnector, http } from 'wagmi'
import { injected, mock } from 'wagmi/connectors'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { metaMaskWallet, binanceWallet, okxWallet, trustWallet, bitgetWallet, tokenPocketWallet, rabbyWallet, injectedWallet } from '@rainbow-me/rainbowkit/wallets'
import { TARGET_CHAIN, RPC_URL } from '../config/onchain.js'

const env = import.meta.env ?? {}

// e2e only: an RainbowKit-listed wallet backed by an unlocked Anvil account. Never in normal builds.
const mockAccount = env.VITE_WALLET_MOCK_ACCOUNT
const testWallet = () => ({
  id: 'orderveil-test',
  name: 'Test Wallet (local)',
  iconUrl: '/favicon.svg',
  iconBackground: '#0f1416',
  installed: true,
  createConnector: (details) => createConnector((config) => ({ ...mock({ accounts: [mockAccount], features: { reconnect: true } })(config), ...details })),
})

const MOBILE_DOWNLOADS = ['android', 'ios', 'mobile', 'qrCode']

/**
 * Extension-only wallet: no QR / mobile deep links, and no mobile download options.
 * When the extension isn't installed the connector is inert, so RainbowKit shows the
 * browser-extension install page instead of trying an SDK or WalletConnect flow.
 */
const extensionOnly = (factory) => (opts) => {
  // eslint-disable-next-line no-unused-vars
  const { qrCode, mobile, downloadUrls = {}, ...wallet } = factory(opts)
  const desktopDownloads = Object.fromEntries(Object.entries(downloadUrls).filter(([k]) => !MOBILE_DOWNLOADS.includes(k)))
  if (wallet.installed) return { ...wallet, downloadUrls: desktopDownloads }
  return {
    ...wallet,
    downloadUrls: desktopDownloads,
    installed: false,
    createConnector: (details) =>
      createConnector((config) => ({ ...injected({ target: { id: wallet.id, name: wallet.name, provider: () => undefined } })(config), ...details })),
  }
}
const w = (list) => list.map(extensionOnly)

const groups = mockAccount
  ? [{ groupName: 'Test', wallets: [testWallet] }]
  : [
      { groupName: 'Popular', wallets: w([metaMaskWallet, binanceWallet, okxWallet, trustWallet]) },
      {
        groupName: 'More',
        wallets: [...w([bitgetWallet, tokenPocketWallet, rabbyWallet]), injectedWallet],
      },
    ]

const connectors = connectorsForWallets(groups, {
  appName: 'Orderveil Gateway Lab',
  appDescription: 'Protected transaction ordering research — BSC Testnet audit commitments',
  appUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
  projectId: 'walletconnect-disabled', // required by RainbowKit's API; WalletConnect is never used
})

export const wagmiConfig = createConfig({
  chains: [TARGET_CHAIN],
  connectors,
  transports: { [TARGET_CHAIN.id]: http(RPC_URL) },
  multiInjectedProviderDiscovery: !mockAccount,
})
