// Hex string helpers used by the key fields.

/**
 * True when `str` is a non-empty string of an even number of hex digits.
 * Whitespace is not allowed; case is ignored.
 */
export function isValidHex(str) {
  if (typeof str !== 'string' || str.length === 0) return false
  if (str.length % 2 !== 0) return false
  return /^[0-9a-fA-F]+$/.test(str)
}

/**
 * Number of bytes a hex string decodes to, or null when it is not valid hex.
 */
export function hexByteLength(str) {
  if (!isValidHex(str)) return null
  return str.length / 2
}
