import { formatUnits } from 'viem'

function trimDecimals(s, max = 6) {
  const [i, f = ''] = s.split('.')
  const frac = f.slice(0, max).replace(/0+$/, '')
  return frac ? `${i}.${frac}` : i
}

export function unitsToInput(value, max = 6) {
  return trimDecimals(formatUnits(BigInt(value), 18), max)
}

/** Convert a record's normalized params back into Playground form values. */
export function recordParamsToUi(p) {
  return {
    direction: p.direction,
    mode: p.mode,
    seed: p.seed,
    tradeAmount: unitsToInput(p.tradeAmount, 18),
    poolBase: unitsToInput(p.poolBase, 18),
    poolQuote: unitsToInput(p.poolQuote, 18),
    feePercent: trimDecimals(formatUnits(BigInt(p.feeBps), 2), 2),
    slippagePercent: trimDecimals(formatUnits(BigInt(p.slippageBps), 2), 2),
    attackerEnabled: Boolean(p.attackerEnabled),
    attackerAmount: unitsToInput(p.attackerAmount, 18),
    userFeeGwei: trimDecimals(formatUnits(BigInt(p.userFeeRate), 9), 9),
    gasUnits: String(p.gasUnits),
    backgroundTxCount: String(p.backgroundTxCount),
    blindGuess: p.blindGuess,
    refundPercent: trimDecimals(formatUnits(BigInt(p.refundBps), 2), 2),
    searcherCount: String(p.searcherCount),
  }
}
