import { useReducer, useEffect, useState, useRef, type ReactNode } from 'react'
import type { AppState } from '../types'
import { taskReducer } from './reducer'
import { hydrate, persist } from '../db/adapter'
import { StateContext, DispatchContext, DEFAULT_STATE, type DispatchFn } from './context'

export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, DEFAULT_STATE)
  const [hydrated, setHydrated] = useState(false)
  // ref always holds the latest committed state so wrappedDispatch never closes over stale state
  const stateRef = useRef<AppState>(state)
  stateRef.current = state

  useEffect(() => {
    hydrate()
      .then((stored) => {
        dispatch({ type: 'HYDRATE', payload: stored })
        setHydrated(true)
      })
      .catch((err: unknown) => {
        console.error('Failed to hydrate state from IndexedDB:', err)
        setHydrated(true)
      })
  }, [])

  const wrappedDispatch: DispatchFn = async (action) => {
    const nextState = taskReducer(stateRef.current, action)
    dispatch(action)
    await persist(nextState)
  }

  if (!hydrated) return null

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={wrappedDispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  )
}
