import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import HistoryPanel from './HistoryPanel.jsx'
import { apiGet } from '../api/client.js'

vi.mock('../api/client.js', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

const ROW = {
  id: 1,
  module: 'classical.caesar',
  algorithm: 'caesar',
  params_json: '{"text":"HI"}',
  result_json: '{"output":"KL"}',
  elapsed_ms: 1.23,
  // epoch seconds, the way the backend stores it
  created_at: new Date('2026-09-05T22:31:07').getTime() / 1000,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HistoryPanel', () => {
  it('loads runs once on mount and renders a row', async () => {
    apiGet.mockResolvedValue([ROW])

    render(<HistoryPanel />)

    await waitFor(() => expect(screen.getByText('classical.caesar')).toBeInTheDocument())
    expect(apiGet).toHaveBeenCalledTimes(1)
    expect(apiGet).toHaveBeenCalledWith('/runs')
  })

  it('formats the epoch timestamp as a clock time and shows the elapsed column', async () => {
    apiGet.mockResolvedValue([ROW])

    const { container } = render(<HistoryPanel />)

    await waitFor(() => expect(screen.getByText('classical.caesar')).toBeInTheDocument())
    expect(screen.getByText('22:31:07')).toBeInTheDocument()
    expect(container.querySelector('td.num').textContent).toBe('1.23')
  })

  it('summarises the log with total and average elapsed stats', async () => {
    apiGet.mockResolvedValue([ROW, { ...ROW, id: 2, elapsed_ms: 3.77 }])

    render(<HistoryPanel />)

    await waitFor(() => expect(screen.getByText('Total runs')).toBeInTheDocument())
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('2.50 ms')).toBeInTheDocument()
  })

  it('expands a row into pretty-printed params and result', async () => {
    apiGet.mockResolvedValue([ROW])

    const { container } = render(<HistoryPanel />)

    await waitFor(() => expect(screen.getByText('classical.caesar')).toBeInTheDocument())
    expect(container.querySelectorAll('pre.mono-block')).toHaveLength(0)

    fireEvent.click(screen.getByText('classical.caesar'))

    const blocks = container.querySelectorAll('pre.mono-block')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].textContent).toContain('"text": "HI"')
    expect(blocks[1].textContent).toContain('"output": "KL"')
  })

  it('shows an empty state when there are no runs', async () => {
    apiGet.mockResolvedValue([])

    const { container } = render(<HistoryPanel />)

    await waitFor(() => expect(container.querySelector('.empty-state')).toBeTruthy())
    expect(container.querySelector('table')).toBeNull()
    expect(apiGet).toHaveBeenCalledTimes(1)
  })
})
