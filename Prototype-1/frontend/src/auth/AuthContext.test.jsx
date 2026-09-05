import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App.jsx'
import { apiGet, apiPost } from '../api/client.js'

vi.mock('../api/client.js', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('auth gating', () => {
  it('shows the login card when /auth/me reports not authenticated', async () => {
    apiGet.mockResolvedValue({ authenticated: false })
    render(<App />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: 'Classical Lab' })).not.toBeInTheDocument()
  })

  it('shows the console after a successful login', async () => {
    apiGet.mockResolvedValue({ authenticated: false })
    apiPost.mockResolvedValue({ username: 'alice' })
    render(<App />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument(),
    )

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Classical Lab' })).toBeInTheDocument(),
    )
    expect(apiPost).toHaveBeenCalledWith('/auth/login', { username: 'alice', password: 'pw' })
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })
})
