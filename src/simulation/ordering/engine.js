// Deterministic ordering engine inspired by the NewL1 TEE Gateway proposal (§04, §05).
// Pure JavaScript, no React, no wall-clock time, no Math.random. Same inputs + seed + ruleset
// => byte-identical outputs. Logical ticks only; this is not a networked gateway.
import { hashCanonical } from '../core/canonical.js'
import { ZERO_HASH, compareHex, sha256Parts, u64be } from '../core/hash.js'
import { seedHash } from '../core/prng.js'
import { RULESET, MODES, BUNDLE_STATUS } from './ruleset.js'
import {
  OrderingError,
  computeTxHash,
  computeBundleHash,
  validateTxShape,
  targetCommitmentOf,
  hintBody,
} from './transaction.js'

export const DEFAULT_GATEWAY = Object.freeze({
  gatewayId: 'sim-gateway-0',
  workloadId: 'orderveil-sim-workload/0.1.0',
  term: 1,
  slot: 1,
})

export function deriveSalt(seed, parentHash, tick) {
  return sha256Parts('ORVL/salt/v1|', seedHash(seed), parentHash, u64be(tick))
}

/** H(txHash || salt) — raw 32-byte concatenation. */
export function tieBreakKey(hash, salt) {
  return sha256Parts(hash, salt)
}

function compareByFeeThenKey(a, b) {
  const fa = BigInt(a.effectiveFeeRate)
  const fb = BigInt(b.effectiveFeeRate)
  if (fa !== fb) return fa > fb ? -1 : 1
  return compareHex(a._key, b._key)
}

/**
 * General segment: effective fee rate descending, ties by H(txHash||salt) ascending,
 * while preserving each sender's nonce order (price-and-nonce merge).
 */
export function orderGeneral(transactions, salt) {
  const bySender = new Map()
  for (const tx of transactions) {
    const item = { ...tx, _key: tieBreakKey(tx.txHash, salt) }
    if (!bySender.has(tx.sender)) bySender.set(tx.sender, [])
    bySender.get(tx.sender).push(item)
  }
  for (const list of bySender.values()) {
    list.sort((a, b) => a.nonce - b.nonce || compareHex(a.txHash, b.txHash))
  }
  const out = []
  const heads = [...bySender.values()]
  while (heads.some((l) => l.length)) {
    let best = -1
    for (let i = 0; i < heads.length; i++) {
      if (!heads[i].length) continue
      if (best === -1 || compareByFeeThenKey(heads[i][0], heads[best][0]) < 0) best = i
    }
    const { _key, ...tx } = heads[best].shift()
    out.push({ ...tx, tieBreakKey: _key })
  }
  return out
}

export function computeInputCommitment(tick, txHashes, bundleHashes) {
  const txs = [...txHashes].sort(compareHex)
  const bundles = [...bundleHashes].sort(compareHex)
  return sha256Parts(
    'ORVL/input/v1|',
    u64be(tick),
    u64be(txs.length),
    ...txs,
    '|bundles|',
    u64be(bundles.length),
    ...bundles,
  )
}

export function computePayloadHash(entries) {
  return hashCanonical({
    domain: 'ORVL/payload/v1',
    entries: entries.map((e) => (e.kind === 'bundle' ? { kind: 'bundle', bundleHash: e.bundleHash, txHashes: e.txHashes } : { kind: 'tx', txHash: e.txHash })),
  })
}

export function computeSubBlockHash(header) {
  return hashCanonical({ domain: 'ORVL/subblock/v1', ...header })
}

function verifyHashes(transactions, bundles) {
  const seen = new Set()
  const seenNonce = new Set()
  for (const tx of transactions) {
    validateTxShape(tx)
    if (tx.mode === MODES.BUNDLE) throw new OrderingError('BUNDLE_TX_AT_TOP_LEVEL', tx.transactionId)
    if (computeTxHash(tx) !== tx.txHash) throw new OrderingError('TX_HASH_MISMATCH', tx.transactionId)
    if (seen.has(tx.txHash)) throw new OrderingError('DUPLICATE_TX', tx.transactionId)
    const nk = `${tx.sender}#${tx.nonce}`
    if (seenNonce.has(nk)) throw new OrderingError('DUPLICATE_NONCE', nk)
    seen.add(tx.txHash)
    seenNonce.add(nk)
  }
  for (const b of bundles) {
    for (const m of b.transactions || []) {
      validateTxShape(m)
      if (computeTxHash(m) !== m.txHash) throw new OrderingError('TX_HASH_MISMATCH', m.transactionId)
    }
    if (computeBundleHash(b) !== b.bundleHash) throw new OrderingError('BUNDLE_HASH_MISMATCH', b.bundleId)
  }
}

/**
 * Classify transactions into the protected or opt-in path and publish hints for opt-in only.
 * Protected transactions never produce a hint or a referencable commitment.
 */
