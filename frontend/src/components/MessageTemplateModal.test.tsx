import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MessageTemplateModal } from './MessageTemplateModal'

const renderModal = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MessageTemplateModal isOpen onClose={vi.fn()} selectedLeadIds={[1]} selectedLeadsCount={1} />
    </QueryClientProvider>
  )

describe('MessageTemplateModal', () => {
  it('should insert the new lead fields into the template at the cursor', async () => {
    renderModal()
    const textarea = screen.getByLabelText<HTMLTextAreaElement>('Message Template')

    await userEvent.type(textarea, 'Call ')
    await userEvent.click(screen.getByRole('button', { name: 'Phone number' }))
    await userEvent.click(screen.getByRole('button', { name: 'LinkedIn URL' }))
    await userEvent.click(screen.getByRole('button', { name: 'Years at company' }))

    expect(textarea.value).toBe('Call {phoneNumber}{linkedinUrl}{yearsAtCompany}')
  })
})
