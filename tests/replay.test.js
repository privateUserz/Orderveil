// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { runScenario } from '../src/simulation/mev/scenario.js'
import { DEFAULT_PARAMS, normalizeParams } from '../src/simulation/mev/params.js'
import { buildExperimentRecord, serializeRecord, SIGNATURE_PURPOSE } from '../src/simulation/replay/record.js'
import { replayExperiment, parseRecord } from '../src/simulation/replay/replay.js'
import { makeTransaction } from '../src/simulation/ordering/transaction.js'

const key = new Uint8Array(32).fill(7)
const make = (mode = 'optin', extra = {}) => {
  const sc = runScenario(normalizeParams({ ...DEFAULT_PARAMS, mode, ...extra }))
  return JSON.parse(serializeRecord(buildExperimentRecord(sc, { secretKey: key, now: new Date('2026-01-01T00:00:00Z') })))
}
const failed = (r) => r.checks.filter((c) => !c.passed).map((c) => c.id)

describe('export / import', () => {
  it('exports valid JSON with commitments and a clearly scoped local signature', () => {
    const rec = make()
    const text = serializeRecord(rec)
    const parsed = parseRecord(text)
    expect(parsed.ok).toBe(true)
    expect(rec.classification).toBe('simulation')
    expect(rec.simulationSignature.purpose).toBe(SIGNATURE_PURPOSE)
    expect(JSON.stringify(rec)).not.toContain('"enclaveSig"')
    expect(rec.outputs.ordering.ticks.length).toBeGreaterThan(1)
    expect(parseRecord('{nope').ok).toBe(false)
  })

  it('identical inputs => identical experimentId and outputs (createdAt is not hashed)', () => {
    const a = make()
    const sc = runScenario(normalizeParams({ ...DEFAULT_PARAMS, mode: 'optin' }))
    const b = JSON.parse(serializeRecord(buildExperimentRecord(sc, { secretKey: key, now: new Date('2030-05-05T00:00:00Z') })))
    expect(a.experimentId).toBe(b.experimentId)
    expect(a.outputs).toEqual(b.outputs)
    expect(a.simulationSignature.digest).toBe(b.simulationSignature.digest)
  })
})

describe('replay', () => {
  for (const mode of ['public', 'protected', 'optin']) {
    it(`passes for an untouched ${mode} record`, () => {
      const r = replayExperiment(make(mode))
      expect(failed(r)).toEqual([])
      expect(r.passed).toBe(true)
    })
  }

  it('detects a tampered transaction even if its hash is recomputed', () => {
    const rec = make()
    const i = rec.inputs.transactions.findIndex((t) => t.transactionId === 'user')
    const t = rec.inputs.transactions[i]
    rec.inputs.transactions[i] = makeTransaction({ ...t, effectiveFeeRate: '999999999999' })
    const r = replayExperiment(rec)
    expect(r.passed).toBe(false)
    expect(failed(r)).toEqual(expect.arrayContaining(['inputsFromParameters', 'experimentId']))
  })

  it('detects a tampered transaction field without rehash', () => {
    const rec = make()
    rec.inputs.transactions[0].payload.amountIn = '1'
    const r = replayExperiment(rec)
    expect(failed(r)).toContain('transactionHashes')
  })

  it('detects a tampered salt', () => {
    const rec = make()
    rec.outputs.ordering.ticks[2].salt = '0x' + '00'.repeat(32)
    expect(failed(replayExperiment(rec))).toContain('salt')
  })

  it('detects a tampered seed', () => {
    const rec = make()
    rec.config.params.seed = 'another-seed'
    const r = replayExperiment(rec)
    expect(r.passed).toBe(false)
  })

  it('detects a tampered ordering result', () => {
    const rec = make('protected')
    const t = rec.outputs.ordering.ticks.find((x) => x.entries.length > 1)
    t.entries.reverse()
    const r = replayExperiment(rec)
    expect(failed(r)).toContain('ordering')
  })

  it('detects a tampered public ordering', () => {
    const rec = make('public')
    rec.outputs.ordering.order.reverse()
    expect(failed(replayExperiment(rec))).toContain('ordering')
  })

  it('detects a tampered input commitment', () => {
    const rec = make()
    rec.outputs.ordering.ticks[0].inputCommitment = '0x' + 'ff'.repeat(32)
    expect(failed(replayExperiment(rec))).toContain('inputCommitment')
  })

  it('detects tampered execution results and signatures', () => {
    const rec = make()
    rec.outputs.execution.steps[0].amountOut = '1'
    expect(failed(replayExperiment(rec))).toContain('execution')
    const rec2 = make()
    rec2.simulationSignature.signature = rec2.simulationSignature.signature.replace(/.$/, (c) => (c === '0' ? '1' : '0'))
    expect(failed(replayExperiment(rec2))).toEqual(['simulationSignature'])
  })

  it('rejects malformed records and unsupported rulesets', () => {
    expect(replayExperiment({}).passed).toBe(false)
    const rec = make()
    rec.ruleset.version = 'orderveil-sim/ruleset/9.9.9'
    expect(failed(replayExperiment(rec))).toContain('rulesetVersion')
    const rec2 = make()
    rec2.ruleset.optInDelayTicks = 3
    expect(failed(replayExperiment(rec2))).toContain('rulesetParameters')
  })
})
