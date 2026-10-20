// Experiment record export. Deterministic content (everything except createdAt and the
// signature material) is a pure function of params + seed + ruleset.
// simulationSignature is a local ed25519 signature for record integrity ONLY.
// It is NOT a TEE attestation and NOT an enclaveSig.
import { ed25519 } from '@noble/curves/ed25519.js'
import { hashCanonical } from '../core/canonical.js'
import { hexToBytes, toHex } from '../core/hash.js'
import { RULESET } from '../ordering/ruleset.js'
import { DEFAULT_GATEWAY } from '../ordering/engine.js'

export const RECORD_SCHEMA = 'orderveil.experiment/v1'
export const SIGNATURE_PURPOSE = 'local-simulation-integrity-only; not a TEE attestation; not an enclaveSig'

function str(v) {
  return typeof v === 'bigint' ? v.toString() : v
}

export function paramsToRecord(np) {
  return {
    direction: np.direction,
    mode: np.mode,
    seed: np.seed,
    tradeAmount: str(np.tradeAmount),
    poolBase: str(np.poolBase),
    poolQuote: str(np.poolQuote),
    feeBps: str(np.feeBps),
    slippageBps: str(np.slippageBps),
    attackerEnabled: np.attackerEnabled,
    attackerAmount: str(np.attackerAmount),
    userFeeRate: str(np.userFeeRate),
    gasUnits: str(np.gasUnits),
    backgroundTxCount: np.backgroundTxCount,
    blindGuess: np.blindGuess,
    refundBps: str(np.refundBps),
    searcherCount: np.searcherCount,
  }
}

export function recordToParams(p) {
  return {
    ...p,
    tradeAmount: BigInt(p.tradeAmount),
    poolBase: BigInt(p.poolBase),
    poolQuote: BigInt(p.poolQuote),
    feeBps: BigInt(p.feeBps),
    slippageBps: BigInt(p.slippageBps),
    attackerAmount: BigInt(p.attackerAmount),
    userFeeRate: BigInt(p.userFeeRate),
    gasUnits: BigInt(p.gasUnits),
    refundBps: BigInt(p.refundBps),
  }
}

export function orderingToRecord(ordering) {
  if (ordering.kind === 'public') {
    return { kind: 'public', salt: ordering.salt, order: ordering.finalOrder.map((e) => e.txHash) }
  }
  return {
    kind: 'gateway',
    gateway: ordering.gateway,
    hints: ordering.hints.map((h) => ({ targetCommitment: h.targetCommitment, disclosedAtTick: h.disclosedAtTick, expiryTick: h.expiryTick })),
    bundleDecisions: ordering.bundleDecisions.map((d) => ({ bundleHash: d.bundleHash, status: d.status })),
    ticks: ordering.ticks.map((t) => ({
      tick: t.tick,
      salt: t.salt,
      frozenSet: t.frozenSet,
      entries: t.entries.map((e) => (e.kind === 'bundle' ? { kind: 'bundle', bundleHash: e.bundleHash, txHashes: e.txHashes } : { kind: 'tx', txHash: e.txHash })),
      inputCommitment: t.inputCommitment,
      payloadHash: t.payloadHash,
      parentSubBlockHash: t.subBlock.parentSubBlockHash,
      subBlockHash: t.subBlockHash,
    })),
    finalSubBlockHash: ordering.finalSubBlockHash,
  }
}

export function executionToRecord(exec) {
  const steps = exec.steps.map((s) => ({ txHash: s.txHash, status: s.status, reason: s.reason, amountIn: str(s.amountIn), amountOut: str(s.amountOut), gasCost: str(s.gasCost) }))
  const finalPool = { reserveBase: str(exec.finalPool.reserveBase), reserveQuote: str(exec.finalPool.reserveQuote) }
  return { steps, finalPool, executionHash: hashCanonical({ domain: 'ORVL/execution/v1', steps, finalPool }) }
}

export function computeExperimentId({ rulesetVersion, params, inputs }) {
  return 'exp-' + hashCanonical({ domain: 'ORVL/experiment/v1', rulesetVersion, params, inputs }).slice(2, 18)
}

export function recordDigest(record) {
  return hashCanonical({
    domain: 'ORVL/record/v1',
    schema: record.schema,
    experimentId: record.experimentId,
    ruleset: record.ruleset,
    params: record.config.params,
    inputs: record.inputs,
    outputs: record.outputs,
  })
}

function inputsToRecord(inputs) {
  return {
    transactions: inputs.transactions.map((t) => ({ ...t })),
    bundles: inputs.bundles.map((b) => ({ ...b, transactions: b.transactions.map((m) => ({ ...m })) })),
  }
}

/**
 * Build an exportable record from runScenario() output.
 * @param scenario  result of runScenario(np)
 * @param opts.secretKey optional Uint8Array (tests); a fresh random key is generated otherwise
 * @param opts.now optional Date for createdAt (informational only, never hashed)
 */
export function buildExperimentRecord(scenario, opts = {}) {
  const params = paramsToRecord(scenario.np)
  const inputs = inputsToRecord(scenario.inputs)
  const record = {
    schema: RECORD_SCHEMA,
    classification: 'simulation',
    experimentId: computeExperimentId({ rulesetVersion: RULESET.version, params, inputs }),
    createdAt: (opts.now ?? new Date()).toISOString(),
    disclaimer: 'Orderveil local simulation record. Not produced by a TEE, not a NewL1 artifact, not on-chain data.',
    ruleset: { ...RULESET },
    config: { params, gateway: scenario.ordering.kind === 'gateway' ? { ...DEFAULT_GATEWAY } : null },
    inputs,
    outputs: {
      ordering: orderingToRecord(scenario.ordering),
      finalOrder: scenario.ordering.finalOrder.map((e) => e.txHash),
      execution: executionToRecord(scenario.exec),
    },
  }
  const digest = recordDigest(record)
  const secretKey = opts.secretKey ?? ed25519.utils.randomSecretKey()
  const publicKey = ed25519.getPublicKey(secretKey)
  record.simulationSignature = {
    scheme: 'ed25519',
    purpose: SIGNATURE_PURPOSE,
    publicKey: toHex(publicKey),
    digest,
    signature: toHex(ed25519.sign(hexToBytes(digest), secretKey)),
  }
  return record
}

export function serializeRecord(record) {
  return JSON.stringify(record, null, 2)
}
