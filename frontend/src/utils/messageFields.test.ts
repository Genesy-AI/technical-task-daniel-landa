import { describe, it, expect } from 'vitest'
import { MESSAGE_FIELDS, filterMessageFields } from './messageFields'

describe('MESSAGE_FIELDS', () => {
  it('should include the phone number, years at company and LinkedIn URL fields', () => {
    const keys = MESSAGE_FIELDS.map((field) => field.key)
    expect(keys).toEqual(expect.arrayContaining(['phoneNumber', 'yearsAtCompany', 'linkedinUrl']))
  })

  it('should not contain duplicate keys', () => {
    const keys = MESSAGE_FIELDS.map((field) => field.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('filterMessageFields', () => {
  it('should return all fields for an empty or blank query', () => {
    expect(filterMessageFields('')).toEqual(MESSAGE_FIELDS)
    expect(filterMessageFields('   ')).toEqual(MESSAGE_FIELDS)
  })

  it('should match by label, case-insensitively', () => {
    expect(filterMessageFields('YEARS').map((field) => field.key)).toEqual(['yearsAtCompany'])
  })

  it('should match by key', () => {
    expect(filterMessageFields('linkedinurl').map((field) => field.key)).toEqual(['linkedinUrl'])
  })

  it('should return an empty list when nothing matches', () => {
    expect(filterMessageFields('nonexistent')).toEqual([])
  })
})
