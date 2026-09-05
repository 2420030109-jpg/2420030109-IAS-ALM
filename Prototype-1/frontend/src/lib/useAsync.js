import { useCallback, useRef, useState } from 'react'

/**
 * Wrap an async task with loading / error / result state.
 * `run(...args)` invokes `task(...args)`, stores the resolved value in `data`,
 * and captures any thrown error (e.g. ApiError) in `error`.
 *
 * `task` is read through a ref so `run` keeps a stable identity across renders
 * even when callers pass a fresh inline function each time — safe to list in a
 * useEffect dependency array.
 */
export function useAsync(task) {
  const taskRef = useRef(task)
  taskRef.current = task

  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const value = await taskRef.current(...args)
      setData(value)
      return value
    } catch (e) {
      setError(e)
      return undefined
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return { data, error, loading, run, reset, setData }
}
