import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import HistoryPanel from './HistoryPanel.jsx'
import { apiGet } from '../api/client.js'

vi.mock('../api/client.js', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HistoryPanel', () => {
  it('loads runs once on mount and renders a row', async () => {
    apiGet.mockResolvedValue([
      {
        id: 1,
        module: 'classical.caesar',
        algorithm: 'caesar',
        params_json: '{"text":"HI"}',
        result_json: '{"output":"KL"}',
        elapsed_ms: 1.23,
        created_at: '2026-09-05T10:00:00',
      },
    ])

    render(<HistoryPanel />)

    await waitFor(() => expect(screen.getByText('classical.caesar')).toBeInTheDocument())
    expect(apiGet).toHaveBeenCalledTimes(1)
    expect(apiGet).toHaveBeenCalledWith('/runs')
  })
})
