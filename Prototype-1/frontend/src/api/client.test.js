import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiGet, apiPost, apiDelete, ApiError } from './client.js'

function mockJson(payload, status = 200) {
  return Promise.resolve({
    status,
    json: () => Promise.resolve(payload),
  })
}

beforeEach(() => {
  global.fetch = vi.fn()
})

describe('api client', () => {
  it('apiPost unwraps `data` on success', async () => {
    global.fetch.mockReturnValue(
      mockJson({ success: true, message: 'ok', data: { username: 'alice' } }),
    )
    const data = await apiPost('/auth/login', { username: 'alice', password: 'pw' })
    expect(data).toEqual({ username: 'alice' })
  })

  it('sends credentials: "include" and JSON body', async () => {
    global.fetch.mockReturnValue(mockJson({ success: true, message: 'ok', data: null }))
    await apiPost('/auth/logout')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/auth/logout')
    expect(opts.credentials).toBe('include')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(opts.body).toBe('{}')
  })

  it('apiGet sends credentials: "include"', async () => {
    global.fetch.mockReturnValue(mockJson({ success: true, message: 'ok', data: [] }))
    await apiGet('/runs')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/runs')
    expect(opts.credentials).toBe('include')
    expect(opts.method).toBe('GET')
  })

  it('throws ApiError with the backend code on { success: false }', async () => {
    global.fetch.mockReturnValue(
      mockJson(
        { success: false, message: 'invalid credentials', error: { code: 'BAD_CREDENTIALS' } },
        401,
      ),
    )
    await expect(apiPost('/auth/login', {})).rejects.toMatchObject({
      name: 'ApiError',
      code: 'BAD_CREDENTIALS',
      message: 'invalid credentials',
      status: 401,
    })
  })

  it('wraps a transport failure in an ApiError', async () => {
    global.fetch.mockRejectedValue(new Error('boom'))
    const err = await apiDelete('/runs').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('NETWORK')
  })
})
