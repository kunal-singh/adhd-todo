# Project: to-do

ADHD-focused task app. Shows one current task and one upcoming task. Nothing else.

## Stack

- React 19 + TypeScript + Vite + Tailwind CSS v4
- State: React Context + `useReducer` (`src/store/`)
- Persistence: IndexedDB via `idb` library (`src/db/adapter.ts`)
- Icons: `react-icons`
- No router, no backend, no tests

## Architecture

Three layers — UI components never contain business logic:

1. **UI** — `src/components/` — render and dispatch only
2. **State** — `src/store/` — reducer, context, hooks; all business logic lives here
3. **Persistence** — `src/db/adapter.ts` — IndexedDB read/write; no logic

Persistence is explicit: `wrappedDispatch` in `TaskContext.tsx` calls `persist(nextState)` after every action. No `useEffect` sync loop.

## Key files

| File | Purpose |
|------|---------|
| `src/types.ts` | `Task`, `Settings`, `AppState`, `TaskAction` |
| `src/selectors.ts` | `getCurrentTask`, `getUpcomingTask`, `hasClash` |
| `src/store/reducer.ts` | `taskReducer` — all four actions |
| `src/store/TaskContext.tsx` | `TaskProvider`, `wrappedDispatch`, hydration |
| `src/store/context.ts` | Context object + `DEFAULT_STATE` (single source) |
| `src/store/hooks.ts` | `useTaskState`, `useTaskDispatch` |
| `src/db/adapter.ts` | `openDB`, `hydrate`, `persist` |
| `src/components/HomeScreen.tsx` | Root screen; modal open/close state |

## Business rules

- **Current task**: earliest-start incomplete task where `startTime ≤ now`. If none overdue, `current = null`.
- **Upcoming task**: first incomplete task where `startTime > now` (future only — FR-9). Overdue tasks never fill the upcoming slot.
- **Clash detection**: `hasClash` checks start–end interval overlap against incomplete tasks. Validated in reducer (source of truth) and in `AddTaskModal` (inline error UX).
- **Completion**: permanent, no undo.
- **Search**: in-memory substring match across all tasks (active + completed).

## Known issues (from architect review)

1. `wrappedDispatch` stale closure — rapid successive dispatches may persist stale state to IDB (in-memory self-corrects on re-render).
2. Whitespace-only task names — HTML `required` passes them; guard with `if (!name.trim())` in `AddTaskModal`.

## Commands

```bash
pnpm dev          # dev server
pnpm build        # tsc + vite build → dist/
pnpm lint         # eslint
pnpm tsc --noEmit # type check only
```

## Constraints (from global CLAUDE.md)

- Zero warnings from ESLint and TypeScript before committing
- No commented-out code
- Functions ≤100 lines, cyclomatic complexity ≤8
- Comment *why*, never *what*
