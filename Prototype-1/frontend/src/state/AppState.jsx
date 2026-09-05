import { createContext, useContext, useState } from 'react'

// Cross-panel scratch state. Currently just the most recent S-DES ciphertext
// hex, so the Attack Simulator can pre-fill its brute-force target.
const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  const [lastSdesCipherHex, setLastSdesCipherHex] = useState('')
  const value = { lastSdesCipherHex, setLastSdesCipherHex }
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within <AppStateProvider>')
  return ctx
}
