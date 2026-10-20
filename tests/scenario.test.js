// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { runExperiment, runComparison, maxFrontrunWithinSlippage, buildInputs } from '../src/simulation/mev/scenario.js'
import { DEFAULT_PARAMS, normalizeParams } from '../src/simulation/mev/params.js'
import { InputError, toUnits } from '../src/simulation/core/units.js'

describe('parameter validation', () => {
  it('raises coded errors for invalid input', () => {
    const bad = [
      [{ tradeAmount: '0' }, 'zeroAmount'],
      [{ tradeAmount: 'abc' }, 'invalidNumber'],
      [{ poolBase: '0' }, 'invalidLiquidity'],
      [{ feePercent: '11' }, 'outOfRange'],
      [{ slippagePercent: '1.234' }, 'invalidPercent'],
      [{ seed: '' }, 'invalidSeed'],
      [{ mode: 'dark' }, 'invalidMode'],
    ]
    for (const [patch, code] of bad) {
      try {
        normalizeParams({ ...DEFAULT_PARAMS, ...patch })
        throw new Error('expected failure')
      } catch (e) {
        expect(e).toBeInstanceOf(InputError)
        expect(e.code).toBe(code)
      }
    }
  })
})

describe('public sandwich', () => {
  it('attacker front-runs and back-runs around the user; user loses vs baseline', () => {
    const e = runExperiment({ ...DEFAULT_PARAMS, mode: 'public', backgroundTxCount: '0' })
    const ids = e.result.steps.map((s) => s.transactionId)
    expect(ids).toEqual(['attacker-front', 'user', 'attacker-back'])
    expect(e.mev.comparable).toBe(true)
    expect(e.mev.lossOut > 0n).toBe(true)
    const a = e.result.metrics.attacker
    expect(a.netProfitQuote).toBe(a.grossProfitQuote - a.gasCostQuote)
  })

  it('an oversized front-run trips the user slippage and the attacker loses', () => {
    const e = runExperiment({ ...DEFAULT_PARAMS, mode: 'public', backgroundTxCount: '0', attackerAmount: '30000' })
    expect(e.result.metrics.user.status).toBe('reverted')
    expect(e.mev.userFailedOnlyWithAdversary).toBe(true)
    expect(e.result.metrics.attacker.netProfitQuote < 0n).toBe(true)
  })

  it('max front-run within slippage is the boundary', () => {
    const np = normalizeParams({ ...DEFAULT_PARAMS, backgroundTxCount: '0' })
    const max = maxFrontrunWithinSlippage(np)
    const fmt = (v) => (Number(v) / 1e18).toFixed(18)
    const ok = runExperiment({ ...DEFAULT_PARAMS, mode: 'public', backgroundTxCount: '0', attackerAmount: fmt(max) })
    expect(ok.result.metrics.user.status).toBe('executed')
    const over = runExperiment({ ...DEFAULT_PARAMS, mode: 'public', backgroundTxCount: '0', attackerAmount: fmt(max + toUnits('5')) })
    expect(over.result.metrics.user.status).toBe('reverted')
  })

  it('a loss-making sandwich is reported as a loss, not hidden', () => {
    const e = runExperiment({ ...DEFAULT_PARAMS, mode: 'public', backgroundTxCount: '0', tradeAmount: '10', attackerAmount: '5000' })
    expect(e.result.metrics.attacker.netProfitQuote < 0n).toBe(true)
  })
})

describe('protected path', () => {
  it('attacker cannot see the user tx; a wrong blind guess does not hurt the user', () => {
    const e = runExperiment({ ...DEFAULT_PARAMS, mode: 'protected', backgroundTxCount: '0', blindGuess: 'opposite' })
    expect(e.result.metrics.attacker.sawUserTx).toBe(false)
    expect(e.mev.lossOut <= 0n).toBe(true)
  })

  it('residual risk: a correct blind high-fee front leg can still hurt the user', () => {
    const e = runExperiment({ ...DEFAULT_PARAMS, mode: 'protected', backgroundTxCount: '0', blindGuess: 'same' })
    expect(e.mev.lossOut > 0n).toBe(true)
  })

  it('without an attacker the result equals the baseline (zero adversarial loss)', () => {
    const e = runExperiment({ ...DEFAULT_PARAMS, mode: 'protected', attackerEnabled: false })
    expect(e.mev.lossOut).toBe(0n)
  })
})

describe('opt-in path', () => {
  it('searchers see the hint only and the best tip backruns right after the user', () => {
    const e = runExperiment({ ...DEFAULT_PARAMS, mode: 'optin', attackerEnabled: false })
    const ids = e.result.steps.map((s) => s.transactionId)
    const u = ids.indexOf('user')
    expect(ids[u + 1]).toMatch(/^searcher-\d+-backrun$/)
    const tips = e.result.metrics.searchers.tips
    const winner = tips.find((t) => t.status === 'included')
    for (const t of tips) expect(winner.committedTipWei >= t.committedTipWei).toBe(true)
    expect(e.mev.refundQuote > 0n).toBe(true)
  })

  it('user inclusion is delayed by the opt-in window', () => {
    const e = runExperiment({ ...DEFAULT_PARAMS, mode: 'optin', attackerEnabled: false })
    expect(e.result.metrics.user.tick).toBe(1 + 5)
  })

  it('no refund when the target reverts (backrun excluded)', () => {
    const e = runExperiment({ ...DEFAULT_PARAMS, mode: 'optin', attackerAmount: '40000', backgroundTxCount: '0' })
    expect(e.result.metrics.user.status).toBe('reverted')
    expect(e.mev.refundQuote).toBe(0n)
  })
})

describe('comparison and determinism', () => {
  it('all modes share identical market inputs', () => {
    const c = runComparison(DEFAULT_PARAMS)
    const pools = Object.values(c).map((e) => e.result.metrics.poolBefore)
    expect(new Set(pools.map((p) => `${p.reserveBase}-${p.reserveQuote}`)).size).toBe(1)
    const exp = Object.values(c).map((e) => e.result.metrics.user.expectedOut)
    expect(new Set(exp).size).toBe(1)
  })

  it('same params => same inputs and same outcome', () => {
    const a = buildInputs(normalizeParams(DEFAULT_PARAMS))
    const b = buildInputs(normalizeParams(DEFAULT_PARAMS))
    expect(a.transactions.map((t) => t.txHash)).toEqual(b.transactions.map((t) => t.txHash))
    expect(runExperiment(DEFAULT_PARAMS).result.metrics.user.actualOut).toBe(runExperiment(DEFAULT_PARAMS).result.metrics.user.actualOut)
  })
})
