import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CaesarBox } from './ClassicalPanel.jsx'
import { apiPost } from '../api/client.js'

vi.mock('../api/client.js', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CaesarBox', () => {
  it('sends the typed shift and renders the mocked output', async () => {
    apiPost.mockResolvedValue({
      action: 'encrypt',
      input: 'HELLO',
      shift: 5,
      output: 'MJQQT',
      input_frequency: { H: 20, E: 20, L: 40, O: 20 },
      output_frequency: { M: 20, J: 20, Q: 40, T: 20 },
    })

    render(<CaesarBox />)

    const shift = screen.getByLabelText('Shift')
    fireEvent.change(shift, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt' }))

    await waitFor(() => expect(screen.getByText('MJQQT')).toBeInTheDocument())

    expect(apiPost).toHaveBeenCalledWith('/classical/caesar', {
      text: 'ATTACKATDAWN',
      shift: 5,
      action: 'encrypt',
    })
  })
})
