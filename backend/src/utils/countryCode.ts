import countries from 'i18n-iso-countries'

const alpha2Codes: ReadonlySet<string> = new Set(Object.keys(countries.getAlpha2Codes()))

export const normalizeCountryCode = (value: string): string => value.trim().toUpperCase()

export const isValidCountryCode = (value: string): boolean => alpha2Codes.has(normalizeCountryCode(value))

export const isValidOptionalCountryCode = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && (!value.trim() || isValidCountryCode(value)))
