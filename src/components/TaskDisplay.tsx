import type { Task } from '../types'

interface Props {
  current: Task | null
  upcoming: Task | null
  onComplete: (id: string) => void
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function TaskDisplay({ current, upcoming, onComplete }: Props) {
  if (current === null && upcoming === null) {
    return (
      <div className="text-center text-gray-400 space-y-2">
        <p className="text-2xl">🎉</p>
        <p className="text-lg font-medium text-gray-500">All clear!</p>
        <p className="text-sm">Add a task to get started.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      {current && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
            Now
          </p>
          <p className="text-xl font-semibold text-gray-800">{current.name}</p>
          <p className="text-sm text-gray-500">
            {formatDate(current.startTime)} at {formatTime(current.startTime)}
            {' · '}{current.duration} min
          </p>
          <button
            onClick={() => { onComplete(current.id) }}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium
              py-2 rounded-xl text-sm transition-colors"
          >
            Mark complete
          </button>
        </div>
      )}

      {upcoming && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Up next
          </p>
          <p className="text-base font-medium text-gray-700">{upcoming.name}</p>
          <p className="text-sm text-gray-400">
            {formatDate(upcoming.startTime)} at {formatTime(upcoming.startTime)}
          </p>
        </div>
      )}
    </div>
  )
}
