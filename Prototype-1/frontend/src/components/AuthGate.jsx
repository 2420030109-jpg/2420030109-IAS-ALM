import { useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { Button, Field, TextInput, ErrorText, Banner } from './ui.jsx'

export default function AuthGate() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const isLogin = mode === 'login'

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (isLogin) await login(username, password)
      else await register(username, password)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setMode(isLogin ? 'register' : 'login')
    setError(null)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark" aria-hidden="true">
            🛡️
          </div>
          <h1>CryptoShield</h1>
          <p>An interactive cryptography &amp; information assurance lab</p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={submit}>
              <Field label="Username">
                <TextInput
                  value={username}
                  autoComplete="username"
                  autoFocus
                  placeholder={isLogin ? 'your username' : 'pick a username'}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
              <Field label="Password">
                <input
                  className="input"
                  type="password"
                  value={password}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder={isLogin ? 'your password' : 'pick a password'}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <div className="actions">
                <Button
                  type="submit"
                  loading={busy}
                  disabled={!username || !password}
                  style={{ width: '100%' }}
                >
                  {isLogin ? 'Log in' : 'Create account'}
                </Button>
              </div>
            </form>

            <ErrorText error={error} />

            <p className="auth-switch">
              {isLogin ? "Don't have an account? " : 'Already registered? '}
              <button type="button" className="link-btn" onClick={switchMode}>
                {isLogin ? 'Create one' : 'Log in instead'}
              </button>
            </p>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <Banner kind="info">
            Demo login seeded on the server — <code className="mono">ajithesh</code> /{' '}
            <code className="mono">ajithesh</code>
          </Banner>
        </div>
      </div>
    </div>
  )
}
