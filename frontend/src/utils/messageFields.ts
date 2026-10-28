export const MESSAGE_FIELD_GROUPS = ['Personal', 'Contact', 'Professional'] as const

export type MessageFieldGroup = (typeof MESSAGE_FIELD_GROUPS)[number]

export interface MessageField {
  key: string
  label: string
  group: MessageFieldGroup
}

export const MESSAGE_FIELDS: readonly MessageField[] = [
  { key: 'firstName', label: 'First name', group: 'Personal' },
  { key: 'lastName', label: 'Last name', group: 'Personal' },
  { key: 'countryCode', label: 'Country code', group: 'Personal' },
  { key: 'email', label: 'Email', group: 'Contact' },
  { key: 'phoneNumber', label: 'Phone number', group: 'Contact' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', group: 'Contact' },
  { key: 'jobTitle', label: 'Job title', group: 'Professional' },
  { key: 'companyName', label: 'Company name', group: 'Professional' },
  { key: 'yearsAtCompany', label: 'Years at company', group: 'Professional' },
]

export const filterMessageFields = (query: string): MessageField[] => {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return [...MESSAGE_FIELDS]

  return MESSAGE_FIELDS.filter(
    (field) =>
      field.label.toLowerCase().includes(normalizedQuery) || field.key.toLowerCase().includes(normalizedQuery)
  )
}
