import { useState } from 'react'
import { FiSearch, FiSettings } from 'react-icons/fi'
import { useTaskState, useTaskDispatch } from '../store/hooks'
import { getCurrentTask, getUpcomingTask } from '../selectors'
import { TaskDisplay } from './TaskDisplay'
import { AddTaskModal } from './AddTaskModal'
import { SearchModal } from './SearchModal'
import { SettingsModal } from './SettingsModal'

export function HomeScreen() {
  const state = useTaskState()
  const dispatch = useTaskDispatch()
  const [addOpen, setAddOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const current = getCurrentTask(state.tasks)
  const upcoming = getUpcomingTask(state.tasks, current)

  function handleComplete(id: string) {
    void dispatch({ type: 'COMPLETE_TASK', payload: { id } })
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 gap-8">
      <TaskDisplay current={current} upcoming={upcoming} onComplete={handleComplete} />

      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <button
          onClick={() => { setAddOpen(true) }}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold
            py-3 px-6 rounded-2xl text-lg transition-colors"
        >
          + Add Task
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => { setSearchOpen(true) }}
            aria-label="Search tasks"
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <FiSearch size={20} />
          </button>
          <button
            onClick={() => { setSettingsOpen(true) }}
            aria-label="Settings"
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      <AddTaskModal open={addOpen} onClose={() => { setAddOpen(false) }} />
      <SearchModal open={searchOpen} onClose={() => { setSearchOpen(false) }} />
      <SettingsModal open={settingsOpen} onClose={() => { setSettingsOpen(false) }} />
    </div>
  )
}
