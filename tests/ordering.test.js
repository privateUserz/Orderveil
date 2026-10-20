// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { makeTransaction, makeBundle, targetCommitmentOf, computeTxHash } from '../src/simulation/ordering/transaction.js'
import { runGateway, orderGeneral, deriveSalt, tieBreakKey, searcherView, orderPublicBlock } from '../src/simulation/ordering/engine.js'
import { RULESET, BUNDLE_STATUS } from '../src/simulation/ordering/ruleset.js'
import { ZERO_HASH, compareHex } from '../src/simulation/core/hash.js'

const payload = (n = 1) => ({ kind: 'swap', side: 'buy', amountIn: String(n * 1000), minOut: '0', gasUnits: '100000' })
const tx = (id, fee, extra = {}) =>
  makeTransaction({ transactionId: id, sender: `sim:${id}`, nonce: 0, effectiveFeeRate: fee, arrivalTick: 0, mode: 'protected', payload: payload(), ...extra })

describe('deterministic general ordering', () => {
  const txs = [tx('a', '100'), tx('b', '300'), tx('c', '200'), tx('d', '200'), tx('e', '200')]

  it('same inputs + salt => identical order, regardless of input order', () => {
    const salt = deriveSalt('s', ZERO_HASH, 0)
    const o1 = orderGeneral(txs, salt).map((t) => t.transactionId)
    const o2 = orderGeneral([...txs].reverse(), salt).map((t) => t.transactionId)
    expect(o1).toEqual(o2)
  })

  it('orders by effective fee rate descending', () => {
    const o = orderGeneral(txs, deriveSalt('s', ZERO_HASH, 0))
    expect(o[0].transactionId).toBe('b')
    expect(o[o.length - 1].transactionId).toBe('a')
  })

  it('breaks ties with H(txHash || salt) ascending', () => {
    const salt = deriveSalt('s', ZERO_HASH, 0)
    const ties = orderGeneral(txs, salt).filter((t) => t.effectiveFeeRate === '200')
    const keys = ties.map((t) => tieBreakKey(t.txHash, salt))
    expect([...keys].sort(compareHex)).toEqual(keys)
  })

  it('different salts can reorder ties but never cross fee levels', () => {
    const orders = new Set()
    for (let i = 0; i < 12; i++) {
      const o = orderGeneral(txs, deriveSalt(`seed-${i}`, ZERO_HASH, 0)).map((t) => t.transactionId)
      expect(o[0]).toBe('b')
      expect(o[4]).toBe('a')
      orders.add(o.join(''))
    }
    expect(orders.size).toBeGreaterThan(1)
  })

  it('preserves per-sender nonce order even when a later nonce pays more', () => {
    const t0 = makeTransaction({ transactionId: 'x0', sender: 'sim:x', nonce: 0, effectiveFeeRate: '1', arrivalTick: 0, mode: 'protected', payload: payload() })
    const t1 = makeTransaction({ transactionId: 'x1', sender: 'sim:x', nonce: 1, effectiveFeeRate: '999', arrivalTick: 0, mode: 'protected', payload: payload() })
    const o = orderGeneral([t1, t0, tx('y', '500')], deriveSalt('s', ZERO_HASH, 0)).map((t) => t.transactionId)
    expect(o.indexOf('x0')).toBeLessThan(o.indexOf('x1'))
  })

  it('salt depends on seed, parent hash and tick', () => {
    const a = deriveSalt('s', ZERO_HASH, 0)
    expect(deriveSalt('s', ZERO_HASH, 0)).toBe(a)
    expect(deriveSalt('t', ZERO_HASH, 0)).not.toBe(a)
    expect(deriveSalt('s', ZERO_HASH, 1)).not.toBe(a)
    expect(deriveSalt('s', '0x' + '11'.repeat(32), 0)).not.toBe(a)
  })
})

