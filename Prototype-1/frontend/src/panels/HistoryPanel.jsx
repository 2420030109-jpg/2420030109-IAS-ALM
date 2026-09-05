import { useEffect, useState } from 'react'
import { apiGet, apiDelete } from '../api/client.js'
import { useAsync } from '../lib/useAsync.js'
import { Button, Card, Explainer, ErrorText, Mono } from '../components/ui.jsx'

function pretty(jsonStr) {
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2)
  } catch {
    return String(jsonStr ?? '')
  }
}

export default function HistoryPanel() {
  const { data, error, loading, run } = useAsync(() => apiGet('/runs'))
  const clear = useAsync(() => apiDelete('/runs'))
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    run()
  }, [run])

  const rows = Array.isArray(data) ? data : []

  async function onClear() {
    if (!window.confirm('Clear all run history? This cannot be undone.')) return
    await clear.run()
    run()
  }

  return (
    <div className="panel">
      <h2>Run History</h2>
      <Explainer>Every module call is logged server-side with its params, result, and timing.</Explainer>
      <Card>
        <div className="row">
          <Button onClick={() => run()} loading={loading}>
            Refresh
          </Button>
          <Button className="btn" onClick={onClear} loading={clear.loading}>
            Clear history
          </Button>
        </div>
        <ErrorText error={error} />
        <ErrorText error={clear.error} />
        <div className="scroll-table">
          <table>
            <thead>
              <tr>
                <th>time</th>
                <th>module</th>
                <th>algorithm</th>
                <th>elapsed (ms)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No runs yet.
                  </td>
                </tr>
              )}
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
      </Card>
    </div>
  )
}

function RowGroup({ row, open, onToggle }) {
  return (
    <>
      <tr className="history-row" onClick={onToggle}>
        <td className="mono">{row.created_at}</td>
        <td>{row.module}</td>
        <td>{row.algorithm}</td>
        <td>{row.elapsed_ms}</td>
        <td>{open ? '▲' : '▼'}</td>
      </tr>
      {open && (
        <tr className="history-detail">
          <td colSpan={5}>
            <div className="detail-grid">
              <div>
                <h5>params_json</h5>
                <Mono block>{pretty(row.params_json)}</Mono>
              </div>
              <div>
                <h5>result_json</h5>
                <Mono block>{pretty(row.result_json)}</Mono>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
