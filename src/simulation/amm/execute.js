// Sequential execution of an ordered transaction list against one AMM pool.
// - Ordinary transactions that fail (slippage, zero output) are recorded as `reverted`,
//   leave the pool unchanged, and still pay the simulated gas.
// - Atomic bundle members execute all-or-nothing; a failing group is `excluded` without
//   state change or gas (models the proposal's revert protection for bundles).
// - An after-ref group whose target did not execute is excluded as well.
// - payload.amountIn === 'balance' spends the sender's full simulated balance of the input token.
import { SIDE, swap, spotPriceX18 } from './pool.js'

function emptyBalance() {
  return { base: 0n, quote: 0n, gasBase: 0n, lpFeeBase: 0n, lpFeeQuote: 0n }
}

function cloneBalances(map) {
  const out = new Map()
  for (const [k, v] of map) out.set(k, { ...v })
  return out
}

function resolveAmountIn(payload, bal) {
  if (payload.amountIn === 'balance') return payload.side === SIDE.BUY ? bal.quote : bal.base
  return BigInt(payload.amountIn)
}

function applyOne(pool, balances, tx) {
  const bal = balances.get(tx.sender) ?? emptyBalance()
  balances.set(tx.sender, bal)
  const { payload } = tx
  const gasCost = BigInt(payload.gasUnits ?? 0) * BigInt(tx.effectiveFeeRate)
  const amountIn = resolveAmountIn(payload, bal)
  if (amountIn <= 0n) {
    return { pool, ok: false, reason: 'NO_BALANCE', amountIn: 0n, amountOut: 0n, lpFee: 0n, gasCost }
  }
  const res = swap(pool, payload.side, amountIn, BigInt(payload.minOut ?? 0))
  if (!res.ok) return { pool, ok: false, reason: res.reason, amountIn, amountOut: 0n, lpFee: 0n, gasCost, quotedOut: res.quotedOut }
  if (payload.side === SIDE.BUY) {
    bal.quote -= amountIn
    bal.base += res.amountOut
    bal.lpFeeQuote += res.lpFee
  } else {
    bal.base -= amountIn
    bal.quote += res.amountOut
    bal.lpFeeBase += res.lpFee
  }
  return { pool: res.pool, ok: true, reason: null, amountIn, amountOut: res.amountOut, lpFee: res.lpFee, gasCost }
}

export function executeOrder({ pool, finalOrder, txByHash }) {
  let state = pool
  let balances = new Map()
  const steps = []
  let i = 0
  while (i < finalOrder.length) {
    const entry = finalOrder[i]
    if (entry.group) {
      let j = i
      while (j < finalOrder.length && finalOrder[j].group === entry.group) j++
      const members = finalOrder.slice(i, j)
      let tmpPool = state
      const tmpBalances = cloneBalances(balances)
      const memberSteps = []
      let failed = null
      // an after-ref backrun only makes sense if its target actually executed
      if (entry.afterRefTarget) {
        const target = steps.find((s) => s.txHash === entry.afterRefTarget)
        if (!target || target.status !== 'executed') failed = 'TARGET_NOT_EXECUTED'
      }
      for (const m of failed ? [] : members) {
        const tx = txByHash.get(m.txHash)
        const before = tmpPool
        const r = applyOne(tmpPool, tmpBalances, tx)
        if (!r.ok) {
          failed = r.reason
          break
        }
        tmpPool = r.pool
        memberSteps.push({ m, tx, r, before })
      }
      if (failed) {
        for (const m of members) {
          const tx = txByHash.get(m.txHash)
          steps.push(stepRecord(m, tx, state, state, { ok: false, reason: `BUNDLE_EXCLUDED:${failed}`, amountIn: 0n, amountOut: 0n, lpFee: 0n, gasCost: 0n }, 'excluded'))
        }
      } else {
        for (const { m, tx, r, before } of memberSteps) {
          tmpBalances.get(tx.sender).gasBase += r.gasCost
          steps.push(stepRecord(m, tx, before, r.pool, r, 'executed'))
        }
        state = tmpPool
        balances = tmpBalances
      }
      i = j
      continue
    }
    const tx = txByHash.get(entry.txHash)
    if (!tx) throw new Error(`Unknown tx in order: ${entry.txHash}`)
    const before = state
    const r = applyOne(state, balances, tx)
    balances.get(tx.sender).gasBase += r.gasCost
    if (r.ok) state = r.pool
    steps.push(stepRecord(entry, tx, before, state, r, r.ok ? 'executed' : 'reverted'))
    i++
  }
  return { steps, finalPool: state, balances }
}

function stepRecord(entry, tx, before, after, r, status) {
  return {
    txHash: tx.txHash,
    transactionId: tx.transactionId,
    sender: tx.sender,
    tick: entry.tick,
    group: entry.group ?? null,
    side: tx.payload.side,
    effectiveFeeRate: tx.effectiveFeeRate,
    amountIn: r.amountIn,
    amountOut: r.amountOut,
    lpFee: r.lpFee,
    gasCost: r.gasCost,
    status,
    reason: r.reason,
    poolBefore: { reserveBase: before.reserveBase, reserveQuote: before.reserveQuote },
    poolAfter: { reserveBase: after.reserveBase, reserveQuote: after.reserveQuote },
    priceAfterX18: spotPriceX18(after),
  }
}
