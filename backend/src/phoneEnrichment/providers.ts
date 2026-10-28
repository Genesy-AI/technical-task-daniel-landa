import { getCountryCallingCode, isSupportedCountry } from 'libphonenumber-js'
import { PhoneLookupInput, PhoneProviderId } from './config'

const PROVIDERS_BASE_URL = 'https://api.enginy.ai/api/tmp'

export interface PhoneProviderRequest {
  url: string
  headers: Record<string, string>
  body: Record<string, string>
}

export interface PhoneProvider {
  /** Returns null when the lead lacks an input the provider requires, so the provider is skipped. */
  buildRequest: (input: PhoneLookupInput) => PhoneProviderRequest | null
  parsePhone: (body: unknown) => string | null
}

const readField = (body: unknown, key: string): unknown =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined

const readPhone = (body: unknown, key: string): string | null => {
  const value = readField(body, key)
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

const withCallingCode = (phone: string, countryCode: unknown): string => {
  const country = typeof countryCode === 'string' ? countryCode.toUpperCase() : ''
  return isSupportedCountry(country) ? `+${getCountryCallingCode(country)} ${phone}` : phone
}

const orionConnect: PhoneProvider = {
  buildRequest: ({ fullName, companyWebsite }) =>
    companyWebsite
      ? {
          url: `${PROVIDERS_BASE_URL}/orionConnect`,
          headers: { 'x-auth-me': process.env.ORION_CONNECT_API_KEY ?? 'mySecretKey123' },
          body: { fullName, companyWebsite },
        }
      : null,
  parsePhone: (body) => readPhone(body, 'phone'),
}

const astraDialer: PhoneProvider = {
  buildRequest: ({ email }) => ({
    url: `${PROVIDERS_BASE_URL}/astraDialer`,
    headers: { apiKey: process.env.ASTRA_DIALER_API_KEY ?? '1234jhgf' },
    body: { email },
  }),
  parsePhone: (body) => readPhone(body, 'phoneNmbr'),
}

const nimbusLookup: PhoneProvider = {
  buildRequest: ({ email, jobTitle }) => {
    if (!jobTitle) return null
    const query = new URLSearchParams({ api: process.env.NIMBUS_LOOKUP_API_KEY ?? '000099998888' })
    return {
      url: `${PROVIDERS_BASE_URL}/numbusLookup?${query}`,
      headers: {},
      body: { email, jobTitle },
    }
  },
  parsePhone: (body) => {
    // Docs say `number`, but the live API currently answers with `phoneNmbr`: accept both.
    const phone = readPhone(body, 'number') ?? readPhone(body, 'phoneNmbr')
    return phone && withCallingCode(phone, readField(body, 'countryCode'))
  },
}

export const PHONE_PROVIDER_ADAPTERS: Record<PhoneProviderId, PhoneProvider> = {
  orionConnect,
  astraDialer,
  nimbusLookup,
}
