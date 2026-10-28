import { describe, it, expect } from 'vitest'
import { LeadsGetManyOutput } from '../api/types/leads/getMany'
import { formatPhoneEnrichmentSummary, isEnrichingPhone, summarizePhoneEnrichment } from './phoneEnrichment'

const lead = (phoneEnrichmentStatus: LeadsGetManyOutput[number]['phoneEnrichmentStatus']) => ({
  id: 1,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  jobTitle: null,
  countryCode: null,
  companyName: null,
  message: null,
  emailVerified: null,
  phoneNumber: null,
  yearsAtCompany: null,
  linkedinUrl: null,
  phoneEnrichmentStatus,
  phoneEnrichmentProvider: null,
})

describe('isEnrichingPhone', () => {
  it('should only be true while the phone search is in progress', () => {
    expect(isEnrichingPhone(lead('IN_PROGRESS'))).toBe(true)
    expect(isEnrichingPhone(lead('FOUND'))).toBe(false)
    expect(isEnrichingPhone(lead(null))).toBe(false)
  })
})

describe('summarizePhoneEnrichment', () => {
  it('should count leads by phone enrichment status', () => {
    expect(
      summarizePhoneEnrichment([
        lead('IN_PROGRESS'),
        lead('FOUND'),
        lead('FOUND'),
        lead('NOT_FOUND'),
        lead('FAILED'),
        lead(null),
      ])
    ).toEqual({ inProgress: 1, found: 2, notFound: 1, failed: 1 })
  })
})

describe('formatPhoneEnrichmentSummary', () => {
  it('should describe the phones found and the leads without data', () => {
    expect(formatPhoneEnrichmentSummary({ inProgress: 0, found: 2, notFound: 1, failed: 0 })).toBe(
      'Found 2 phone numbers · 1 lead with no data'
    )
    expect(formatPhoneEnrichmentSummary({ inProgress: 0, found: 1, notFound: 0, failed: 0 })).toBe(
      'Found 1 phone number'
    )
  })

  it('should say so when no phone was found', () => {
    expect(formatPhoneEnrichmentSummary({ inProgress: 0, found: 0, notFound: 3, failed: 0 })).toBe(
      'No phone numbers found · 3 leads with no data'
    )
  })
})