describe('gateway ticks and SubBlocks', () => {
  it('freezes protected txs at arrival tick and opt-in txs after the 5-tick delay', () => {
    const p = tx('p', '10', { arrivalTick: 2 })
    const o = tx('o', '10', { arrivalTick: 1, mode: 'optin' })
    const r = runGateway({ transactions: [p, o], seed: 's' })
    const tickOf = (h) => r.ticks.find((t) => t.frozenSet.includes(h)).tick
    expect(tickOf(p.txHash)).toBe(2)
    expect(tickOf(o.txHash)).toBe(1 + RULESET.optInDelayTicks)
    expect(r.ticks.map((t) => t.tick)).toEqual([1, 2, 3, 4, 5, 6])
    expect(r.ticks[0].logicalTimeMs).toBe(20)
  })

  it('chains SubBlocks by parent hash and records required fields (no enclaveSig)', () => {
    const r = runGateway({ transactions: [tx('a', '1'), tx('b', '2', { arrivalTick: 3 })], seed: 's' })
    expect(r.ticks[0].subBlock.parentSubBlockHash).toBe(ZERO_HASH)
    for (let i = 1; i < r.ticks.length; i++) expect(r.ticks[i].subBlock.parentSubBlockHash).toBe(r.ticks[i - 1].subBlockHash)
    const keys = Object.keys(r.ticks[0].subBlock)
    for (const k of ['gatewayId', 'workloadId', 'rulesetVersion', 'term', 'slot', 'tick', 'parentSubBlockHash', 'inputCommitment', 'payloadHash']) expect(keys).toContain(k)
    expect(keys).not.toContain('enclaveSig')
  })

  it('is fully reproducible', () => {
    const txs = [tx('a', '5'), tx('b', '5'), tx('c', '7', { arrivalTick: 1, mode: 'optin' })]
    const r1 = runGateway({ transactions: txs, seed: 'seed' })
    const r2 = runGateway({ transactions: [...txs].reverse(), seed: 'seed' })
    expect(r1.finalSubBlockHash).toBe(r2.finalSubBlockHash)
    expect(runGateway({ transactions: txs, seed: 'other' }).finalSubBlockHash).not.toBe(r1.finalSubBlockHash)
  })

  it('rejects tampered or duplicate transactions', () => {
    const a = tx('a', '5')
    expect(() => runGateway({ transactions: [{ ...a, effectiveFeeRate: '6' }], seed: 's' })).toThrow('TX_HASH_MISMATCH')
    expect(() => runGateway({ transactions: [a, a], seed: 's' })).toThrow('DUPLICATE_TX')
    expect(() => runGateway({ transactions: [a], seed: '' })).toThrow('MISSING_SEED')
  })
})

describe('protected vs opt-in disclosure', () => {
  const prot = tx('prot', '10', { arrivalTick: 1 })
  const opt = tx('opt', '10', { arrivalTick: 1, mode: 'optin' })

  it('protected transactions produce no hints and leak nothing to searchers', () => {
    const r = runGateway({ transactions: [prot, opt], seed: 's' })
    const view = JSON.stringify(searcherView(r))
    expect(r.hints).toHaveLength(1)
    expect(view).not.toContain(prot.txHash)
    expect(view).not.toContain('sim:prot')
    expect(view).not.toContain(opt.txHash) // signed hash stays private; searchers get a commitment
    expect(view).toContain(targetCommitmentOf('s', opt.txHash))
  })

  it('hint carries the unsigned body only', () => {
    const r = runGateway({ transactions: [opt], seed: 's' })
    expect(Object.keys(r.hints[0].body).sort()).toEqual(['effectiveFeeRate', 'nonce', 'payload', 'sender'])
  })
})

