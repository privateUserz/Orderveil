// Closed-form optimal arbitrage against an external reference price for a constant-product pool.
// Reference price P = refQuote / refBase (QUOTE per BASE). Fee factor g = (1 - fee).
//   pool overpriced  (spot > P): sell BASE x, maximise out(x) - x*P
//       => (Rb + g x)^2 = g Rb Rq / P  =>  x* = (sqrt(g Rb Rq / P) - Rb) / g
//   pool underpriced (spot < P): buy BASE with QUOTE y, maximise out(y)*P - y
//       => (Rq + g y)^2 = g Rb Rq P    =>  y* = (sqrt(g Rb Rq P) - Rq) / g
import { BPS, isqrt } from '../core/units.js'
import { SIDE, quoteSwap } from './pool.js'

export function optimalArbitrage(pool, refBase, refQuote) {
  refBase = BigInt(refBase)
  refQuote = BigInt(refQuote)
  const g = BPS - pool.feeBps
  const Rb = pool.reserveBase
  const Rq = pool.reserveQuote
  // spot vs reference: Rq/Rb ? refQuote/refBase
  const lhs = Rq * refBase
  const rhs = refQuote * Rb
  if (lhs === rhs) return null
  if (lhs > rhs) {
    // sqrt(g/BPS * Rb * Rq * refBase / refQuote) - Rb, then * BPS / g
    const root = isqrt((g * Rb * Rq * refBase) / (BPS * refQuote))
    if (root <= Rb) return null
    const amountIn = ((root - Rb) * BPS) / g
    if (amountIn <= 0n) return null
    const out = quoteSwap(pool, SIDE.SELL, amountIn)
    const costQuote = (amountIn * refQuote) / refBase
    const profitQuote = out - costQuote
    return profitQuote > 0n ? { side: SIDE.SELL, amountIn, expectedOut: out, profitQuote } : null
  }
  const root = isqrt((g * Rb * Rq * refQuote) / (BPS * refBase))
  if (root <= Rq) return null
  const amountIn = ((root - Rq) * BPS) / g
  if (amountIn <= 0n) return null
  const out = quoteSwap(pool, SIDE.BUY, amountIn)
  const valueQuote = (out * refQuote) / refBase
  const profitQuote = valueQuote - amountIn
  return profitQuote > 0n ? { side: SIDE.BUY, amountIn, expectedOut: out, profitQuote } : null
}
