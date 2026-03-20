import { createContext } from 'react'
import type { AppState, TaskAction } from '../types'

export const DEFAULT_STATE: AppState = {
  tasks: [],
  settings: { allowOverlap: false },
}

export type DispatchFn = (action: TaskAction) => Promise<void>

export const StateContext = createContext<AppState>(DEFAULT_STATE)
export const DispatchContext = createContext<DispatchFn>(() => Promise.resolve())
