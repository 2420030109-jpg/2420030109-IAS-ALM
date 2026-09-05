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
  it('auto-runs the default example exactly once on mount', async () => {
    apiPost.mockResolvedValue({
      action: 'encrypt',
      input: 'ATTACKATDAWN',
      shift: 3,
      output: 'DWWDFNDWGDZQ',
      input_frequency: { A: 25, T: 25 },
      output_frequency: { D: 25, W: 25 },
    })

    render(<CaesarBox />)

    await waitFor(() => expect(screen.getByText('DWWDFNDWGDZQ')).toBeInTheDocument())
    expect(apiPost).toHaveBeenCalledTimes(1)
    expect(apiPost).toHaveBeenCalledWith('/classical/caesar', {
      text: 'ATTACKATDAWN',
      shift: 3,
      action: 'encrypt',
    })
  })

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

    // let the mount auto-run settle so the Run button is enabled again
    const runBtn = screen.getByRole('button', { name: 'Run' })
    await waitFor(() => expect(runBtn).toBeEnabled())

    const shift = screen.getByLabelText('Shift')
    fireEvent.change(shift, { target: { value: '5' } })
    fireEvent.click(runBtn)

    await waitFor(() => expect(screen.getByText('MJQQT')).toBeInTheDocument())

    expect(apiPost).toHaveBeenLastCalledWith('/classical/caesar', {
      text: 'ATTACKATDAWN',
      shift: 5,
      action: 'encrypt',
    })
  })
})