export function classify(transactions, { seed, ruleset = RULESET }) {
  const classified = []
  const hints = []
  for (const tx of transactions) {
    if (tx.mode === MODES.OPTIN) {
      const inclusionTick = tx.arrivalTick + ruleset.optInDelayTicks
      const targetCommitment = targetCommitmentOf(seed, tx.txHash)
      classified.push({ ...tx, path: MODES.OPTIN, inclusionTick, targetCommitment })
      hints.push({ targetCommitment, disclosedAtTick: tx.arrivalTick, expiryTick: inclusionTick, body: hintBody(tx) })
    } else if (tx.mode === MODES.PROTECTED) {
      classified.push({ ...tx, path: MODES.PROTECTED, inclusionTick: tx.arrivalTick })
    } else {
      throw new OrderingError('UNSUPPORTED_MODE_FOR_GATEWAY', tx.mode)
    }
  }
  return { classified, hints }
}

/** Structural validation of after-ref bundles (§04 table, §05 structural filtering). */
export function validateBundles(bundles, classified, hints, { seed, ruleset = RULESET }) {
  const hintByCommitment = new Map(hints.map((h) => [h.targetCommitment, h]))
  const protectedRefs = new Set()
  for (const tx of classified) {
    if (tx.path === MODES.PROTECTED) {
      protectedRefs.add(tx.txHash)
      protectedRefs.add(targetCommitmentOf(seed, tx.txHash))
    }
  }
  const decisions = []
  for (const b of bundles) {
    let status = null
    const hint = hintByCommitment.get(b.afterRef)
    if (b.beforeRef) status = BUNDLE_STATUS.REJECTED_BEFORE_REF
    else if (!b.afterRef) status = BUNDLE_STATUS.REJECTED_NO_TARGET
    else if (protectedRefs.has(b.afterRef)) status = BUNDLE_STATUS.REJECTED_PROTECTED_TARGET
    else if (!hint) status = BUNDLE_STATUS.REJECTED_UNKNOWN_TARGET
    else if (!b.transactions || b.transactions.length === 0) status = BUNDLE_STATUS.REJECTED_EMPTY
    else if (b.transactions.some((t) => t.mode !== MODES.BUNDLE)) status = BUNDLE_STATUS.REJECTED_MALFORMED
    else if (b.arrivalTick < hint.disclosedAtTick) status = BUNDLE_STATUS.REJECTED_BEFORE_DISCLOSURE
    else if (b.arrivalTick >= hint.expiryTick) status = BUNDLE_STATUS.REJECTED_LATE
    else if (!(b.validFromTick <= hint.expiryTick && hint.expiryTick <= b.validToTick)) status = BUNDLE_STATUS.REJECTED_VALIDITY_WINDOW
    else if (BigInt(b.committedTip) < BigInt(ruleset.tipFloorWei)) status = BUNDLE_STATUS.REJECTED_TIP_FLOOR
    decisions.push({ bundleId: b.bundleId, bundleHash: b.bundleHash, afterRef: b.afterRef ?? null, status: status ?? 'candidate', committedTip: String(b.committedTip) })
  }
  return decisions
}

/**
 * Run the simulated gateway over logical ticks.
 * @returns ticks[] with inputs, frozen set, salt, ordering, input commitment, payload hash and SubBlock headers.
 */
