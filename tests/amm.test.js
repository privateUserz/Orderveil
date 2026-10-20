// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createPool, getAmountOut, quoteSwap, swap, spotPriceX18, minOutForSlippage, kOf, SIDE, AmmError } from '../src/simulation/amm/pool.js'
import { optimalArbitrage } from '../src/simulation/amm/arbitrage.js'
import { executeOrder } from '../src/simulation/amm/execute.js'
import { toUnits, isqrt, ONE } from '../src/simulation/core/units.js'

const pool = () => createPool({ reserveBase: toUnits('1000'), reserveQuote: toUnits('600000'), feeBps: 25n })

describe('constant product math', () => {
  it('matches the closed-form output with fee', () => {
    // 6000 * 0.9975 = 5985 effective; out = 1000 * 5985 / (600000 + 5985)
    const out = getAmountOut(toUnits('6000'), toUnits('600000'), toUnits('1000'), 25n)
    const expected = (toUnits('1000') * toUnits('5985')) / (toUnits('600000') + toUnits('5985'))
    expect(out).toBe(expected)
  })

  it('zero fee keeps k exactly constant up to rounding in favour of the pool', () => {
    const p = createPool({ reserveBase: toUnits('100'), reserveQuote: toUnits('100'), feeBps: 0n })
    const r = swap(p, SIDE.BUY, toUnits('10'))
    expect(kOf(r.pool) >= kOf(p)).toBe(true)
    expect(r.amountOut).toBe((toUnits('100') * toUnits('10')) / toUnits('110'))
  })

  it('fee accrues to the pool (k grows)', () => {
    const p = pool()
    const r = swap(p, SIDE.SELL, toUnits('5'))
    expect(kOf(r.pool) > kOf(p)).toBe(true)
    expect(r.lpFee).toBe((toUnits('5') * 25n) / 10000n)
  })

  it('updates reserves in both directions', () => {
    const p = pool()
    const b = swap(p, SIDE.BUY, toUnits('6000'))
    expect(b.pool.reserveQuote).toBe(p.reserveQuote + toUnits('6000'))
    expect(b.pool.reserveBase).toBe(p.reserveBase - b.amountOut)
    const s = swap(p, SIDE.SELL, toUnits('10'))
    expect(s.pool.reserveBase).toBe(p.reserveBase + toUnits('10'))
    expect(s.pool.reserveQuote).toBe(p.reserveQuote - s.amountOut)
    expect(spotPriceX18(b.pool) > spotPriceX18(p)).toBe(true)
    expect(spotPriceX18(s.pool) < spotPriceX18(p)).toBe(true)
  })

  it('chains multiple swaps on updated state', () => {
    let p = pool()
    const outs = []
    for (let i = 0; i < 3; i++) {
      const r = swap(p, SIDE.BUY, toUnits('1000'))
      outs.push(r.amountOut)
      p = r.pool
    }
    expect(outs[0] > outs[1] && outs[1] > outs[2]).toBe(true)
  })

  it('rejects invalid liquidity and zero amounts', () => {
    expect(() => createPool({ reserveBase: 0n, reserveQuote: 1n, feeBps: 0n })).toThrow(AmmError)
    expect(() => createPool({ reserveBase: 1n, reserveQuote: 1n, feeBps: 10000n })).toThrow(AmmError)
    expect(() => quoteSwap(pool(), SIDE.BUY, 0n)).toThrow('ZERO_AMOUNT')
    expect(() => quoteSwap(pool(), 'hold', 1n)).toThrow('INVALID_SIDE')
  })

  it('fails on slippage without changing the pool', () => {
    const p = pool()
    const expected = quoteSwap(p, SIDE.BUY, toUnits('6000'))
    const r = swap(p, SIDE.BUY, toUnits('6000'), expected + 1n)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('SLIPPAGE_EXCEEDED')
    expect(r.pool).toBe(p)
  })

  it('minOut from slippage bps', () => {
    expect(minOutForSlippage(10000n, 100n)).toBe(9900n)
    expect(() => minOutForSlippage(1n, 10001n)).toThrow()
  })

  it('isqrt is exact floor', () => {
    for (const n of [0n, 1n, 2n, 15n, 16n, 17n, 10n ** 40n + 12345n]) {
      const r = isqrt(n)
      expect(r * r <= n && (r + 1n) * (r + 1n) > n).toBe(true)
    }
  })
})

