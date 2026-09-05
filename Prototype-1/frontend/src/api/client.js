// Thin fetch wrapper around the CryptoShield API.
//
// Every endpoint returns the envelope:
//   success: { success: true,  message, data }
//   error:   { success: false, message, error: { code } }
//
// On success we resolve with `data`. On `success === false` (or a transport
// failure) we throw an ApiError carrying `code` + `message` so screens can
// surface the backend's own wording.

const BASE = '/api'

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message || 'Request failed')
    this.name = 'ApiError'
    this.code = code || 'ERROR'
    this.status = status ?? 0
  }
}

async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  let res
  try {
    res = await fetch(BASE + path, opts)
  } catch (e) {
    throw new ApiError(e?.message || 'Network error', 'NETWORK', 0)
  }

  let envelope
  try {
    envelope = await res.json()
  } catch {
    throw new ApiError(`Bad response (HTTP ${res.status})`, 'BAD_RESPONSE', res.status)
  }

  if (!envelope || envelope.success !== true) {
    const code = envelope?.error?.code || 'ERROR'
    const message = envelope?.message || `Request failed (HTTP ${res.status})`
    throw new ApiError(message, code, res.status)
  }

  return envelope.data
}

export function apiGet(path) {
  return request('GET', path)
}

export function apiPost(path, body) {
  return request('POST', path, body ?? {})
}

export function apiDelete(path) {
  return request('DELETE', path)
}

export default { apiGet, apiPost, apiDelete, ApiError }
