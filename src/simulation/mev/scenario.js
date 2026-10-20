// Scenario builder: turns Playground parameters into concrete experiment transactions,
// orders them (public block or simulated gateway), executes them on the AMM and derives metrics.
// Every number shown in the UI comes from here. No fixed percentages anywhere.
import { BPS, ONE } from '../core/units.js'
import { drawBool, drawRange } from '../core/prng.js'
import { SIDE, createPool, quoteSwap, swap, spotPriceX18, executionPriceX18, minOutForSlippage, opposite } from '../amm/pool.js'
import { optimalArbitrage } from '../amm/arbitrage.js'
import { executeOrder } from '../amm/execute.js'
import { RULESET, MODES } from '../ordering/ruleset.js'
import { makeTransaction, makeBundle } from '../ordering/transaction.js'
import { runGateway, orderPublicBlock, classify } from '../ordering/engine.js'
import { normalizeParams } from './params.js'

export const USER_TICK = 1
export const SEARCHER_REVERT_TOLERANCE_BPS = 50n
export const BACKGROUND_SLIPPAGE_BPS = 500n
export const PROPOSAL_VALIDATOR_SHARE_BPS = 7500n // proposal §8.1 starting share; refunds negotiated inside the gateway share in the proposal — simplified here
const ONE_GWEI = 10n ** 9n

export function roleOf(transactionId) {
  if (transactionId === 'user') return 'user'
  if (transactionId.startsWith('attacker')) return 'attacker'
  if (transactionId.startsWith('searcher')) return 'searcher'
  return 'background'
}

function ppm(numerator, denominator) {
  if (denominator === 0n) return 0
  return Number((numerator * 1_000_000n) / denominator) / 1_000_000
}

function convertAmount(amount, fromSide, toSide, pool) {
  // attackerAmount is denominated in the user's input token; convert at the initial spot if the
  // blind guess trades the other direction.
  if (fromSide === toSide) return amount
  return fromSide === SIDE.BUY ? (amount * pool.reserveBase) / pool.reserveQuote : (amount * pool.reserveQuote) / pool.reserveBase
}

function buildBackground(np, pool, mode) {
  const txs = []
  const maxTick = USER_TICK + RULESET.optInDelayTicks + 1
  for (let i = 0; i < np.backgroundTxCount; i++) {
    const side = drawBool(np.seed, 'bg-side', i) ? SIDE.BUY : SIDE.SELL
    const reserveIn = side === SIDE.BUY ? pool.reserveQuote : pool.reserveBase
    const amountIn = (reserveIn * drawRange(np.seed, 'bg-size', i, 5, 50)) / BPS
    const fee = drawRange(np.seed, 'bg-fee', i, 5n * 10n ** 8n, 25n * 10n ** 8n)
    const arrivalTick = Number(drawRange(np.seed, 'bg-tick', i, 0, maxTick))
    const minOut = minOutForSlippage(quoteSwap(pool, side, amountIn), BACKGROUND_SLIPPAGE_BPS)
    txs.push(
      makeTransaction({
        transactionId: `bg-${i + 1}`,
        sender: `sim:bg-${i + 1}`,
        nonce: 0,
        effectiveFeeRate: fee,
        arrivalTick,
        mode,
        payload: { kind: 'swap', side, amountIn: amountIn.toString(), minOut: minOut.toString(), gasUnits: np.gasUnits.toString() },
      }),
    )
  }
  return txs
}

function swapPayload(side, amountIn, minOut, gasUnits) {
  return { kind: 'swap', side, amountIn: typeof amountIn === 'string' ? amountIn : amountIn.toString(), minOut: minOut.toString(), gasUnits: gasUnits.toString() }
}

function blindGuessSide(np) {
  if (np.blindGuess === 'same') return np.direction
  if (np.blindGuess === 'opposite') return opposite(np.direction)
  return drawBool(np.seed, 'blind-guess', 0) ? SIDE.BUY : SIDE.SELL
}

/** Largest front-run (in the user's input token) that still lets the user's minOut pass. */
export function maxFrontrunWithinSlippage(rawOrNormalized) {
  const np = rawOrNormalized.tradeAmount && typeof rawOrNormalized.tradeAmount === 'bigint' ? rawOrNormalized : normalizeParams(rawOrNormalized)
  const pool = createPool({ reserveBase: np.poolBase, reserveQuote: np.poolQuote, feeBps: np.feeBps })
  const minOut = minOutForSlippage(quoteSwap(pool, np.direction, np.tradeAmount), np.slippageBps)
  const ok = (a) => {
    if (a === 0n) return true
    const f = swap(pool, np.direction, a, 0n)
    if (!f.ok) return false
    return quoteSwap(f.pool, np.direction, np.tradeAmount) >= minOut
  }
  let lo = 0n
  let hi = np.direction === SIDE.BUY ? pool.reserveQuote : pool.reserveBase
  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n
    if (ok(mid)) lo = mid
    else hi = mid - 1n
  }
  return lo
}

