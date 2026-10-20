// Replay verification: recomputes every derived value from the record's raw inputs and
// compares it to what the record claims. Passing requires all checks to pass.
import { ed25519 } from '@noble/curves/ed25519.js'
import { canonicalize } from '../core/canonical.js'
import { hexToBytes, isHash } from '../core/hash.js'
import { RULESET, SUPPORTED_RULESETS } from '../ordering/ruleset.js'
import { computeTxHash, computeBundleHash } from '../ordering/transaction.js'
import { runGateway, orderPublicBlock } from '../ordering/engine.js'
import { createPool } from '../amm/pool.js'
import { executeOrder } from '../amm/execute.js'
import { buildInputs } from '../mev/scenario.js'
import {
  RECORD_SCHEMA,
  computeExperimentId,
  executionToRecord,
  orderingToRecord,
  recordDigest,
  recordToParams,
  paramsToRecord,
} from './record.js'

const same = (a, b) => canonicalize(a) === canonicalize(b)

export function parseRecord(text) {
  try {
    return { ok: true, record: JSON.parse(text) }
  } catch {
    return { ok: false, error: 'invalidJson' }
  }
}

function structureErrors(r) {
  const errs = []
  if (!r || typeof r !== 'object') return ['notObject']
  if (r.schema !== RECORD_SCHEMA) errs.push('schema')
  if (typeof r.experimentId !== 'string') errs.push('experimentId')
  if (!r.ruleset || typeof r.ruleset.version !== 'string') errs.push('ruleset')
  if (!r.config || !r.config.params || typeof r.config.params.seed !== 'string') errs.push('config')
  if (!r.inputs || !Array.isArray(r.inputs.transactions) || !Array.isArray(r.inputs.bundles)) errs.push('inputs')
  if (!r.outputs || !r.outputs.ordering || !Array.isArray(r.outputs.finalOrder) || !r.outputs.execution) errs.push('outputs')
  if (!r.simulationSignature || !isHash(r.simulationSignature.digest)) errs.push('simulationSignature')
  return errs
}

/**
 * @returns {{ passed: boolean, checks: Array<{id, passed, detail?}>, recomputed?: object }}
 */
export function replayExperiment(record) {
  const checks = []
  const add = (id, passed, detail) => checks.push({ id, passed: Boolean(passed), detail: detail ?? null })

  const structural = structureErrors(record)
  add('structure', structural.length === 0, structural.join(',') || null)
  if (structural.length) return { passed: false, checks }

  add('rulesetVersion', SUPPORTED_RULESETS.includes(record.ruleset.version), record.ruleset.version)
  add('rulesetParameters', same(record.ruleset, RULESET))
  if (!checks.every((c) => c.passed)) return { passed: false, checks }

  // 1. content hashes of every transaction and bundle
  const txs = record.inputs.transactions
  const bundles = record.inputs.bundles
  const badTx = txs.filter((t) => computeTxHash(t) !== t.txHash).map((t) => t.transactionId)
  const badBundle = bundles.filter((b) => (b.transactions || []).some((m) => computeTxHash(m) !== m.txHash) || computeBundleHash(b) !== b.bundleHash).map((b) => b.bundleId)
  add('transactionHashes', badTx.length === 0 && badBundle.length === 0, [...badTx, ...badBundle].join(',') || null)

  // 2. inputs must be exactly what the stated parameters + seed generate
  let np
  try {
    np = recordToParams(record.config.params)
    const rebuilt = buildInputs(np)
    add('inputsFromParameters', same({ t: rebuilt.transactions, b: rebuilt.bundles }, { t: txs, b: bundles }))
  } catch (e) {
    add('inputsFromParameters', false, e.code || e.message)
    return { passed: false, checks }
  }
  add('experimentId', computeExperimentId({ rulesetVersion: record.ruleset.version, params: paramsToRecord(np), inputs: record.inputs }) === record.experimentId)

  // 3. re-run ordering from the raw inputs
  let ordering
  try {
    if (record.outputs.ordering.kind === 'public') {
      const pub = orderPublicBlock({ transactions: txs, seed: np.seed })
      ordering = { kind: 'public', salt: pub.salt, finalOrder: pub.finalOrder, entries: pub.entries }
    } else {
      ordering = { kind: 'gateway', ...runGateway({ transactions: txs, bundles, seed: np.seed, gateway: record.config.gateway }) }
    }
  } catch (e) {
    add('ordering', false, e.code || e.message)
    return { passed: false, checks }
  }
  const recomputedOrdering = orderingToRecord(ordering)
  const claimed = record.outputs.ordering
  if (recomputedOrdering.kind !== claimed.kind) {
    add('ordering', false, 'kind')
  } else if (claimed.kind === 'public') {
    add('salt', recomputedOrdering.salt === claimed.salt)
    add('ordering', same(recomputedOrdering.order, claimed.order))
  } else {
    const rt = recomputedOrdering.ticks
    const ct = claimed.ticks || []
    const pairwise = (key) => rt.length === ct.length && rt.every((t, i) => same(t[key], ct[i]?.[key]))
    const firstBad = (key) => {
      const i = rt.findIndex((t, k) => !same(t[key], ct[k]?.[key]))
      return i === -1 ? (rt.length === ct.length ? null : 'tickCount') : `tick ${rt[i].tick}`
    }
    add('tickRange', rt.length === ct.length && rt.every((t, i) => t.tick === ct[i]?.tick))
    add('salt', pairwise('salt'), firstBad('salt'))
    add('frozenSets', pairwise('frozenSet'), firstBad('frozenSet'))
    add('inputCommitment', pairwise('inputCommitment'), firstBad('inputCommitment'))
    add('ordering', pairwise('entries'), firstBad('entries'))
    add('payloadHash', pairwise('payloadHash'), firstBad('payloadHash'))
    add('subBlockChain', pairwise('parentSubBlockHash') && pairwise('subBlockHash') && recomputedOrdering.finalSubBlockHash === claimed.finalSubBlockHash, firstBad('subBlockHash'))
    add('bundleDecisions', same(recomputedOrdering.bundleDecisions, claimed.bundleDecisions))
    add('hints', same(recomputedOrdering.hints, claimed.hints))
  }
  add('finalOrder', same(ordering.finalOrder.map((e) => e.txHash), record.outputs.finalOrder))

  // 4. re-execute on the AMM
  const pool = createPool({ reserveBase: np.poolBase, reserveQuote: np.poolQuote, feeBps: np.feeBps })
  const txByHash = new Map(txs.map((t) => [t.txHash, t]))
  for (const b of bundles) for (const m of b.transactions) txByHash.set(m.txHash, m)
  const exec = executionToRecord(executeOrder({ pool, finalOrder: ordering.finalOrder, txByHash }))
  add('execution', same(exec, record.outputs.execution))

  // 5. digest + local signature
  const digest = recordDigest(record)
  let sigOk = false
  try {
    const s = record.simulationSignature
    sigOk = s.scheme === 'ed25519' && s.digest === digest && ed25519.verify(hexToBytes(s.signature), hexToBytes(digest), hexToBytes(s.publicKey))
  } catch {
    sigOk = false
  }
  add('simulationSignature', sigOk)

  return { passed: checks.every((c) => c.passed), checks, recomputed: { ordering: recomputedOrdering, execution: exec, digest } }
}
