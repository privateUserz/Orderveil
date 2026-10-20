// Token amounts are BigInt in the smallest unit (18 decimals), converted only for display.
import { parseUnits, formatUnits } from 'viem'

export const DECIMALS = 18
export const ONE = 10n ** 18n
export const GWEI = 10n ** 9n
export const BPS = 10000n

export class InputError extends Error {
  constructor(code, field) {
    super(`${code}${field ? `:${field}` : ''}`)
    this.code = code
    this.field = field
  }
}

/** Parse a human decimal string into 18-decimal BigInt. Throws InputError on bad input. */
export function toUnits(value, field) {
  const s = String(value ?? '').trim()
  if (!/^\d+(\.\d+)?$/.test(s)) throw new InputError('invalidNumber', field)
  const [, frac = ''] = s.split('.')
  if (frac.length > DECIMALS) throw new InputError('tooPrecise', field)
  return parseUnits(s, DECIMALS)
}

export function fromUnits(value, decimals = DECIMALS) {
  return formatUnits(BigInt(value), decimals)
}

/** Lossy conversion for charts/labels only. */
export function unitsToNumber(value) {
  return Number(formatUnits(BigInt(value), DECIMALS))
}

export function absBig(x) {
  return x < 0n ? -x : x
}

/** Integer square root (floor) for non-negative BigInt, Newton's method from above. */
export function isqrt(n) {
  if (n < 0n) throw new RangeError('isqrt of negative')
  if (n < 2n) return n
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2))
  for (;;) {
    const y = (x + n / x) >> 1n
    if (y >= x) return x
    x = y
  }
}
