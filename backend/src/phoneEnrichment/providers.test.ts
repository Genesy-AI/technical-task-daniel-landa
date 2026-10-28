import { describe, it, expect } from 'vitest'
import { PhoneLookupInput } from './config'
import { PHONE_PROVIDER_ADAPTERS } from './providers'

const input: PhoneLookupInput = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  jobTitle: 'CTO',
  companyWebsite: 'example.com',
}

const { orionConnect, astraDialer, nimbusLookup } = PHONE_PROVIDER_ADAPTERS

describe('Orion Connect adapter', () => {
  it('sends full name and company website with the auth header', () => {
    expect(orionConnect.buildRequest(input)).toEqual({
      url: 'https://api.enginy.ai/api/tmp/orionConnect',
      headers: { 'x-auth-me': 'mySecretKey123' },
      body: { fullName: 'Ada Lovelace', companyWebsite: 'example.com' },
    })
  })

  it('is skipped when the company website is unknown', () => {
    expect(orionConnect.buildRequest({ ...input, companyWebsite: null })).toBeNull()
  })

  it('reads the phone field', () => {
    expect(orionConnect.parsePhone({ phone: '7272761008' })).toBe('7272761008')
    expect(orionConnect.parsePhone({ phone: null })).toBeNull()
  })
})

describe('Astra Dialer adapter', () => {
  it('sends the email with the apiKey header', () => {
    expect(astraDialer.buildRequest(input)).toEqual({
      url: 'https://api.enginy.ai/api/tmp/astraDialer',
      headers: { apiKey: '1234jhgf' },
      body: { email: 'ada@example.com' },
    })
  })

  it('reads the phoneNmbr field, treating null, undefined and blanks as no data', () => {
    expect(astraDialer.parsePhone({ phoneNmbr: '9335775209' })).toBe('9335775209')
    expect(astraDialer.parsePhone({ phoneNmbr: null })).toBeNull()
    expect(astraDialer.parsePhone({ phoneNmbr: '  ' })).toBeNull()
    expect(astraDialer.parsePhone({})).toBeNull()
  })
})

describe('Nimbus Lookup adapter', () => {
  it('sends email and job title with the api key as a query parameter', () => {
    expect(nimbusLookup.buildRequest(input)).toEqual({
      url: 'https://api.enginy.ai/api/tmp/numbusLookup?api=000099998888',
      headers: {},
      body: { email: 'ada@example.com', jobTitle: 'CTO' },
    })
  })

  it('is skipped when the job title is unknown', () => {
    expect(nimbusLookup.buildRequest({ ...input, jobTitle: null })).toBeNull()
  })

  it('prefixes the numeric phone with the calling code of its country', () => {
    expect(nimbusLookup.parsePhone({ number: 2730603531, countryCode: 'ES' })).toBe('+34 2730603531')
  })

  it('accepts the phoneNmbr field the live API returns instead of the documented number', () => {
    expect(nimbusLookup.parsePhone({ phoneNmbr: 2730603531, countryCode: 'us' })).toBe('+1 2730603531')
  })

  it('keeps the bare phone when the country code is unknown', () => {
    expect(nimbusLookup.parsePhone({ number: 2730603531, countryCode: 'XX' })).toBe('2730603531')
    expect(nimbusLookup.parsePhone({ number: 2730603531 })).toBe('2730603531')
  })

  it('returns null when there is no phone', () => {
    expect(nimbusLookup.parsePhone({ countryCode: 'ES' })).toBeNull()
    expect(nimbusLookup.parsePhone(null)).toBeNull()
  })
})
