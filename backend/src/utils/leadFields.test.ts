import { describe, it, expect } from 'vitest'
import {
  isValidLinkedinUrl,
  isValidOptionalLinkedinUrl,
  isValidOptionalPhoneNumber,
  isValidOptionalYearsAtCompany,
  isValidPhoneNumber,
  isValidYearsAtCompany,
  normalizeLinkedinUrl,
} from './leadFields'

describe('isValidPhoneNumber', () => {
  it('should accept common phone number formats, including extensions', () => {
    expect(isValidPhoneNumber('+1-280-754-0462x2154')).toBe(true)
    expect(isValidPhoneNumber('001-464-312-8555')).toBe(true)
    expect(isValidPhoneNumber('(760)551-9973x6454')).toBe(true)
    expect(isValidPhoneNumber('7549075690')).toBe(true)
    expect(isValidPhoneNumber('+34 612 34 56 78')).toBe(true)
    expect(isValidPhoneNumber('555.123.4567 ext. 12')).toBe(true)
  })

  it('should reject values with letters or an invalid number of digits', () => {
    expect(isValidPhoneNumber('call me')).toBe(false)
    expect(isValidPhoneNumber('555-CALL-NOW')).toBe(false)
    expect(isValidPhoneNumber('12345')).toBe(false)
    expect(isValidPhoneNumber('1234567890123456')).toBe(false)
    expect(isValidPhoneNumber('')).toBe(false)
  })
})

describe('isValidYearsAtCompany', () => {
  it('should accept whole numbers between 0 and 100', () => {
    expect(isValidYearsAtCompany(0)).toBe(true)
    expect(isValidYearsAtCompany(15)).toBe(true)
    expect(isValidYearsAtCompany(100)).toBe(true)
  })

  it('should reject negative, fractional, too large and non-finite numbers', () => {
    expect(isValidYearsAtCompany(-1)).toBe(false)
    expect(isValidYearsAtCompany(2.5)).toBe(false)
    expect(isValidYearsAtCompany(101)).toBe(false)
    expect(isValidYearsAtCompany(NaN)).toBe(false)
    expect(isValidYearsAtCompany(Infinity)).toBe(false)
  })
})

describe('normalizeLinkedinUrl', () => {
  it('should trim the value and add https when the protocol is missing', () => {
    expect(normalizeLinkedinUrl(' linkedin.com/in/jane ')).toBe('https://linkedin.com/in/jane')
  })

  it('should keep an existing protocol', () => {
    expect(normalizeLinkedinUrl('http://www.linkedin.com/in/jane')).toBe('http://www.linkedin.com/in/jane')
  })
})

describe('isValidLinkedinUrl', () => {
  it('should accept any LinkedIn URL with or without protocol and subdomain', () => {
    expect(isValidLinkedinUrl('https://www.linkedin.com/in/jane-doe')).toBe(true)
    expect(isValidLinkedinUrl('https://es.linkedin.com/in/jane-doe/')).toBe(true)
    expect(isValidLinkedinUrl('linkedin.com/in/jane-doe')).toBe(true)
    expect(isValidLinkedinUrl('https://www.linkedin.com/company/acme')).toBe(true)
    expect(isValidLinkedinUrl('https://www.linkedin.com')).toBe(true)
  })

  it('should reject non-LinkedIn URLs', () => {
    expect(isValidLinkedinUrl('https://example.com/in/jane-doe')).toBe(false)
    expect(isValidLinkedinUrl('https://notlinkedin.com/in/jane-doe')).toBe(false)
    expect(isValidLinkedinUrl('not a url')).toBe(false)
  })
})

describe('optional validators', () => {
  it('should accept missing values', () => {
    for (const value of [undefined, null]) {
      expect(isValidOptionalPhoneNumber(value)).toBe(true)
      expect(isValidOptionalYearsAtCompany(value)).toBe(true)
      expect(isValidOptionalLinkedinUrl(value)).toBe(true)
    }
    expect(isValidOptionalPhoneNumber('  ')).toBe(true)
    expect(isValidOptionalLinkedinUrl('')).toBe(true)
  })

  it('should validate present values', () => {
    expect(isValidOptionalPhoneNumber('7549075690')).toBe(true)
    expect(isValidOptionalPhoneNumber('abc')).toBe(false)
    expect(isValidOptionalYearsAtCompany(5)).toBe(true)
    expect(isValidOptionalYearsAtCompany(-5)).toBe(false)
    expect(isValidOptionalLinkedinUrl('https://linkedin.com/in/jane')).toBe(true)
    expect(isValidOptionalLinkedinUrl('https://example.com')).toBe(false)
  })

  it('should reject values of the wrong type', () => {
    expect(isValidOptionalPhoneNumber(7549075690)).toBe(false)
    expect(isValidOptionalYearsAtCompany('5')).toBe(false)
    expect(isValidOptionalLinkedinUrl(42)).toBe(false)
  })
})
