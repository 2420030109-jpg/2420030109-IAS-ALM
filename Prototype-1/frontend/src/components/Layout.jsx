import { useAuth } from '../auth/AuthContext.jsx'

export default function Layout({ groups, active, onSelect, children }) {
  const { user, logout } = useAuth()
  return (
    <div className="layout">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            🛡️
          </span>
          <span>CryptoShield</span>
          <span className="brand-sub">Cryptography &amp; Information Assurance lab</span>
        </div>
        <div className="header-right">
          <span className="whoami">
            <span className="avatar" aria-hidden="true">
              {(user || '?').slice(0, 1)}
            </span>
            <span className="whoami-name">{user}</span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </header>
      <div className="body">
        <nav className="side-nav">
          {groups.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="nav-group-label">{g.label}</div>
              {g.tabs.map((t) => (
                <button
                  key={t.id}
                  className={'nav-btn' + (active === t.id ? ' active' : '')}
                  onClick={() => onSelect(t.id)}
                  aria-current={active === t.id ? 'page' : undefined}
                >
                  <span className="nav-ico" aria-hidden="true">
                    {t.icon}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <main className="panel-area">{children}</main>
      </div>
    </div>
  )
}
