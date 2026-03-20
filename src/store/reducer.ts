import type { AppState, TaskAction } from '../types'
import { hasClash } from '../selectors'

export function taskReducer(state: AppState, action: TaskAction): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload

    case 'ADD_TASK': {
      if (!state.settings.allowOverlap) {
        const clash = hasClash(state.tasks, action.payload.startTime, action.payload.duration)
        if (clash) {
          throw new Error(
            `Task "${clash.name}" already occupies this time slot. ` +
              `Enable "allow overlapping tasks" in settings to override.`,
          )
        }
      }
      const newTask = {
        ...action.payload,
        id: crypto.randomUUID(),
        completed: false,
      }
      return { ...state, tasks: [...state.tasks, newTask] }
    }

    case 'COMPLETE_TASK': {
      const tasks = state.tasks.map((t) =>
        t.id === action.payload.id ? { ...t, completed: true, completedAt: Date.now() } : t,
      )
      return { ...state, tasks }
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }

    default: {
      const _exhaustive: never = action
      throw new Error(`Unhandled action: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
