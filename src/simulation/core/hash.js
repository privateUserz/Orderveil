// Hashing primitives for the simulation. SHA-256 via @noble/hashes (audited, synchronous).
// Nothing in this file is a TEE primitive; it only provides deterministic digests.
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, hexToBytes as nobleHexToBytes, utf8ToBytes, concatBytes } from '@noble/hashes/utils.js'

export const ZERO_HASH = '0x' + '00'.repeat(32)

export function toHex(bytes) {
  return '0x' + bytesToHex(bytes)
}

export function hexToBytes(hex) {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new TypeError(`Invalid hex string: ${String(hex).slice(0, 20)}`)
  }
  return nobleHexToBytes(hex.slice(2))
}

export function isHash(value) {
  return typeof value === 'string' && /^0x[0-9a-f]{64}$/.test(value)
}

/** Big-endian unsigned 64-bit encoding. */
export function u64be(n) {
  const v = BigInt(n)
  if (v < 0n || v > 0xffffffffffffffffn) throw new RangeError('u64 out of range')
  const out = new Uint8Array(8)
  let x = v
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(x & 0xffn)
    x >>= 8n
  }
  return out
}

/**
 * sha256 over a list of parts. Strings are UTF-8 encoded unless they look like 0x-hex,
 * in which case they are decoded. Use `utf8:` explicit parts via utf8ToBytes when needed.
 */
export function sha256Parts(...parts) {
  const bytes = parts.map((p) => {
    if (p instanceof Uint8Array) return p
    if (typeof p === 'string') return p.startsWith('0x') ? hexToBytes(p) : utf8ToBytes(p)
    throw new TypeError('sha256Parts accepts Uint8Array or string parts')
  })
  return toHex(sha256(concatBytes(...bytes)))
}

export function sha256Utf8(text) {
  return toHex(sha256(utf8ToBytes(text)))
}

/** Lexicographic comparison of two equal-length 0x hex digests (big-endian bytes). */
export function compareHex(a, b) {
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  return x < y ? -1 : x > y ? 1 : 0
}

export { utf8ToBytes }
