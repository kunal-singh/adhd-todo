export interface Task {
  id: string
  name: string
  startTime: number
  duration: number
  completed: boolean
  completedAt?: number
}

export interface Settings {
  allowOverlap: boolean
}

export interface AppState {
  tasks: Task[]
  settings: Settings
}

export type TaskAction =
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'ADD_TASK'; payload: Omit<Task, 'id' | 'completed' | 'completedAt'> }
  | { type: 'COMPLETE_TASK'; payload: { id: string } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
