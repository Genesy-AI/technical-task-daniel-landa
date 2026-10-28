const PHONE_NUMBER_REGEX = /^\+?[\d\s().-]+(?:\s*(?:x|ext\.?)\s*\d+)?$/i
const PHONE_EXTENSION_REGEX = /(?:x|ext\.?)\s*\d+$/i
const MIN_PHONE_DIGITS = 7
const MAX_PHONE_DIGITS = 15
const MAX_YEARS_AT_COMPANY = 100

export const isValidPhoneNumber = (value: string): boolean => {
  const trimmed = value.trim()
  if (!PHONE_NUMBER_REGEX.test(trimmed)) return false

  const digitCount = trimmed.replace(PHONE_EXTENSION_REGEX, '').replace(/\D/g, '').length
  return digitCount >= MIN_PHONE_DIGITS && digitCount <= MAX_PHONE_DIGITS
}

export const parseYearsAtCompany = (value: string): number | null => {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null

  const years = Number(trimmed)
  return years <= MAX_YEARS_AT_COMPANY ? years : null
}

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
