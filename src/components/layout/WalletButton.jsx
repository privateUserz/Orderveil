// Header wallet button in Orderveil's style; RainbowKit provides the wallet picker,
// account and network modals.
import { useTranslation } from 'react-i18next'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Wallet, AlertTriangle, ChevronDown } from 'lucide-react'

const base = 'inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[0.82rem] font-medium transition-colors'

export default function WalletButton({ className = '' }) {
  const { t } = useTranslation()
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted, connectModalOpen }) => {
        if (!mounted) return <div className={`h-9 w-[150px] ${className}`} aria-hidden="true" />
        if (!account || !chain) {
          return (
            <button type="button" onClick={openConnectModal} disabled={connectModalOpen} className={`${base} justify-center bg-ink text-bg hover:bg-white ${className}`}>
              <Wallet className="h-4 w-4" aria-hidden="true" />
              {t('nav.connectWallet')}
            </button>
          )
        }
        if (chain.unsupported) {
          return (
            <button type="button" onClick={openChainModal} className={`${base} justify-center border border-warn/40 bg-warn/10 text-warn hover:bg-warn/15 ${className}`}>
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {t('wallet.wrongNetwork')}
            </button>
          )
        }
        return (
          <button type="button" onClick={openAccountModal} className={`${base} justify-center border border-line-strong bg-surface-2 text-ink hover:border-muted ${className}`} data-testid="wallet-connected">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            {account.displayBalance && <span className="hidden text-[0.76rem] text-muted xl:inline">{account.displayBalance}</span>}
            <span className="font-mono text-[0.78rem]">{account.displayName}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
          </button>
        )
      }}
    </ConnectButton.Custom>
  )
}