/** Build the experiment's input set (transactions + bundles) for one execution mode. */
export function buildInputs(np) {
  const pool = createPool({ reserveBase: np.poolBase, reserveQuote: np.poolQuote, feeBps: np.feeBps })
  const mode = np.mode
  const bgMode = mode === 'public' ? MODES.PUBLIC : MODES.PROTECTED
  const background = buildBackground(np, pool, bgMode)
  const expectedOut = quoteSwap(pool, np.direction, np.tradeAmount)
  const minOut = minOutForSlippage(expectedOut, np.slippageBps)
  const userTx = makeTransaction({
    transactionId: 'user',
    sender: 'sim:user',
    nonce: 0,
    effectiveFeeRate: np.userFeeRate,
    arrivalTick: USER_TICK,
    mode: mode === 'public' ? MODES.PUBLIC : mode === 'optin' ? MODES.OPTIN : MODES.PROTECTED,
    payload: swapPayload(np.direction, np.tradeAmount, minOut, np.gasUnits),
  })
  const maxBgFee = background.reduce((m, t) => (BigInt(t.effectiveFeeRate) > m ? BigInt(t.effectiveFeeRate) : m), 0n)
  const highFee = (np.userFeeRate > maxBgFee ? np.userFeeRate : maxBgFee) + ONE_GWEI
  const attacker = []
  let attackerInfo = null
  if (np.attackerEnabled) {
    if (mode === 'public') {
      // Sees the user's pending transaction in the public mempool: classic sandwich via fee priority.
      attacker.push(
        makeTransaction({ transactionId: 'attacker-front', sender: 'sim:attacker', nonce: 0, effectiveFeeRate: highFee, arrivalTick: USER_TICK, mode: MODES.PUBLIC, payload: swapPayload(np.direction, np.attackerAmount, 0n, np.gasUnits) }),
        makeTransaction({ transactionId: 'attacker-back', sender: 'sim:attacker', nonce: 1, effectiveFeeRate: np.userFeeRate > 1n ? np.userFeeRate - 1n : 1n, arrivalTick: USER_TICK, mode: MODES.PUBLIC, payload: swapPayload(opposite(np.direction), 'balance', 0n, np.gasUnits) }),
      )
      attackerInfo = { strategy: 'sandwich', frontSide: np.direction, sawUserTx: true }
    } else if (mode === 'protected') {
      // Cannot see the target. Proposal §05 residual risk: a blind, high-fee front leg may coincidentally succeed.
      const guess = blindGuessSide(np)
      const amt = convertAmount(np.attackerAmount, np.direction, guess, pool)
      attacker.push(
        makeTransaction({ transactionId: 'attacker-blind-front', sender: 'sim:attacker', nonce: 0, effectiveFeeRate: highFee, arrivalTick: USER_TICK, mode: MODES.PROTECTED, payload: swapPayload(guess, amt, 0n, np.gasUnits) }),
        makeTransaction({ transactionId: 'attacker-exit', sender: 'sim:attacker', nonce: 1, effectiveFeeRate: np.userFeeRate, arrivalTick: USER_TICK + 1, mode: MODES.PROTECTED, payload: swapPayload(opposite(guess), 'balance', 0n, np.gasUnits) }),
      )
      attackerInfo = { strategy: 'blind-front-leg', frontSide: guess, guessedCorrectly: guess === np.direction, sawUserTx: false }
    } else {
      // Opt-in hint discloses the unsigned body. No before-ref exists, but an ordinary high-fee
      // transaction frozen in an earlier tick still executes first (Orderveil model finding).
      attacker.push(
        makeTransaction({ transactionId: 'attacker-informed-front', sender: 'sim:attacker', nonce: 0, effectiveFeeRate: highFee, arrivalTick: USER_TICK + 1, mode: MODES.PROTECTED, payload: swapPayload(np.direction, np.attackerAmount, 0n, np.gasUnits) }),
        makeTransaction({ transactionId: 'attacker-exit', sender: 'sim:attacker', nonce: 1, effectiveFeeRate: np.userFeeRate, arrivalTick: USER_TICK + RULESET.optInDelayTicks + 1, mode: MODES.PROTECTED, payload: swapPayload(opposite(np.direction), 'balance', 0n, np.gasUnits) }),
      )
      attackerInfo = { strategy: 'informed-front-leg', frontSide: np.direction, sawUserTx: true, viaHint: true }
    }
  }
  const transactions = [...background, userTx, ...attacker]
  const bundles = []
  let hint = null
  if (mode === 'optin') {
    // Searchers only see the published hint, never the protected set.
    const { hints } = classify(transactions.filter((t) => t.mode === MODES.OPTIN || t.mode === MODES.PROTECTED), { seed: np.seed })
    hint = hints.find((h) => h.body.sender === 'sim:user')
    const target = hint.body.payload
    const predicted = swap(pool, target.side, BigInt(target.amountIn), 0n)
    const arb = predicted.ok ? optimalArbitrage(predicted.pool, np.poolBase, np.poolQuote) : null
    if (arb) {
      const gasQuote = (np.gasUnits * np.userFeeRate * np.poolQuote) / np.poolBase
      const net = arb.profitQuote - gasQuote
      if (net > 0n) {
        for (let i = 0; i < np.searcherCount; i++) {
          const bidBps = drawRange(np.seed, 'searcher-bid', i, 3000, 9000)
          const tipWei = (((net * bidBps) / BPS) * np.poolBase) / np.poolQuote
          const arrivalTick = USER_TICK + 1 + (i % (RULESET.optInDelayTicks - 1))
          const member = makeTransaction({
            transactionId: `searcher-${i + 1}-backrun`,
            sender: `sim:searcher-${i + 1}`,
            nonce: 0,
            effectiveFeeRate: np.userFeeRate,
            arrivalTick,
            mode: MODES.BUNDLE,
            payload: swapPayload(arb.side, arb.amountIn, minOutForSlippage(arb.expectedOut, SEARCHER_REVERT_TOLERANCE_BPS), np.gasUnits),
          })
          bundles.push(
            makeBundle({
              bundleId: `bundle-s${i + 1}`,
              searcher: `sim:searcher-${i + 1}`,
              afterRef: hint.targetCommitment,
              committedTip: tipWei,
              arrivalTick,
              validFromTick: USER_TICK + 1,
              validToTick: hint.expiryTick,
              transactions: [member],
            }),
          )
        }
      }
    }
  }
  return { pool, expectedOut, minOut, userTx, transactions, bundles, attackerInfo, hint }
}

