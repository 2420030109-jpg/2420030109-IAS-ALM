// Helpers for rendering bit lists as readable monospace 0/1 groups.

/**
 * Format a list of bits (numbers 0/1) as space-separated nibble groups,
 * e.g. [1,0,1,1,0,0,1,0] -> "1011 0010".
 */
export function formatBits(bits, groupSize = 4) {
  if (!Array.isArray(bits)) return String(bits ?? '')
  const chars = bits.map((b) => (b ? '1' : '0'))
  if (groupSize <= 0) return chars.join('')
  const groups = []
  for (let i = 0; i < chars.length; i += groupSize) {
    groups.push(chars.slice(i, i + groupSize).join(''))
  }
  return groups.join(' ')
}

/** True when value looks like a flat array of 0/1 numbers. */
export function isBitList(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((b) => b === 0 || b === 1)
  )
}

/** Split a hex string into fixed-size chunks (default 32 chars = 16 bytes). */
export function chunkHex(hex, size = 32) {
  if (typeof hex !== 'string') return []
  const out = []
  for (let i = 0; i < hex.length; i += size) out.push(hex.slice(i, i + size))
  return out
}
