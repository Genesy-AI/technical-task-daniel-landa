import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
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
  phoneEnrichmentStatus: null,
  phoneEnrichmentProvider: null,
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

describe('LeadsList phone enrichment', () => {
  // Polling for the workflow progress happens every 2 seconds.
  const POLL_TIMEOUT = { timeout: 4000 }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const renderList = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Toaster />
        <LeadsList />
      </QueryClientProvider>
    )

  const findPhoneOf = async (leadName: string) => {
    const row = (await screen.findByText(leadName)).closest('tr')
    if (!row) throw new Error(`Row for ${leadName} not found`)
    await userEvent.click(within(row).getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /Enrich/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Find Phone' }))
  }

  it('should search the phone of the selected leads, showing progress until the phone is found', async () => {
    vi.spyOn(api.leads, 'getMany')
      .mockResolvedValueOnce([baseLead])
      .mockResolvedValue([
        {
          ...baseLead,
          phoneNumber: '7272761008',
          phoneEnrichmentStatus: 'FOUND',
          phoneEnrichmentProvider: 'orionConnect',
        },
      ])
    const enrichPhones = vi
      .spyOn(api.leads, 'enrichPhones')
      .mockResolvedValue({ success: true, startedLeadIds: [1], skipped: [], errors: [] })
    renderList()

    await findPhoneOf('Jane Doe')

    expect(enrichPhones).toHaveBeenCalledWith({ leadIds: [1] })
    expect(await screen.findByText('Searching phone numbers for 1 lead')).toBeInTheDocument()
    expect(screen.getByText('Finding phones 0/1')).toBeInTheDocument()
    expect(screen.getByText('Searching…')).toBeInTheDocument()

    expect(await screen.findByRole('link', { name: '7272761008' }, POLL_TIMEOUT)).toBeInTheDocument()
    expect(screen.getByText('via Orion Connect')).toBeInTheDocument()
    expect(await screen.findByText('Found 1 phone number')).toBeInTheDocument()
    expect(screen.queryByText(/Finding phones/)).not.toBeInTheDocument()
  }, 10_000)

  it('should tell the user when the phone lookup failed and how to retry', async () => {
    vi.spyOn(api.leads, 'getMany')
      .mockResolvedValueOnce([baseLead])
      .mockResolvedValue([{ ...baseLead, phoneEnrichmentStatus: 'FAILED' }])
    vi.spyOn(api.leads, 'enrichPhones').mockResolvedValue({
      success: true,
      startedLeadIds: [1],
      skipped: [],
      errors: [],
    })
    renderList()

    await findPhoneOf('Jane Doe')

    expect(await screen.findByText('Lookup failed', {}, POLL_TIMEOUT)).toBeInTheDocument()
    expect(
      await screen.findByText('Phone lookup failed for 1 lead. Run Find Phone again to retry.')
    ).toBeInTheDocument()
  }, 10_000)

  it('should explain why a lead was skipped', async () => {
    vi.spyOn(api.leads, 'getMany').mockResolvedValue([baseLead])
    vi.spyOn(api.leads, 'enrichPhones').mockResolvedValue({
      success: true,
      startedLeadIds: [],
      skipped: [{ leadId: 1, leadName: 'Jane Doe', reason: 'No phone data was found for this lead' }],
      errors: [],
    })
    renderList()

    await findPhoneOf('Jane Doe')

    expect(
      await screen.findByText('Skipped Jane Doe: No phone data was found for this lead')
    ).toBeInTheDocument()
    expect(screen.queryByText(/Finding phones/)).not.toBeInTheDocument()
  })

  it('should show an error when the phone search cannot be started', async () => {
    vi.spyOn(api.leads, 'getMany').mockResolvedValue([baseLead])
    vi.spyOn(api.leads, 'enrichPhones').mockRejectedValue(new Error('Network Error'))
    renderList()

    await findPhoneOf('Jane Doe')

    expect(await screen.findByText('Failed to start the phone search. Please try again.')).toBeInTheDocument()
  })
})
