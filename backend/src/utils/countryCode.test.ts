import { describe, it, expect } from 'vitest'
import { isValidCountryCode, isValidOptionalCountryCode, normalizeCountryCode } from './countryCode'

describe('normalizeCountryCode', () => {
  it('should trim and uppercase the value', () => {
    expect(normalizeCountryCode(' es ')).toBe('ES')
  })
})

describe('isValidCountryCode', () => {
  it('should accept ISO 3166-1 alpha-2 codes regardless of case and surrounding whitespace', () => {
    expect(isValidCountryCode('ES')).toBe(true)
    expect(isValidCountryCode('us')).toBe(true)
    expect(isValidCountryCode(' FR ')).toBe(true)
  })

  it('should reject values that are not ISO 3166-1 alpha-2 codes', () => {
    expect(isValidCountryCode('XXX')).toBe(false)
    expect(isValidCountryCode('12')).toBe(false)
    expect(isValidCountryCode('ZZ')).toBe(false)
    expect(isValidCountryCode('EU')).toBe(false)
    expect(isValidCountryCode('')).toBe(false)
  })

  it('should reject ISO 3166-1 alpha-3 and numeric codes', () => {
    expect(isValidCountryCode('ESP')).toBe(false)
    expect(isValidCountryCode('724')).toBe(false)
  })
})

describe('isValidOptionalCountryCode', () => {
  it('should accept missing or blank values', () => {
    expect(isValidOptionalCountryCode(undefined)).toBe(true)
    expect(isValidOptionalCountryCode(null)).toBe(true)
    expect(isValidOptionalCountryCode('')).toBe(true)
    expect(isValidOptionalCountryCode('   ')).toBe(true)
  })

  it('should accept valid codes', () => {
    expect(isValidOptionalCountryCode('es')).toBe(true)
  })

  it('should reject invalid codes and non-string values', () => {
    expect(isValidOptionalCountryCode('XXX')).toBe(false)
    expect(isValidOptionalCountryCode('12')).toBe(false)
    expect(isValidOptionalCountryCode(12)).toBe(false)
  })
})
