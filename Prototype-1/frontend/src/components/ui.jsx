import { useState } from 'react'
import { ApiError } from '../api/client.js'

/* ---------- buttons ---------- */

export function Button({ loading, children, disabled, variant = 'primary', size, ...rest }) {
  const cls = [
    'btn',
    variant === 'secondary' ? 'btn-secondary' : '',
    variant === 'ghost' ? 'btn-ghost' : '',
    size === 'sm' ? 'btn-sm' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

/** Copy-to-clipboard button. The hex strings are the whole point of this app. */
export function CopyButton({ value, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  if (value === undefined || value === null || value === '') return null
  async function copy() {
    try {
      await navigator.clipboard.writeText(String(value))
    } catch {
      return
    }
    setDone(true)
    setTimeout(() => setDone(false), 1200)
  }
  return (
    <button
      type="button"
      className={'copy-btn' + (done ? ' copied' : '')}
      onClick={copy}
      title="Copy to clipboard"
    >
      {done ? '✓ Copied' : label}
    </button>
  )
}

/* ---------- forms ---------- */

export function Field({ label, hint, error, aside, children }) {
  return (
    <label className="field">
      {(label || aside) && (
        <span className="field-label">
          <span>{label}</span>
          {aside}
        </span>
      )}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function TextInput({ mono, invalid, ...props }) {
  const cls = ['input', mono ? 'mono-input' : '', invalid ? 'invalid' : ''].filter(Boolean).join(' ')
  return <input className={cls} type="text" {...props} />
}

export function NumberInput({ invalid, ...props }) {
  return <input className={'input' + (invalid ? ' invalid' : '')} type="number" {...props} />
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

/** Segmented encrypt/decrypt (or any) switch. */
export function ActionToggle({ value, onChange, options = ['encrypt', 'decrypt'] }) {
  return (
    <div className="seg" role="group" aria-label="action">
      {options.map((a) => (
        <button
          key={a}
          type="button"
          className={'seg-btn' + (value === a ? ' active' : '')}
          onClick={() => onChange(a)}
        >
          {a}
        </button>
      ))}
    </div>
  )
}

/* ---------- structure ---------- */

export function PanelHead({ title, children }) {
  return (
    <header className="panel-head">
      <h2>{title}</h2>
      {children && <p className="explainer">{children}</p>}
    </header>
  )
}

/** Controls on the left, results on the right - both visible without scrolling. */
export function Workspace({ controls, children, wide }) {
  if (wide) return <div className="workspace wide">{children}</div>
  return (
    <div className="workspace">
      <div className="ws-controls">{controls}</div>
      <div className="ws-results">{children}</div>
    </div>
  )
}

export function Card({ title, sub, actions, children }) {
  return (
    <section className="card">
      {(title || actions) && (
        <div className="card-head">
          <h3 className="card-title">
            {title} {sub && <span className="card-sub">{sub}</span>}
          </h3>
          {actions}
        </div>
      )}
      <div className="card-body">{children}</div>
    </section>
  )
}

export function Explainer({ children }) {
  return <p className="explainer">{children}</p>
}

export function Note({ children }) {
  return <p className="card-note">{children}</p>
}

export function EmptyState({ icon = '↖', children }) {
  return (
    <div className="empty-state">
      <div className="empty-ico">{icon}</div>
      <div>{children}</div>
    </div>
  )
}

/* ---------- output ---------- */

export function ErrorText({ error }) {
  if (!error) return null
  const msg =
    error instanceof ApiError ? error.message : String(error.message || error)
  const code = error instanceof ApiError ? error.code : null
  return (
    <div className="banner banner-err" role="alert">
      <span aria-hidden="true">⚠</span>
      <span>
        {msg}
        {code && <span className="muted"> ({code})</span>}
      </span>
    </div>
  )
}

export function Banner({ kind = 'info', children }) {
  const ico = { info: 'ℹ', ok: '✓', warn: '⚠', err: '⚠' }[kind] || 'ℹ'
  return (
    <div className={`banner banner-${kind}`}>
      <span aria-hidden="true">{ico}</span>
      <span>{children}</span>
    </div>
  )
}

export function Mono({ children, block }) {
  return block ? (
    <pre className="mono-block">{children}</pre>
  ) : (
    <code className="mono">{children}</code>
  )
}

/** A labelled output line with an optional copy button. */
export function OutRow({ label, value, copy, block, children }) {
  return (
    <div className="out-row">
      <div className="out-key">{label}</div>
      <div className="out-val">
        {children ?? (block ? <Mono block>{value}</Mono> : <Mono>{value}</Mono>)}
        {copy && <CopyButton value={copy === true ? value : copy} />}
      </div>
    </div>
  )
}

export function Stat({ label, value, tone }) {
  return (
    <div className={'stat' + (tone ? ' ' + tone : '')}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

export function Stats({ children }) {
  return <div className="stats">{children}</div>
}

export function Verdict({ pass, children }) {
  return (
    <div className={'verdict ' + (pass ? 'pass' : 'fail')}>
      <span className="verdict-ico" aria-hidden="true">
        {pass ? '✓' : '✗'}
      </span>
      <span>{children}</span>
    </div>
  )
}

export function Pill({ children }) {
  return <span className="pill">{children}</span>
}