function valueInQuote(base, quote, np) {
  return quote + (base * np.poolQuote) / np.poolBase
}

/** Order + execute one mode. Pure function of normalized params. */
export function runScenario(np) {
  const inputs = buildInputs(np)
  const { pool, transactions, bundles } = inputs
  const txByHash = new Map(transactions.map((t) => [t.txHash, t]))
  for (const b of bundles) for (const m of b.transactions) txByHash.set(m.txHash, m)

  let ordering
  if (np.mode === 'public') {
    const pub = orderPublicBlock({ transactions, seed: np.seed })
    ordering = { kind: 'public', salt: pub.salt, entries: pub.entries, finalOrder: pub.finalOrder }
  } else {
    const gw = runGateway({ transactions, bundles, seed: np.seed })
    ordering = { kind: 'gateway', ...gw }
  }
  const exec = executeOrder({ pool, finalOrder: ordering.finalOrder, txByHash })
  const steps = exec.steps.map((s) => ({ ...s, role: roleOf(s.transactionId) }))
  return { np, inputs, ordering, exec, steps, metrics: computeMetrics(np, inputs, ordering, exec, steps) }
}

function computeMetrics(np, inputs, ordering, exec, steps) {
  const { pool, expectedOut, minOut } = inputs
  const spot0 = spotPriceX18(pool)
  const userStep = steps.find((s) => s.transactionId === 'user')
  const executed = userStep?.status === 'executed'
  const actualOut = executed ? userStep.amountOut : 0n
  const execPrice = executed ? executionPriceX18(np.direction, np.tradeAmount, actualOut) : 0n
  const quotePrice = executionPriceX18(np.direction, np.tradeAmount, expectedOut)
  const impact = (p) => (np.direction === SIDE.BUY ? ppm(p - spot0, spot0) : ppm(spot0 - p, spot0))
  const user = {
    status: userStep?.status ?? 'missing',
    reason: userStep?.reason ?? null,
    tick: userStep?.tick ?? null,
    position: steps.findIndex((s) => s.transactionId === 'user'),
    amountIn: np.tradeAmount,
    expectedOut,
    minOut,
    actualOut,
    gasCost: userStep?.gasCost ?? 0n,
    spotBeforeX18: spot0,
    quotedPriceX18: quotePrice,
    executionPriceX18: execPrice,
    priceImpact: executed ? impact(execPrice) : null,
    quotedImpact: impact(quotePrice),
    slippage: executed ? ppm(expectedOut - actualOut, expectedOut) : null,
    poolBeforeUser: userStep?.poolBefore ?? null,
  }

  let attacker = null
  const atkBal = exec.balances.get('sim:attacker')
  if (inputs.attackerInfo && atkBal) {
    const gross = valueInQuote(atkBal.base, atkBal.quote, np)
    const gas = (atkBal.gasBase * np.poolQuote) / np.poolBase
    attacker = {
      ...inputs.attackerInfo,
      deltaBase: atkBal.base,
      deltaQuote: atkBal.quote,
      grossProfitQuote: gross,
      lpFeesQuote: atkBal.lpFeeQuote + (atkBal.lpFeeBase * np.poolQuote) / np.poolBase,
      gasCostBase: atkBal.gasBase,
      gasCostQuote: gas,
      netProfitQuote: gross - gas,
      steps: steps.filter((s) => s.role === 'attacker').map((s) => ({ transactionId: s.transactionId, status: s.status, tick: s.tick })),
    }
  }

  let searchers = null
  if (np.mode === 'optin') {
    const decisions = ordering.bundleDecisions || []
    const tips = []
    for (const d of decisions) {
      const memberSteps = steps.filter((s) => s.group === d.bundleHash)
      const executedBundle = d.status === 'included' && memberSteps.length > 0 && memberSteps.every((s) => s.status === 'executed')
      const tipWei = BigInt(d.committedTip)
      const paid = executedBundle ? tipWei : 0n
      const refundWei = (paid * np.refundBps) / BPS
      const remainder = paid - refundWei
      const validatorWei = (remainder * PROPOSAL_VALIDATOR_SHARE_BPS) / BPS
      const b = inputs.bundles.find((x) => x.bundleHash === d.bundleHash)
      const bal = exec.balances.get(b.searcher)
      const searcherNet = executedBundle && bal ? valueInQuote(bal.base, bal.quote, np) - (bal.gasBase * np.poolQuote) / np.poolBase - (paid * np.poolQuote) / np.poolBase : 0n
      tips.push({
        bundleId: d.bundleId,
        searcher: b.searcher,
        status: d.status === 'included' && !executedBundle ? 'excluded_on_execution' : d.status,
        committedTipWei: tipWei,
        paidTipWei: paid,
        refundWei,
        validatorWei,
        gatewayWei: remainder - validatorWei,
        searcherNetQuote: searcherNet,
      })
    }
    const refundWei = tips.reduce((a, t) => a + t.refundWei, 0n)
    searchers = { hint: inputs.hint, tips, refundWei, refundQuote: (refundWei * np.poolQuote) / np.poolBase }
  }

  const timeline = [
    { index: 0, label: 'start', role: 'start', status: 'executed', price: Number(spot0) / 1e18 },
    ...steps.map((s, i) => ({ index: i + 1, label: s.transactionId, role: s.role, status: s.status, tick: s.tick, price: Number(s.priceAfterX18) / 1e18 })),
  ]
  return {
    user,
    attacker,
    searchers,
    timeline,
    poolBefore: { reserveBase: pool.reserveBase, reserveQuote: pool.reserveQuote },
    poolAfter: { reserveBase: exec.finalPool.reserveBase, reserveQuote: exec.finalPool.reserveQuote },
    spotAfterX18: spotPriceX18(exec.finalPool),
    failedCount: steps.filter((s) => s.status !== 'executed').length,
  }
}

