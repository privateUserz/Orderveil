import { formatUnits } from 'viem'

const locale = (lng) => (lng?.startsWith('zh') ? 'zh-CN' : 'en-US')

/** Format an 18-decimal BigInt token amount for display. */
export function fmtAmount(value, lng, maxFrac = 4) {
  if (value === null || value === undefined) return '—'
  const n = Number(formatUnits(BigInt(value), 18))
  return n.toLocaleString(locale(lng), { maximumFractionDigits: maxFrac, minimumFractionDigits: 0 })
}

export function fmtSigned(value, lng, maxFrac = 4) {
  if (value === null || value === undefined) return '—'
  const v = BigInt(value)
  const s = fmtAmount(v < 0n ? -v : v, lng, maxFrac)
  return v < 0n ? `−${s}` : v > 0n ? `+${s}` : s
}

/** Price scaled by 1e18 -> number string. */
export function fmtPrice(x18, lng, maxFrac = 4) {
  if (!x18) return '—'
  return Number(formatUnits(BigInt(x18), 18)).toLocaleString(locale(lng), { maximumFractionDigits: maxFrac })
}

export function fmtPercent(ratio, lng, digits = 2) {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return '—'
  return (ratio * 100).toLocaleString(locale(lng), { maximumFractionDigits: digits, minimumFractionDigits: digits }) + '%'
}

export function fmtGwei(wei, lng) {
  return Number(formatUnits(BigInt(wei), 9)).toLocaleString(locale(lng), { maximumFractionDigits: 4 })
}

export function shortHash(h, head = 6, tail = 4) {
  if (!h) return '—'
  return h.length <= head + tail + 2 ? h : `${h.slice(0, head + 2)}…${h.slice(-tail)}`
}

export function tokenSymbols(direction) {
  return direction === 'buy' ? { input: 'USDT', output: 'BNB' } : { input: 'BNB', output: 'USDT' }
}
