import { useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext.jsx'
import { AppStateProvider } from './state/AppState.jsx'
import Layout from './components/Layout.jsx'
import AuthGate from './components/AuthGate.jsx'
import ClassicalPanel from './panels/ClassicalPanel.jsx'
import SdesPanel from './panels/SdesPanel.jsx'
import CryptoPanel from './panels/CryptoPanel.jsx'
import ModesPanel from './panels/ModesPanel.jsx'
import PrngPanel from './panels/PrngPanel.jsx'
import AttackPanel from './panels/AttackPanel.jsx'
import HistoryPanel from './panels/HistoryPanel.jsx'

const TABS = [
  { id: 'classical', label: 'Classical Lab', El: ClassicalPanel },
  { id: 'sdes', label: 'S-DES', El: SdesPanel },
  { id: 'crypto', label: 'DES / AES / RC4', El: CryptoPanel },
  { id: 'modes', label: 'Block Modes', El: ModesPanel },
  { id: 'prng', label: 'PRNG', El: PrngPanel },
  { id: 'attacks', label: 'Attack Simulator', El: AttackPanel },
  { id: 'history', label: 'Run History', El: HistoryPanel },
]

function Console() {
  const [active, setActive] = useState('classical')
  const Active = TABS.find((t) => t.id === active)?.El ?? ClassicalPanel
  return (
    <Layout tabs={TABS} active={active} onSelect={setActive}>
      <Active />
    </Layout>
  )
}

function Gate() {
  const { user, loading } = useAuth()
  if (loading) return <div className="boot">Loading…</div>
  return user ? <Console /> : <AuthGate />
}

export default function App() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <Gate />
      </AppStateProvider>
    </AuthProvider>
  )
}