describe('after-ref bundles', () => {
  const seed = 's'
  const opt = tx('opt', '10', { arrivalTick: 1, mode: 'optin' })
  const prot = tx('prot', '10', { arrivalTick: 1 })
  const commitment = targetCommitmentOf(seed, opt.txHash)
  const member = (id) => ({ transactionId: id, sender: `sim:${id}`, nonce: 0, effectiveFeeRate: '1', arrivalTick: 2, payload: payload(2) })
  const bundle = (id, extra = {}) => makeBundle({ bundleId: id, searcher: `sim:${id}`, afterRef: commitment, committedTip: '100', arrivalTick: 2, validFromTick: 2, validToTick: 6, transactions: [member(`${id}-m`)], ...extra })
  const status = (r, id) => r.bundleDecisions.find((d) => d.bundleId === id).status

  it('places the winning backrun immediately after its target', () => {
    const r = runGateway({ transactions: [opt, prot, tx('other', '9', { arrivalTick: 6 })], bundles: [bundle('b1')], seed })
    const order = r.finalOrder.map((e) => e.transactionId)
    expect(order.indexOf('b1-m')).toBe(order.indexOf('opt') + 1)
    expect(status(r, 'b1')).toBe(BUNDLE_STATUS.INCLUDED)
  })

  it('selects by highest committed tip, deterministically', () => {
    const r = runGateway({ transactions: [opt], bundles: [bundle('low', { committedTip: '50' }), bundle('high', { committedTip: '500' })], seed })
    expect(status(r, 'high')).toBe(BUNDLE_STATUS.INCLUDED)
    expect(status(r, 'low')).toBe(BUNDLE_STATUS.OUTBID)
  })

  it('equal tips resolve by H(bundleHash || salt), same result every run', () => {
    const bs = [bundle('t1'), bundle('t2'), bundle('t3')]
    const w1 = runGateway({ transactions: [opt], bundles: bs, seed }).bundleDecisions.find((d) => d.status === 'included').bundleId
    const w2 = runGateway({ transactions: [opt], bundles: [...bs].reverse(), seed }).bundleDecisions.find((d) => d.status === 'included').bundleId
    expect(w1).toBe(w2)
  })

  it('forbids before-ref', () => {
    const r = runGateway({ transactions: [opt], bundles: [bundle('bad', { beforeRef: commitment })], seed })
    expect(status(r, 'bad')).toBe(BUNDLE_STATUS.REJECTED_BEFORE_REF)
    expect(r.finalOrder.map((e) => e.transactionId)).toEqual(['opt'])
  })

  it('forbids after-ref on protected targets (by hash or guessed commitment)', () => {
    const byHash = bundle('h', { afterRef: prot.txHash })
    const byCommit = bundle('c', { afterRef: targetCommitmentOf(seed, prot.txHash) })
    const r = runGateway({ transactions: [opt, prot], bundles: [byHash, byCommit], seed })
    expect(status(r, 'h')).toBe(BUNDLE_STATUS.REJECTED_PROTECTED_TARGET)
    expect(status(r, 'c')).toBe(BUNDLE_STATUS.REJECTED_PROTECTED_TARGET)
  })

  it('rejects unknown targets, late, out-of-window, empty and below-floor bundles', () => {
    const r = runGateway({
      transactions: [opt],
      bundles: [
        bundle('unknown', { afterRef: '0x' + 'ab'.repeat(32) }),
        bundle('rawhash', { afterRef: opt.txHash }),
        bundle('late', { arrivalTick: 6 }),
        bundle('early', { arrivalTick: 0, validFromTick: 0 }),
        bundle('window', { validToTick: 5 }),
        bundle('empty', { transactions: [] }),
        bundle('floor', { committedTip: '0' }),
      ],
      seed,
    })
    expect(status(r, 'unknown')).toBe(BUNDLE_STATUS.REJECTED_UNKNOWN_TARGET)
    expect(status(r, 'rawhash')).toBe(BUNDLE_STATUS.REJECTED_UNKNOWN_TARGET)
    expect(status(r, 'late')).toBe(BUNDLE_STATUS.REJECTED_LATE)
    expect(status(r, 'early')).toBe(BUNDLE_STATUS.REJECTED_BEFORE_DISCLOSURE)
    expect(status(r, 'window')).toBe(BUNDLE_STATUS.REJECTED_VALIDITY_WINDOW)
    expect(status(r, 'empty')).toBe(BUNDLE_STATUS.REJECTED_EMPTY)
    expect(status(r, 'floor')).toBe(BUNDLE_STATUS.REJECTED_TIP_FLOOR)
  })

  it('a bundle tampered after hashing is refused', () => {
    const b = bundle('t')
    expect(() => runGateway({ transactions: [opt], bundles: [{ ...b, committedTip: '999999' }], seed })).toThrow('BUNDLE_HASH_MISMATCH')
  })
})

describe('public block baseline', () => {
  it('uses the same deterministic fee ordering', () => {
    const txs = ['a', 'b', 'c'].map((id, i) => makeTransaction({ transactionId: id, sender: `sim:${id}`, nonce: 0, effectiveFeeRate: String(i + 1), arrivalTick: 0, mode: 'public', payload: payload() }))
    expect(orderPublicBlock({ transactions: txs, seed: 's' }).finalOrder.map((e) => e.transactionId)).toEqual(['c', 'b', 'a'])
    expect(computeTxHash(txs[0])).toBe(txs[0].txHash)
  })
})
