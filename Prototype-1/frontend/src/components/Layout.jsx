import { useAuth } from '../auth/AuthContext.jsx'

export default function Layout({ tabs, active, onSelect, children }) {
  const { user, logout } = useAuth()
  return (
    <div className="layout">
      <header className="app-header">
        <h1 className="brand">🛡️ CryptoShield</h1>
        <div className="header-right">
          <span className="whoami">{user}</span>
          <button className="btn btn-ghost" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </header>
      <div className="body">
        <nav className="side-nav">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={'nav-btn' + (active === t.id ? ' active' : '')}
              onClick={() => onSelect(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <main className="panel-area">{children}</main>
      </div>
    </div>
  )
}
