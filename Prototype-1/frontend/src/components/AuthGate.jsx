import { useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { Button, Field, TextInput, ErrorText } from './ui.jsx'

export default function AuthGate() {
  const { login, register } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(null) // 'login' | 'register' | null
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  async function run(kind) {
    setError(null)
    setNotice(null)
    setBusy(kind)
    try {
      if (kind === 'login') await login(username, password)
      else {
        await register(username, password)
        setNotice('registered')
      }
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h2 className="card-title">🛡️ CryptoShield</h2>
        <p className="explainer">
          Sign in to open the console. New here? Register and you will be logged straight in.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run('login')
          }}
        >
          <Field label="Username">
            <TextInput
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <input
              className="input"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <div className="row">
            <Button type="submit" loading={busy === 'login'}>
              Log in
            </Button>
            <Button type="button" loading={busy === 'register'} onClick={() => run('register')}>
              Register
            </Button>
          </div>
        </form>
        {notice && <p className="notice-text">{notice}</p>}
        <ErrorText error={error} />
      </div>
    </div>
  )
}
