const PHONE_NUMBER_REGEX = /^\+?[\d\s().-]+(?:\s*(?:x|ext\.?)\s*\d+)?$/i
const PHONE_EXTENSION_REGEX = /(?:x|ext\.?)\s*\d+$/i
const MIN_PHONE_DIGITS = 7
const MAX_PHONE_DIGITS = 15
const MAX_YEARS_AT_COMPANY = 100

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && !value.trim())

export const isValidPhoneNumber = (value: string): boolean => {
  const trimmed = value.trim()
  if (!PHONE_NUMBER_REGEX.test(trimmed)) return false

  const digitCount = trimmed.replace(PHONE_EXTENSION_REGEX, '').replace(/\D/g, '').length
  return digitCount >= MIN_PHONE_DIGITS && digitCount <= MAX_PHONE_DIGITS
}

export const isValidYearsAtCompany = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= MAX_YEARS_AT_COMPANY

export const normalizeLinkedinUrl = (value: string): string => {
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export const isValidLinkedinUrl = (value: string): boolean => {
  try {
    const url = new URL(normalizeLinkedinUrl(value))
    return url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com')
  } catch {
    return false
  }
}

export const isValidOptionalPhoneNumber = (value: unknown): boolean =>
  isBlank(value) || (typeof value === 'string' && isValidPhoneNumber(value))

export const isValidOptionalYearsAtCompany = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'number' && isValidYearsAtCompany(value))

export const isValidOptionalLinkedinUrl = (value: unknown): boolean =>
  isBlank(value) || (typeof value === 'string' && isValidLinkedinUrl(value))
