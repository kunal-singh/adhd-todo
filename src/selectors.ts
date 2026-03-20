import type { Task } from './types'

function incompleteSortedByStartTime(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.completed).sort((a, b) => a.startTime - b.startTime)
}

export function getCurrentTask(tasks: Task[]): Task | null {
  const now = Date.now()
  const incomplete = incompleteSortedByStartTime(tasks)
  if (incomplete.length === 0) return null

  const overdue = incomplete.filter((t) => t.startTime <= now)
  if (overdue.length > 0) return overdue[0]

  // no overdue tasks — nothing is "now", upcoming slot handles future tasks
  return null
}

export function getUpcomingTask(tasks: Task[], current: Task | null): Task | null {
  const now = Date.now()
  const incomplete = incompleteSortedByStartTime(tasks)
  // only future-dated tasks qualify — overdue tasks beyond current are hidden until current completes (FR-9)
  const future = incomplete.filter(
    (t) => t.startTime > now && t.id !== current?.id,
  )
  return future[0] ?? null
}

export function hasClash(tasks: Task[], startTime: number, duration: number): Task | null {
  const endTime = startTime + duration * 60 * 1000
  const incomplete = tasks.filter((t) => !t.completed)

  return (
    incomplete.find((t) => {
      const tEnd = t.startTime + t.duration * 60 * 1000
      return startTime < tEnd && endTime > t.startTime
    }) ?? null
  )
}
