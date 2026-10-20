// Constant-product AMM (x * y = k) with an input-side fee, Uniswap-V2 style.
// All amounts are BigInt in 18-decimal smallest units. The fee stays in the pool,
// so k grows slightly with every swap. Integer division rounds output down (pool-favourable).
import { BPS, ONE } from '../core/units.js'

export const SIDE = Object.freeze({ BUY: 'buy', SELL: 'sell' })
// buy  = spend QUOTE (e.g. USDT) to receive BASE (e.g. BNB)  -> base price goes up
// sell = spend BASE to receive QUOTE                       -> base price goes down

export class AmmError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

export function createPool({ reserveBase, reserveQuote, feeBps }) {
  const pool = {
    reserveBase: BigInt(reserveBase),
    reserveQuote: BigInt(reserveQuote),
    feeBps: BigInt(feeBps),
  }
  assertPool(pool)
  return Object.freeze(pool)
}

export function assertPool(pool) {
  if (pool.reserveBase <= 0n || pool.reserveQuote <= 0n) throw new AmmError('INVALID_LIQUIDITY')
  if (pool.feeBps < 0n || pool.feeBps >= BPS) throw new AmmError('INVALID_FEE')
}

/** amountOut = reserveOut * effIn / (reserveIn + effIn), effIn = amountIn * (1 - fee). */
export function getAmountOut(amountIn, reserveIn, reserveOut, feeBps) {
  amountIn = BigInt(amountIn)
  if (amountIn <= 0n) throw new AmmError('ZERO_AMOUNT')
  if (reserveIn <= 0n || reserveOut <= 0n) throw new AmmError('INVALID_LIQUIDITY')
  const inWithFee = amountIn * (BPS - BigInt(feeBps))
  const numerator = inWithFee * reserveOut
  const denominator = reserveIn * BPS + inWithFee
  return numerator / denominator
}

function reservesFor(pool, side) {
  return side === SIDE.BUY
    ? { reserveIn: pool.reserveQuote, reserveOut: pool.reserveBase }
    : { reserveIn: pool.reserveBase, reserveOut: pool.reserveQuote }
}

export function quoteSwap(pool, side, amountIn) {
  if (side !== SIDE.BUY && side !== SIDE.SELL) throw new AmmError('INVALID_SIDE')
  assertPool(pool)
  const { reserveIn, reserveOut } = reservesFor(pool, side)
  return getAmountOut(amountIn, reserveIn, reserveOut, pool.feeBps)
}

/**
 * Execute a swap against `pool`. Returns a new pool object; never mutates.
 * Fails (ok: false, pool unchanged) on slippage or zero output instead of throwing,
 * because failed transactions are part of the experiment output.
 */
export function swap(pool, side, amountIn, minOut = 0n) {
  amountIn = BigInt(amountIn)
  minOut = BigInt(minOut)
  const amountOut = quoteSwap(pool, side, amountIn)
  const lpFee = (amountIn * pool.feeBps) / BPS
  if (amountOut <= 0n) return { ok: false, reason: 'INSUFFICIENT_OUTPUT_AMOUNT', pool, amountOut: 0n, lpFee: 0n, quotedOut: amountOut }
  if (amountOut < minOut) return { ok: false, reason: 'SLIPPAGE_EXCEEDED', pool, amountOut: 0n, lpFee: 0n, quotedOut: amountOut }
  const next =
    side === SIDE.BUY
      ? { reserveBase: pool.reserveBase - amountOut, reserveQuote: pool.reserveQuote + amountIn, feeBps: pool.feeBps }
      : { reserveBase: pool.reserveBase + amountIn, reserveQuote: pool.reserveQuote - amountOut, feeBps: pool.feeBps }
  return { ok: true, reason: null, pool: Object.freeze(next), amountOut, lpFee, quotedOut: amountOut }
}

/** Spot price of BASE in QUOTE, scaled by 1e18. */
export function spotPriceX18(pool) {
  return (pool.reserveQuote * ONE) / pool.reserveBase
}

/** Execution price of a fill (QUOTE per BASE), scaled by 1e18. */
export function executionPriceX18(side, amountIn, amountOut) {
  if (amountIn <= 0n || amountOut <= 0n) return 0n
  return side === SIDE.BUY ? (amountIn * ONE) / amountOut : (amountOut * ONE) / amountIn
}

export function minOutForSlippage(expectedOut, slippageBps) {
  const s = BigInt(slippageBps)
  if (s < 0n || s > BPS) throw new AmmError('INVALID_SLIPPAGE')
  return (BigInt(expectedOut) * (BPS - s)) / BPS
}

export function opposite(side) {
  return side === SIDE.BUY ? SIDE.SELL : SIDE.BUY
}

export function kOf(pool) {
  return pool.reserveBase * pool.reserveQuote
}