/** Value of `amount` of the user's OUTPUT token, in quote units. */
export function outputValueQuote(np, amount) {
  return np.direction === SIDE.BUY ? (amount * np.poolQuote) / np.poolBase : amount
}

/** Run a mode with and without the adversary to isolate MEV-related loss. */
export function runExperiment(rawParams) {
  const np = normalizeParams(rawParams)
  const result = runScenario(np)
  const baseline = runScenario({ ...np, attackerEnabled: false })
  const u = result.metrics.user
  const b = baseline.metrics.user
  const bothExecuted = u.status === 'executed' && b.status === 'executed'
  const lossOut = bothExecuted ? b.actualOut - u.actualOut : null
  const refundQuote = result.metrics.searchers?.refundQuote ?? 0n
  return {
    params: np,
    result,
    baseline,
    mev: {
      comparable: bothExecuted,
      userFailedOnlyWithAdversary: u.status !== 'executed' && b.status === 'executed',
      lossOut,
      lossQuote: lossOut === null ? null : outputValueQuote(np, lossOut),
      refundQuote,
      netUserEffectQuote: lossOut === null ? null : refundQuote - outputValueQuote(np, lossOut),
    },
  }
}

export function runComparison(rawParams) {
  return {
    public: runExperiment({ ...rawParams, mode: 'public' }),
    protected: runExperiment({ ...rawParams, mode: 'protected' }),
    optin: runExperiment({ ...rawParams, mode: 'optin' }),
  }
}

export { ONE }
