import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '../api'
import { LeadsGetManyOutput } from '../api/types/leads/getMany'
import { LeadsList } from './LeadsList'

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
}

const renderWithLeads = (leads: LeadsGetManyOutput) => {
  vi.spyOn(api.leads, 'getMany').mockResolvedValue(leads)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LeadsList />
    </QueryClientProvider>
  )
}

describe('LeadsList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should show column headers for the new lead fields', async () => {
    renderWithLeads([baseLead])

    expect(await screen.findByRole('columnheader', { name: 'Phone' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Years at Company' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'LinkedIn' })).toBeTruthy()
  })

  it('should display phone number, years at company and a LinkedIn profile link', async () => {
    renderWithLeads([
      {
        ...baseLead,
        phoneNumber: '+1-280-754-0462',
        yearsAtCompany: 7,
        linkedinUrl: 'https://www.linkedin.com/in/jane-doe',
      },
    ])

    const phoneLink = await screen.findByRole('link', { name: '+1-280-754-0462' })
    expect(phoneLink.getAttribute('href')).toBe('tel:+1-280-754-0462')
    expect(screen.getByRole('cell', { name: '7' })).toBeTruthy()

    const linkedinLink = screen.getByRole('link', { name: /Jane Doe on LinkedIn/ })
    expect(linkedinLink.getAttribute('href')).toBe('https://www.linkedin.com/in/jane-doe')
    expect(linkedinLink.getAttribute('target')).toBe('_blank')
    expect(linkedinLink.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('should show zero years at company instead of a placeholder', async () => {
    renderWithLeads([{ ...baseLead, yearsAtCompany: 0 }])

    expect(await screen.findByRole('cell', { name: '0' })).toBeTruthy()
  })

  it('should show placeholders when the new fields are missing', async () => {
    renderWithLeads([baseLead])

    await screen.findByText('Jane Doe')
    expect(screen.queryByRole('link')).toBeNull()
  })
})