export function runGateway({ transactions, bundles = [], seed, ruleset = RULESET, gateway = DEFAULT_GATEWAY, tickRange }) {
  if (seed === undefined || seed === null || String(seed) === '') throw new OrderingError('MISSING_SEED')
  verifyHashes(transactions, bundles)
  const { classified, hints } = classify(transactions, { seed, ruleset })
  const decisions = validateBundles(bundles, classified, hints, { seed, ruleset })
  const bundleByHash = new Map(bundles.map((b) => [b.bundleHash, b]))
  const decisionByHash = new Map(decisions.map((d) => [d.bundleHash, d]))
  const targetByCommitment = new Map(classified.filter((t) => t.targetCommitment).map((t) => [t.targetCommitment, t]))

  const allTicks = [
    ...classified.flatMap((t) => [t.arrivalTick, t.inclusionTick]),
    ...bundles.map((b) => b.arrivalTick),
  ]
  const first = tickRange ? tickRange[0] : allTicks.length ? Math.min(...allTicks) : 0
  const last = tickRange ? tickRange[1] : allTicks.length ? Math.max(...allTicks) : 0

  let parent = ZERO_HASH
  const ticks = []
  for (let tick = first; tick <= last; tick++) {
    const salt = deriveSalt(seed, parent, tick)
    const frozen = classified.filter((t) => t.inclusionTick === tick)
    const ordered = orderGeneral(frozen, salt)

    // after-ref competition for targets frozen in this tick
    const entries = []
    const candidateHashes = []
    for (const tx of ordered) {
      entries.push({ kind: 'tx', txHash: tx.txHash, transactionId: tx.transactionId, path: tx.path, effectiveFeeRate: tx.effectiveFeeRate, tieBreakKey: tx.tieBreakKey })
      if (tx.path !== MODES.OPTIN) continue
      const candidates = decisions
        .filter((d) => d.status === 'candidate' && d.afterRef === tx.targetCommitment)
        .map((d) => ({ d, key: tieBreakKey(d.bundleHash, salt) }))
        .sort((x, y) => {
          const tx_ = BigInt(x.d.committedTip)
          const ty = BigInt(y.d.committedTip)
          if (tx_ !== ty) return tx_ > ty ? -1 : 1
          return compareHex(x.key, y.key)
        })
      candidates.forEach(({ d }, i) => {
        candidateHashes.push(d.bundleHash)
        const winner = i < ruleset.maxBackrunsPerTarget
        decisionByHash.get(d.bundleHash).status = winner ? BUNDLE_STATUS.INCLUDED : BUNDLE_STATUS.OUTBID
        decisionByHash.get(d.bundleHash).tick = tick
        if (winner) {
          const b = bundleByHash.get(d.bundleHash)
          entries.push({
            kind: 'bundle',
            bundleHash: b.bundleHash,
            bundleId: b.bundleId,
            afterRef: b.afterRef,
            targetTxHash: tx.txHash,
            committedTip: String(b.committedTip),
            txHashes: b.transactions.map((m) => m.txHash),
            transactionIds: b.transactions.map((m) => m.transactionId),
          })
        }
      })
    }

    const inputCommitment = computeInputCommitment(tick, frozen.map((t) => t.txHash), candidateHashes)
    const payloadHash = computePayloadHash(entries)
    const header = {
      gatewayId: gateway.gatewayId,
      workloadId: gateway.workloadId,
      rulesetVersion: ruleset.version,
      term: gateway.term,
      slot: gateway.slot,
      tick,
      parentSubBlockHash: parent,
      inputCommitment,
      payloadHash,
      txCount: entries.reduce((n, e) => n + (e.kind === 'bundle' ? e.txHashes.length : 1), 0),
    }
    const subBlockHash = computeSubBlockHash(header)
    ticks.push({
      tick,
      logicalTimeMs: tick * ruleset.tickMs,
      arrivals: classified.filter((t) => t.arrivalTick === tick).map((t) => ({ txHash: t.txHash, transactionId: t.transactionId, path: t.path })),
      bundleArrivals: bundles.filter((b) => b.arrivalTick === tick).map((b) => ({ bundleHash: b.bundleHash, bundleId: b.bundleId })),
      frozenSet: frozen.map((t) => t.txHash).sort(compareHex),
      salt,
      entries,
      inputCommitment,
      payloadHash,
      subBlock: header,
      subBlockHash,
    })
    parent = subBlockHash
  }

  // any candidate whose target never got frozen inside the range stays unresolved
  for (const d of decisions) if (d.status === 'candidate') d.status = BUNDLE_STATUS.REJECTED_LATE

  const finalOrder = []
  for (const t of ticks) {
    for (const e of t.entries) {
      if (e.kind === 'tx') finalOrder.push({ txHash: e.txHash, transactionId: e.transactionId, tick: t.tick, group: null })
      else e.txHashes.forEach((h, i) => finalOrder.push({ txHash: h, transactionId: e.transactionIds[i], tick: t.tick, group: e.bundleHash, afterRefTarget: e.targetTxHash }))
    }
  }

  return {
    rulesetVersion: ruleset.version,
    gateway: { ...gateway },
    seed: String(seed),
    hints,
    classified: classified.map(({ txHash, transactionId, path, inclusionTick, arrivalTick, targetCommitment }) => ({ txHash, transactionId, path, arrivalTick, inclusionTick, targetCommitment: targetCommitment ?? null })),
    bundleDecisions: decisions,
    ticks,
    finalOrder,
    finalSubBlockHash: parent,
  }
}

/** What a simulated searcher can observe: published hints only. */
export function searcherView(result) {
  return JSON.parse(JSON.stringify(result.hints))
}

/**
 * Public-mempool baseline: one block, everyone sees everything, general fee ordering.
 * Used only for the Public comparison path; no privacy, no hint discipline.
 */
export function orderPublicBlock({ transactions, seed }) {
  verifyHashes(transactions, [])
  const salt = deriveSalt(seed, ZERO_HASH, 0)
  const ordered = orderGeneral(transactions, salt)
  return {
    salt,
    entries: ordered.map((t) => ({ kind: 'tx', txHash: t.txHash, transactionId: t.transactionId, effectiveFeeRate: t.effectiveFeeRate, tieBreakKey: t.tieBreakKey })),
    finalOrder: ordered.map((t) => ({ txHash: t.txHash, transactionId: t.transactionId, tick: 0, group: null })),
  }
}
