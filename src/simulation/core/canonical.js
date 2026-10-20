// Deterministic JSON serialization: object keys sorted by UTF-16 code unit order,
// no whitespace, BigInt encoded as decimal strings, undefined fields dropped.
// Hashes in Orderveil records are always sha256(canonicalize(value)).
import { sha256Utf8 } from './hash.js'

export function canonicalize(value) {
  return JSON.stringify(normalize(value))
}

function normalize(value) {
  if (value === null) return null
  const t = typeof value
  if (t === 'bigint') return value.toString()
  if (t === 'string' || t === 'boolean') return value
  if (t === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite numbers cannot be canonicalized')
    return value
  }
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : normalize(v)))
  if (t === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) {
      const v = value[key]
      if (v === undefined) continue
      out[key] = normalize(v)
    }
    return out
  }
  throw new TypeError(`Unsupported type in canonical JSON: ${t}`)
}

export function hashCanonical(value) {
  return sha256Utf8(canonicalize(value))
}
