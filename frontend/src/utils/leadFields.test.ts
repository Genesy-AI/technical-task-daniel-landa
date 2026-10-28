import { describe, it, expect } from 'vitest'
import {
  isValidLinkedinUrl,
  isValidPhoneNumber,
  normalizeLinkedinUrl,
  parseYearsAtCompany,
} from './leadFields'

describe('isValidPhoneNumber', () => {
  it('should accept common phone number formats, including extensions', () => {
    expect(isValidPhoneNumber('+1-280-754-0462x2154')).toBe(true)
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
  })
})

describe('parseYearsAtCompany', () => {
  it('should parse whole numbers between 0 and 100', () => {
    expect(parseYearsAtCompany('0')).toBe(0)
    expect(parseYearsAtCompany(' 15 ')).toBe(15)
    expect(parseYearsAtCompany('100')).toBe(100)
  })

  it('should return null for negative, fractional, too large or non-numeric values', () => {
    expect(parseYearsAtCompany('-1')).toBeNull()
    expect(parseYearsAtCompany('2.5')).toBeNull()
    expect(parseYearsAtCompany('101')).toBeNull()
    expect(parseYearsAtCompany('five')).toBeNull()
    expect(parseYearsAtCompany('')).toBeNull()
  })
})

describe('normalizeLinkedinUrl', () => {
  it('should trim the value and add https when the protocol is missing', () => {
    expect(normalizeLinkedinUrl(' linkedin.com/in/jane ')).toBe('https://linkedin.com/in/jane')
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
