// Orderveil experimental transaction / bundle structures. These are NOT byte-level
// implementations of NewL1 protocol objects; hashes are sha256 over canonical JSON.
import { hashCanonical } from '../core/canonical.js'
import { sha256Parts } from '../core/hash.js'
import { seedHash } from '../core/prng.js'
import { MODES } from './ruleset.js'

export class OrderingError extends Error {
  constructor(code, detail) {
    super(detail ? `${code}: ${detail}` : code)
    this.code = code
  }
}

const TX_MODES = new Set([MODES.PROTECTED, MODES.OPTIN, MODES.PUBLIC, MODES.BUNDLE])

export function txBody(tx) {
  return {
    transactionId: tx.transactionId,
    sender: tx.sender,
    nonce: tx.nonce,
    effectiveFeeRate: String(tx.effectiveFeeRate),
    arrivalTick: tx.arrivalTick,
    mode: tx.mode,
    payload: tx.payload,
  }
}

export function computeTxHash(tx) {
  return hashCanonical({ domain: 'ORVL/tx/v1', ...txBody(tx) })
}

export function validateTxShape(tx) {
  if (!tx || typeof tx !== 'object') throw new OrderingError('MALFORMED_TX')
  if (typeof tx.transactionId !== 'string' || !tx.transactionId) throw new OrderingError('MALFORMED_TX', 'transactionId')
  if (typeof tx.sender !== 'string' || !tx.sender) throw new OrderingError('MALFORMED_TX', 'sender')
  if (!Number.isInteger(tx.nonce) || tx.nonce < 0) throw new OrderingError('MALFORMED_TX', 'nonce')
  if (!Number.isInteger(tx.arrivalTick) || tx.arrivalTick < 0) throw new OrderingError('MALFORMED_TX', 'arrivalTick')
  if (!/^\d+$/.test(String(tx.effectiveFeeRate))) throw new OrderingError('MALFORMED_TX', 'effectiveFeeRate')
  if (!TX_MODES.has(tx.mode)) throw new OrderingError('MALFORMED_TX', 'mode')
  if (!tx.payload || typeof tx.payload !== 'object') throw new OrderingError('MALFORMED_TX', 'payload')
}

export function makeTransaction(fields) {
  const tx = {
    transactionId: fields.transactionId,
    sender: fields.sender,
    nonce: fields.nonce ?? 0,
    effectiveFeeRate: String(fields.effectiveFeeRate),
    arrivalTick: fields.arrivalTick ?? 0,
    mode: fields.mode ?? MODES.PROTECTED,
    payload: fields.payload,
  }
  validateTxShape(tx)
  return { ...tx, txHash: computeTxHash(tx), status: 'pending' }
}

export function bundleBody(b) {
  return {
    bundleId: b.bundleId,
    searcher: b.searcher,
    afterRef: b.afterRef ?? null,
    beforeRef: b.beforeRef ?? null,
    committedTip: String(b.committedTip),
    arrivalTick: b.arrivalTick,
    validFromTick: b.validFromTick,
    validToTick: b.validToTick,
    txHashes: (b.transactions || []).map((t) => t.txHash),
  }
}

export function computeBundleHash(b) {
  return hashCanonical({ domain: 'ORVL/bundle/v1', ...bundleBody(b) })
}

export function makeBundle(fields) {
  const b = {
    bundleId: fields.bundleId,
    searcher: fields.searcher,
    afterRef: fields.afterRef ?? null,
    beforeRef: fields.beforeRef ?? null,
    committedTip: String(fields.committedTip ?? '0'),
    arrivalTick: fields.arrivalTick ?? 0,
    validFromTick: fields.validFromTick ?? 0,
    validToTick: fields.validToTick ?? Number.MAX_SAFE_INTEGER,
    transactions: (fields.transactions || []).map((t) => (t.txHash ? t : makeTransaction({ ...t, mode: MODES.BUNDLE }))),
  }
  return { ...b, bundleHash: computeBundleHash(b) }
}

/** Gateway-generated reference for an opt-in target. Hides the signed tx hash from searchers. */
export function targetCommitmentOf(seed, txHash) {
  return sha256Parts('ORVL/target/v1|', seedHash(seed), txHash)
}

/** Unsigned transaction body disclosed in an opt-in hint (no hash, no signature). */
export function hintBody(tx) {
  return {
    sender: tx.sender,
    nonce: tx.nonce,
    effectiveFeeRate: String(tx.effectiveFeeRate),
    payload: tx.payload,
  }
}
