// On-chain target for Phase 2. Default: BSC Testnet (chain 97).
// VITE_ORDERVEIL_CHAIN=local switches to a local Anvil chain (31337) for development/e2e.
import { defineChain } from 'viem'
import { bscTestnet } from 'viem/chains'

const env = import.meta.env ?? {}

export const IS_LOCAL = env.VITE_ORDERVEIL_CHAIN === 'local'

const localChain = defineChain({
  id: 31337,
  name: 'Local Anvil',
  nativeCurrency: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: { default: { http: [env.VITE_LOCAL_RPC_URL || 'http://127.0.0.1:8546'] } },
  testnet: true,
})

export const TARGET_CHAIN = IS_LOCAL ? localChain : bscTestnet
export const RPC_URL = IS_LOCAL ? localChain.rpcUrls.default.http[0] : env.VITE_BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com'

/** Canonical deployments. An env override wins so forks/self-deploys can point elsewhere. */
export const DEPLOYMENTS = {
  97: '0x5ceB5B2bCb785A175F7D1814bF6D93438F9d33DE', // deployed 2026-10-20, block 137859750, tx 0xc8902655232503a82464595d4a4606d8b2f3e47d1da6f5939f1fb611e00429f5
}

function normalizeAddress(a) {
  return typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a) ? a : null
}

export const COMMITMENTS_ADDRESS = normalizeAddress(env.VITE_ORDERVEIL_COMMITMENTS_ADDRESS) ?? normalizeAddress(DEPLOYMENTS[TARGET_CHAIN.id])

export const FAUCET_URL = 'https://www.bnbchain.org/en/testnet-faucet'

const explorer = TARGET_CHAIN.blockExplorers?.default?.url ?? null
export const explorerTx = (hash) => (explorer && hash ? `${explorer}/tx/${hash}` : null)
export const explorerAddress = (addr) => (explorer && addr ? `${explorer}/address/${addr}` : null)
export const explorerBlock = (n) => (explorer && n != null ? `${explorer}/block/${n}` : null)
