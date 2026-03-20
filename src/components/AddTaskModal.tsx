import { useState } from 'react'
import { useTaskState, useTaskDispatch } from '../store/hooks'
import { hasClash } from '../selectors'

interface Props {
  open: boolean
  onClose: () => void
}

export function AddTaskModal({ open, onClose }: Props) {
  const state = useTaskState()
  const dispatch = useTaskDispatch()
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function reset() {
    setName('')
    setStartTime('')
    setDuration('')
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const startMs = new Date(startTime).getTime()
    const durationMins = parseInt(duration, 10)

    if (!name.trim()) {
      setError('Task name cannot be empty.')
      return
    }
    if (isNaN(startMs)) {
      setError('Please enter a valid start time.')
      return
    }
    if (isNaN(durationMins) || durationMins <= 0) {
      setError('Duration must be a positive number of minutes.')
      return
    }

    if (!state.settings.allowOverlap) {
      const clash = hasClash(state.tasks, startMs, durationMins)
      if (clash) {
        setError(`"${clash.name}" already occupies this time slot. Adjust the time or duration.`)
        return
      }
    }

    try {
      await dispatch({
        type: 'ADD_TASK',
        payload: { name: name.trim(), startTime: startMs, duration: durationMins },
      })
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add task.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-800">New Task</h2>

        <form
          onSubmit={(e) => { void handleSubmit(e) }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600" htmlFor="task-name">
              Task name
            </label>
            <input
              id="task-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value) }}
              required
              placeholder="What do you need to do?"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600" htmlFor="task-start">
              Start time
            </label>
            <input
              id="task-start"
              type="datetime-local"
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value) }}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600" htmlFor="task-duration">
              Duration (minutes)
            </label>
            <input
              id="task-duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => { setDuration(e.target.value) }}
              required
              placeholder="e.g. 30"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { handleClose() }}
              className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5
                rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-medium
                py-2.5 rounded-xl text-sm transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
