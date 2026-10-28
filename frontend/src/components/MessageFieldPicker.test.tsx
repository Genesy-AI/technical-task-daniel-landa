import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageFieldPicker } from './MessageFieldPicker'

describe('MessageFieldPicker', () => {
  it('should show fields grouped by category', () => {
    render(<MessageFieldPicker onInsert={vi.fn()} />)

    const contact = screen.getByRole('group', { name: 'Contact' })
    expect(within(contact).getByRole('button', { name: 'Phone number' })).toBeTruthy()
    expect(within(contact).getByRole('button', { name: 'LinkedIn URL' })).toBeTruthy()

    const professional = screen.getByRole('group', { name: 'Professional' })
    expect(within(professional).getByRole('button', { name: 'Years at company' })).toBeTruthy()
  })

  it('should call onInsert with the field key when a field is clicked', async () => {
    const onInsert = vi.fn()
    render(<MessageFieldPicker onInsert={onInsert} />)

    await userEvent.click(screen.getByRole('button', { name: 'Years at company' }))

    expect(onInsert).toHaveBeenCalledWith('yearsAtCompany')
  })

  it('should filter fields and hide empty groups when searching', async () => {
    render(<MessageFieldPicker onInsert={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Insert field'), 'phone')

    expect(screen.getByRole('button', { name: 'Phone number' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'First name' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Personal' })).toBeNull()
  })

  it('should show an empty state when no field matches', async () => {
    render(<MessageFieldPicker onInsert={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Insert field'), 'zzz')

    expect(screen.getByText('No fields match "zzz"')).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
