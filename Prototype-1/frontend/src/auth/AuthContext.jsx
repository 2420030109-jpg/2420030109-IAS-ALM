import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { apiGet, apiPost } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // username string | null
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    apiGet('/auth/me')
      .then((data) => {
        if (!alive) return
        setUser(data?.authenticated ? data.username : null)
      })
      .catch(() => {
        if (alive) setUser(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await apiPost('/auth/login', { username, password })
    setUser(data?.username ?? username)
    return data
  }, [])

  const register = useCallback(
    async (username, password) => {
      await apiPost('/auth/register', { username, password })
      // Contract: register returns data:null. Log the new user straight in.
      return login(username, password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const value = { user, loading, login, register, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
