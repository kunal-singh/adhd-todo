import { useState, useRef, useEffect } from 'react'
import { useTaskState } from '../store/hooks'
import type { Task } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function filterTasks(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return tasks.filter((t) => t.name.toLowerCase().includes(q))
}

export function SearchModal({ open, onClose }: Props) {
  const { tasks } = useTaskState()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) return null

  const results = filterTasks(tasks, query)

  function handleClose() {
    setQuery('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-20">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-3 items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value) }}
            placeholder="Search tasks…"
            className="flex-1 text-sm focus:outline-none placeholder-gray-400"
          />
          <button
            onClick={() => { handleClose() }}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            Close
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {query.trim() === '' && (
            <p className="text-sm text-gray-400 text-center py-8">Start typing to search.</p>
          )}
          {query.trim() !== '' && results.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No tasks found.</p>
          )}
          {results.map((task) => (
            <div
              key={task.id}
              className="px-4 py-3 border-b border-gray-50 last:border-0 space-y-0.5"
            >
              <p
                className={`text-sm font-medium ${
                  task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                }`}
              >
                {task.name}
              </p>
              <p className="text-xs text-gray-400">
                {formatDateTime(task.startTime)} · {task.duration} min
                {task.completed && ' · Completed'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
