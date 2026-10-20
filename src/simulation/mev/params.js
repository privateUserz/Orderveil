// Playground parameters. Raw values are UI strings; normalizeParams converts them to BigInt
// smallest units and throws InputError(code, field) for i18n-friendly validation messages.
// Every default below is an EXAMPLE value, not market data.
import { parseUnits } from 'viem'
import { InputError, toUnits, BPS } from '../core/units.js'

export const EXECUTION_MODES = Object.freeze(['public', 'protected', 'optin'])
export const BLIND_GUESS = Object.freeze(['seed', 'same', 'opposite'])

export const DEFAULT_PARAMS = Object.freeze({
  direction: 'buy',
  tradeAmount: '6000', // in the input token (USDT for buy, BNB for sell)
  poolBase: '1000', // BNB-like base token reserve
  poolQuote: '600000', // USDT-like quote token reserve
  feePercent: '0.25',
  slippagePercent: '1',
  attackerEnabled: true,
  attackerAmount: '3000', // input token of the user's direction
  mode: 'public',
  seed: 'orderveil-demo-4',
  userFeeGwei: '3',
  gasUnits: '150000',
  backgroundTxCount: '4',
  blindGuess: 'seed',
  refundPercent: '90',
  searcherCount: '3',
})

function percentToBps(value, field, max = 100) {
  const s = String(value ?? '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new InputError('invalidPercent', field)
  const bps = parseUnits(s, 2)
  if (bps > BigInt(max) * 100n) throw new InputError('outOfRange', field)
  return bps
}

function intInRange(value, field, min, max) {
  const s = String(value ?? '').trim()
  if (!/^\d+$/.test(s)) throw new InputError('invalidInteger', field)
  const n = Number(s)
  if (n < min || n > max) throw new InputError('outOfRange', field)
  return n
}

export function normalizeParams(raw) {
  const p = { ...DEFAULT_PARAMS, ...raw }
  if (p.direction !== 'buy' && p.direction !== 'sell') throw new InputError('invalidDirection', 'direction')
  if (!EXECUTION_MODES.includes(p.mode)) throw new InputError('invalidMode', 'mode')
  if (!BLIND_GUESS.includes(p.blindGuess)) throw new InputError('invalidGuess', 'blindGuess')
  const tradeAmount = toUnits(p.tradeAmount, 'tradeAmount')
  if (tradeAmount === 0n) throw new InputError('zeroAmount', 'tradeAmount')
  const poolBase = toUnits(p.poolBase, 'poolBase')
  const poolQuote = toUnits(p.poolQuote, 'poolQuote')
  if (poolBase === 0n) throw new InputError('invalidLiquidity', 'poolBase')
  if (poolQuote === 0n) throw new InputError('invalidLiquidity', 'poolQuote')
  const feeBps = percentToBps(p.feePercent, 'feePercent', 10)
  const slippageBps = percentToBps(p.slippagePercent, 'slippagePercent', 50)
  const attackerAmount = toUnits(p.attackerAmount, 'attackerAmount')
  if (p.attackerEnabled && attackerAmount === 0n) throw new InputError('zeroAmount', 'attackerAmount')
  const seed = String(p.seed ?? '').trim()
  if (!seed || seed.length > 64) throw new InputError('invalidSeed', 'seed')
  const userFeeRate = (() => {
    const s = String(p.userFeeGwei ?? '').trim()
    if (!/^\d+(\.\d{1,9})?$/.test(s)) throw new InputError('invalidNumber', 'userFeeGwei')
    const v = parseUnits(s, 9)
    if (v === 0n) throw new InputError('zeroAmount', 'userFeeGwei')
    return v
  })()
  return {
    direction: p.direction,
    mode: p.mode,
    seed,
    tradeAmount,
    poolBase,
    poolQuote,
    feeBps,
    slippageBps,
    attackerEnabled: Boolean(p.attackerEnabled),
    attackerAmount,
    userFeeRate,
    gasUnits: BigInt(intInRange(p.gasUnits, 'gasUnits', 21000, 5000000)),
    backgroundTxCount: intInRange(p.backgroundTxCount, 'backgroundTxCount', 0, 12),
    blindGuess: p.blindGuess,
    refundBps: percentToBps(p.refundPercent, 'refundPercent', 100),
    searcherCount: intInRange(p.searcherCount, 'searcherCount', 0, 6),
  }
}
