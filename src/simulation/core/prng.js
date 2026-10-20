// Deterministic pseudo-randomness for scenario generation (background flow, searcher bids).
// Derived from SHA-256 so any seed string reproduces the same scenario. Never Math.random.
import { sha256Parts, u64be } from './hash.js'

export function seedHash(seed) {
  return sha256Parts('ORVL/seed/v1|', String(seed))
}

/** Returns a BigInt in [0, 2^64) for (seed, label, index). */
export function drawU64(seed, label, index = 0) {
  const h = sha256Parts('ORVL/draw/v1|', seedHash(seed), `|${label}|`, u64be(index))
  return BigInt('0x' + h.slice(2, 18))
}

/** Uniform BigInt in [min, max] inclusive. */
export function drawRange(seed, label, index, min, max) {
  const lo = BigInt(min)
  const hi = BigInt(max)
  if (hi < lo) throw new RangeError('drawRange: max < min')
  return lo + (drawU64(seed, label, index) % (hi - lo + 1n))
}

export function drawBool(seed, label, index = 0) {
  return (drawU64(seed, label, index) & 1n) === 1n
}
