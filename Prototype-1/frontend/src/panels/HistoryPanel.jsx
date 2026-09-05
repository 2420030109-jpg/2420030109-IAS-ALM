import { useEffect, useState } from 'react'
import { apiGet, apiDelete } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import {
  Button,
  Card,
  EmptyState,
  ErrorText,
  Mono,
  PanelHead,
  Stat,
  Stats,
  Workspace,
} from '../components/ui.jsx'

/** Both params_json and result_json arrive as JSON *strings*. */
function pretty(jsonStr) {
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2)
  } catch {
    return String(jsonStr ?? '')
  }
}

/** created_at is epoch seconds (a float). Render a readable clock time. */
function toDate(createdAt) {
  if (createdAt === null || createdAt === undefined) return null
  const d = typeof createdAt === 'number' ? new Date(createdAt * 1000) : new Date(createdAt)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatTime(createdAt) {
  const d = toDate(createdAt)
  if (!d) return String(createdAt ?? '—')
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatFull(createdAt) {
  const d = toDate(createdAt)
  return d ? d.toLocaleString() : undefined
}

export default function HistoryPanel() {
  const { data, error, loading, run } = useAsync(() => apiGet('/runs'))
  const clear = useAsync(() => apiDelete('/runs'))
  const [expanded, setExpanded] = useState(null)

  // Auto-load once on mount. `run` is stable, so this never re-fires.
  useEffect(() => {
    run()
  }, [run])

  const rows = Array.isArray(data) ? data : []
  const total = rows.length
  const avgMs = total
    ? rows.reduce((sum, r) => sum + (Number(r.elapsed_ms) || 0), 0) / total
    : 0
  const slowest = total
    ? rows.reduce((best, r) => (Number(r.elapsed_ms) > Number(best.elapsed_ms) ? r : best), rows[0])
    : null

  async function onClear() {
    if (!window.confirm('Clear all run history? This cannot be undone.')) return
    await clear.run()
    setExpanded(null)
    run()
  }

  return (
    <div className="panel">
      <PanelHead title="Run History">
        Every module call is logged server-side with the parameters it received, the result it
        returned, and how long it took. Click a row to see the full record.
      </PanelHead>

      <Workspace wide>
        <Card
          title="Logged runs"
          sub={total ? `${total} record${total === 1 ? '' : 's'}` : undefined}
          actions={
            <div className="row" style={{ flex: 'none', gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={() => run()} loading={loading}>
                Refresh
              </Button>
              <Button size="sm" variant="ghost" onClick={onClear} loading={clear.loading}>
                Clear history
              </Button>
            </div>
          }
        >
          <ErrorText error={error} />
          <ErrorText error={clear.error} />

          {total > 0 && (
            <div style={{ marginBottom: 14 }}>
              <Stats>
                <Stat label="Total runs" value={total} />
                <Stat label="Average elapsed" value={`${avgMs.toFixed(2)} ms`} />
                <Stat
                  label="Slowest"
                  value={`${Number(slowest.elapsed_ms).toFixed(2)} ms`}
                  tone="warn"
                />
              </Stats>
            </div>
          )}

          {total === 0 ? (
            <EmptyState icon="⌛">
              {loading
                ? 'Loading history…'
                : 'Nothing logged yet — run a cipher, a generator, or an attack and it will show up here.'}
            </EmptyState>
          ) : (
            <div className="scroll-table">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Module</th>
                    <th>Algorithm</th>
                    <th style={{ textAlign: 'right' }}>Elapsed (ms)</th>
                    <th aria-label="expand" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <RowGroup
                      key={r.id}
                      row={r}
                      open={expanded === r.id}
                      onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Workspace>
    </div>
  )
}

function RowGroup({ row, open, onToggle }) {
  return (
    <>
      <tr className="clickable" onClick={onToggle} aria-expanded={open}>
        <td className="mono" title={formatFull(row.created_at)}>
          {formatTime(row.created_at)}
        </td>
        <td>{row.module}</td>
        <td className="muted">{row.algorithm}</td>
        <td className="num">{Number(row.elapsed_ms ?? 0).toFixed(2)}</td>
        <td className="muted" aria-hidden="true">
          {open ? '▲' : '▼'}
        </td>
      </tr>
      {open && (
        <tr className="history-detail">
          <td colSpan={5}>
            <div className="detail-grid">
              <div>
                <h5 className="card-sub">Parameters</h5>
                <Mono block>{pretty(row.params_json)}</Mono>
              </div>
              <div>
                <h5 className="card-sub">Result</h5>
                <Mono block>{pretty(row.result_json)}</Mono>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
