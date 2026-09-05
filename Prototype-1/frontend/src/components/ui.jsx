import { ApiError } from '../api/client.js'

export function Button({ loading, children, disabled, ...rest }) {
  return (
    <button className="btn" disabled={disabled || loading} {...rest}>
      {loading ? '…' : children}
    </button>
  )
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function TextInput(props) {
  return <input className="input" type="text" {...props} />
}

export function NumberInput(props) {
  return <input className="input" type="number" {...props} />
}

export function Select({ options, ...rest }) {
  return (
    <select className="input" {...rest}>
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ),
      )}
    </select>
  )
}

export function Explainer({ children }) {
  return <p className="explainer">{children}</p>
}

export function ErrorText({ error }) {
  if (!error) return null
  const msg = error instanceof ApiError ? `${error.message} (${error.code})` : String(error.message || error)
  return <p className="error-text" role="alert">{msg}</p>
}

export function Card({ title, children }) {
  return (
    <section className="card">
      {title && <h3 className="card-title">{title}</h3>}
      {children}
    </section>
  )
}

export function Mono({ children, block }) {
  return block ? <pre className="mono-block">{children}</pre> : <code className="mono">{children}</code>
}

/** Encrypt / Decrypt toggle. */
export function ActionToggle({ value, onChange }) {
  return (
    <div className="toggle" role="group" aria-label="action">
      {['encrypt', 'decrypt'].map((a) => (
        <button
          key={a}
          type="button"
          className={'toggle-btn' + (value === a ? ' active' : '')}
          onClick={() => onChange(a)}
        >
          {a}
        </button>
      ))}
    </div>
  )
}