describe('sandwich mechanics on the executor', () => {
  const tx = (id, sender, nonce, side, amountIn, minOut = '0') => ({ transactionId: id, txHash: id, sender, nonce, effectiveFeeRate: '1000000000', payload: { kind: 'swap', side, amountIn, minOut, gasUnits: '100000' } })

  function run(attackIn, minOutUser) {
    const order = ['front', 'user', 'back'].map((h) => ({ txHash: h, tick: 0, group: null }))
    const txByHash = new Map([
      ['front', tx('front', 'atk', 0, SIDE.BUY, toUnits(attackIn).toString())],
      ['user', tx('user', 'usr', 0, SIDE.BUY, toUnits('6000').toString(), minOutUser.toString())],
      ['back', tx('back', 'atk', 1, SIDE.SELL, 'balance')],
    ])
    return executeOrder({ pool: pool(), finalOrder: order, txByHash })
  }

  it('front-run worsens the user fill and the attacker sells back on updated state', () => {
    const clean = quoteSwap(pool(), SIDE.BUY, toUnits('6000'))
    const r = run('3000', 0n)
    const user = r.steps[1]
    expect(user.status).toBe('executed')
    expect(user.amountOut < clean).toBe(true)
    const atk = r.balances.get('atk')
    expect(atk.base).toBe(0n) // sold full balance
    expect(atk.quote > 0n).toBe(true) // profitable before gas at this size
  })

  it('user slippage limit makes the victim revert and the attacker lose on fees', () => {
    const clean = quoteSwap(pool(), SIDE.BUY, toUnits('6000'))
    const r = run('20000', minOutForSlippage(clean, 100n))
    expect(r.steps[1].status).toBe('reverted')
    expect(r.steps[1].reason).toBe('SLIPPAGE_EXCEEDED')
    expect(r.balances.get('atk').quote < 0n).toBe(true) // round-trip without victim loses 2x fee
    expect(r.balances.get('usr').gasBase > 0n).toBe(true) // failed tx still pays gas
  })

  it('atomic groups are all-or-nothing', () => {
    const order = [
      { txHash: 'a', tick: 0, group: 'g' },
      { txHash: 'b', tick: 0, group: 'g' },
    ]
    const txByHash = new Map([
      ['a', tx('a', 's', 0, SIDE.BUY, toUnits('100').toString())],
      ['b', tx('b', 's', 1, SIDE.BUY, toUnits('100').toString(), (10n ** 30n).toString())],
    ])
    const p = pool()
    const r = executeOrder({ pool: p, finalOrder: order, txByHash })
    expect(r.steps.every((s) => s.status === 'excluded')).toBe(true)
    expect(r.finalPool).toBe(p)
  })
})

describe('optimal arbitrage', () => {
  it('restores price towards the reference and is locally optimal', () => {
    const p0 = pool()
    const moved = swap(p0, SIDE.BUY, toUnits('30000')).pool
    const arb = optimalArbitrage(moved, p0.reserveBase, p0.reserveQuote)
    expect(arb.side).toBe(SIDE.SELL)
    expect(arb.profitQuote > 0n).toBe(true)
    const profitAt = (x) => quoteSwap(moved, SIDE.SELL, x) - (x * p0.reserveQuote) / p0.reserveBase
    const delta = arb.amountIn / 50n
    expect(profitAt(arb.amountIn) >= profitAt(arb.amountIn + delta)).toBe(true)
    expect(profitAt(arb.amountIn) >= profitAt(arb.amountIn - delta)).toBe(true)
  })

  it('returns null when the pool already matches the reference', () => {
    const p0 = pool()
    expect(optimalArbitrage(p0, p0.reserveBase, p0.reserveQuote)).toBe(null)
  })

  it('handles the underpriced side', () => {
    const p0 = pool()
    const moved = swap(p0, SIDE.SELL, toUnits('40')).pool
    const arb = optimalArbitrage(moved, p0.reserveBase, p0.reserveQuote)
    expect(arb.side).toBe(SIDE.BUY)
    expect(arb.profitQuote > 0n).toBe(true)
  })
})

describe('units', () => {
  it('parses decimals exactly', () => {
    expect(toUnits('1.5')).toBe(ONE + ONE / 2n)
    expect(() => toUnits('abc')).toThrow()
    expect(() => toUnits('-1')).toThrow()
    expect(() => toUnits('0.' + '1'.repeat(19))).toThrow()
  })
})
