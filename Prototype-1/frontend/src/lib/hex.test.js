import { describe, it, expect } from 'vitest'
import { isValidHex, hexByteLength } from './hex.js'

describe('isValidHex', () => {
  it('accepts even-length hex strings', () => {
    expect(isValidHex('00')).toBe(true)
    expect(isValidHex('deadBEEF')).toBe(true)
    expect(isValidHex('00112233445566778899aabbccddeeff')).toBe(true)
  })

  it('rejects odd-length strings', () => {
    expect(isValidHex('abc')).toBe(false)
    expect(isValidHex('0')).toBe(false)
  })

  it('rejects non-hex characters', () => {
    expect(isValidHex('zz')).toBe(false)
    expect(isValidHex('00 11')).toBe(false)
    expect(isValidHex('0x00')).toBe(false)
  })

  it('rejects empty / non-string input', () => {
    expect(isValidHex('')).toBe(false)
    expect(isValidHex(null)).toBe(false)
    expect(isValidHex(undefined)).toBe(false)
  })
})

describe('hexByteLength', () => {
  it('returns the byte count for valid hex', () => {
    expect(hexByteLength('00')).toBe(1)
    expect(hexByteLength('deadbeef')).toBe(4)
    expect(hexByteLength('00112233445566778899aabbccddeeff')).toBe(16)
  })

  it('returns null for invalid hex', () => {
    expect(hexByteLength('abc')).toBe(null)
    expect(hexByteLength('zz')).toBe(null)
    expect(hexByteLength('')).toBe(null)
  })
})
