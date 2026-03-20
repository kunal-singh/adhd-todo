import { useContext } from 'react'
import { StateContext, DispatchContext, type DispatchFn } from './context'
import type { AppState } from '../types'

export function useTaskState(): AppState {
  return useContext(StateContext)
}

export function useTaskDispatch(): DispatchFn {
  return useContext(DispatchContext)
}
