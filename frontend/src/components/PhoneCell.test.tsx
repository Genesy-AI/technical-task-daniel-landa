import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeadsGetManyOutput } from '../api/types/leads/getMany'
import { PhoneCell } from './PhoneCell'

const baseLead: LeadsGetManyOutput[number] = {
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
  phoneEnrichmentStatus: null,
  phoneEnrichmentProvider: null,
}

describe('PhoneCell', () => {
  it('should show a placeholder when the phone is unknown and was never searched', () => {
    render(<PhoneCell lead={baseLead} />)

    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('should show which provider is being checked while searching', () => {
    render(
      <PhoneCell
        lead={{ ...baseLead, phoneEnrichmentStatus: 'IN_PROGRESS', phoneEnrichmentProvider: 'astraDialer' }}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('Checking Astra Dialer…')
  })

  it('should show a generic searching state before the first provider is queried', () => {
    render(<PhoneCell lead={{ ...baseLead, phoneEnrichmentStatus: 'IN_PROGRESS' }} />)

    expect(screen.getByRole('status')).toHaveTextContent('Searching…')
  })

  it('should show the phone found and the provider that found it', () => {
    render(
      <PhoneCell
        lead={{
          ...baseLead,
          phoneNumber: '+34 2730603531',
          phoneEnrichmentStatus: 'FOUND',
          phoneEnrichmentProvider: 'nimbusLookup',
        }}
      />
    )

    expect(screen.getByRole('link', { name: '+34 2730603531' })).toHaveAttribute('href', 'tel:+34 2730603531')
    expect(screen.getByText('via Nimbus Lookup')).toBeInTheDocument()
  })

  it('should not credit a provider for phones that were imported', () => {
    render(<PhoneCell lead={{ ...baseLead, phoneNumber: '+1-280-754-0462' }} />)

    expect(screen.queryByText(/via/)).not.toBeInTheDocument()
  })

  it('should show when no provider had data', () => {
    render(<PhoneCell lead={{ ...baseLead, phoneEnrichmentStatus: 'NOT_FOUND' }} />)

    expect(screen.getByText('No data found')).toBeInTheDocument()
  })

  it('should show when the lookup failed, explaining how to retry', () => {
    render(<PhoneCell lead={{ ...baseLead, phoneEnrichmentStatus: 'FAILED' }} />)

    expect(screen.getByText('Lookup failed')).toHaveAttribute(
      'title',
      'Some providers could not be reached. Run Find Phone again to retry.'
    )
  })
})
