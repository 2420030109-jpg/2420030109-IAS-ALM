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

const GROUPS = [
  {
    label: 'Ciphers',
    tabs: [
      { id: 'classical', label: 'Classical Lab', icon: '🔤', El: ClassicalPanel },
      { id: 'sdes', label: 'S-DES', icon: '🧩', El: SdesPanel },
      { id: 'crypto', label: 'DES / AES / RC4', icon: '🔐', El: CryptoPanel },
      { id: 'modes', label: 'Block Modes', icon: '🧱', El: ModesPanel },
    ],
  },
  {
    label: 'Analysis',
    tabs: [
      { id: 'prng', label: 'PRNG', icon: '🎲', El: PrngPanel },
      { id: 'attacks', label: 'Attack Simulator', icon: '💥', El: AttackPanel },
    ],
  },
  {
    label: 'Session',
    tabs: [{ id: 'history', label: 'Run History', icon: '📜', El: HistoryPanel }],
  },
]

const ALL_TABS = GROUPS.flatMap((g) => g.tabs)

function Console() {
  const [active, setActive] = useState('classical')
  const Active = ALL_TABS.find((t) => t.id === active)?.El ?? ClassicalPanel
  return (
    <Layout groups={GROUPS} active={active} onSelect={setActive}>
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
