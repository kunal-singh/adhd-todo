# Architecture: session-20260320-153034

**Status:** In Progress
**Created:** 2026-03-20T10:00:34.943Z

---

## High-Level Design (HLD)

### System Overview

A fully client-side React 19 + TypeScript + Vite application with three logical layers:

1. **UI Layer** — React components responsible only for rendering and dispatching user actions. No business logic. Three surfaces: Home screen, Add Task modal, Search modal.

2. **State Layer** — Global app state managed via React Context + `useReducer`. Acts as the single source of truth in memory. All UI reads from and dispatches to this layer. Business logic (task ordering, clash detection, current-task resolution) lives here.

3. **Persistence Layer** — A thin IndexedDB adapter with no external library. On app boot, hydrates the state layer from IndexedDB. After each state change, a `useEffect` syncs the updated state back to IndexedDB. No direct DB calls from UI components.

### Component Diagram

```
┌─────────────────────────────────────────────┐
│                   App                        │
│  (TaskProvider wraps entire tree)            │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │            HomeScreen                │   │
│  │  ┌─────────────┐  ┌───────────────┐  │   │
│  │  │  TaskDisplay│  │  AddTaskBtn   │  │   │
│  │  │  (current + │  │  (+ search    │  │   │
│  │  │   upcoming) │  │   trigger)    │  │   │
│  │  └─────────────┘  └───────────────┘  │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────┐   ┌──────────────────┐    │
│  │ AddTaskModal │   │  SearchModal     │    │
│  │ (name, start │   │  (query input,   │    │
│  │  time, dur,  │   │   results list)  │    │
│  │  clash check)│   │                  │    │
│  └──────────────┘   └──────────────────┘    │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  TaskContext (useReducer + dispatch) │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │       IndexedDB Adapter              │   │
│  │  (open, hydrate, persist, settings)  │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Data Flow

**Boot:**
`App mounts` → `IndexedDB.hydrate()` → dispatches `HYDRATE` action → reducer sets initial state → HomeScreen renders current/upcoming tasks.

**Add Task:**
User fills AddTaskModal → `ADD_TASK` dispatched → reducer validates clash if setting is OFF (start–end overlap check against active tasks) → task appended to store → `useEffect` syncs full state to IndexedDB → HomeScreen re-renders.

**Complete Task:**
User taps complete on current task → `COMPLETE_TASK` dispatched → reducer marks task complete → task moves out of active set → next task by earliest start time becomes current → `useEffect` syncs to IndexedDB.

**Search:**
User opens SearchModal → types query → results computed in-memory by filtering full task list (active + completed) by name substring match → results displayed in modal, no DB query.

## Low-Level Design (LLD)

### Data Model

```ts
type Task = {
  id: string           // crypto.randomUUID()
  name: string
  startTime: number    // Unix ms timestamp
  duration: number     // minutes
  completed: boolean
  completedAt?: number // Unix ms timestamp
}

type Settings = {
  allowOverlap: boolean  // default: false
}

type AppState = {
  tasks: Task[]
  settings: Settings
}
```

### Reducer

**Actions:** `HYDRATE | ADD_TASK | COMPLETE_TASK | UPDATE_SETTINGS`

**Key logic:**
- `ADD_TASK`: if `settings.allowOverlap` is false, validates no start–end overlap before adding; throws/returns error action if clash detected
- `COMPLETE_TASK`: sets `completed: true` and `completedAt: Date.now()` on the target task
- `HYDRATE`: replaces full state with data loaded from IndexedDB on boot

### Selectors (pure functions)

- `getCurrentTask(tasks: Task[]): Task | null` — earliest-start-time incomplete task where `startTime ≤ now`; if none overdue, returns first upcoming incomplete task
- `getUpcomingTask(tasks: Task[], current: Task | null): Task | null` — first incomplete task by start time after current
- `hasClash(tasks: Task[], startTime: number, duration: number): Task | null` — returns the conflicting task or null

### `useTaskDispatch` hook

Wraps `dispatch` so every action both updates in-memory state via the reducer AND calls `IndexedDB.persist(newState)` directly. No `useEffect` sync needed. Persistence is explicit and co-located with each action.

### IndexedDB Adapter (`src/db/adapter.ts`)

**Responsibility:** All IDB interaction. No business logic.

**Interface:**
- `openDB(): Promise<IDBPDatabase>` — opens/upgrades the database
- `hydrate(): Promise<AppState>` — reads full state on boot
- `persist(state: AppState): Promise<void>` — writes full state after each action

Uses `idb` library. Single object store: `appState` with key `'state'`.

### Component: `App`

**Responsibility:** Mounts `TaskProvider`, handles async hydration. Renders a loading state while `hydrate()` resolves; once done, renders `HomeScreen`.

### Component: `HomeScreen`

**Responsibility:** Reads `getCurrentTask` and `getUpcomingTask` from context. Renders `TaskDisplay` and `AddTaskBtn`. Opens `AddTaskModal` or `SearchModal` on user action.

### Component: `TaskDisplay`

**Responsibility:** Renders current task (name, start time, duration, complete button) and one upcoming task (name, start time). Shows friendly empty-state prompt when no tasks exist.

### Component: `AddTaskModal`

**Responsibility:** Form for name, start time, duration. On submit, calls `hasClash` — if clash and `allowOverlap` is OFF, shows inline error. On success, dispatches `ADD_TASK`.

### Component: `SearchModal`

**Responsibility:** Text input, filters all tasks (active + completed) in-memory by name substring match on each keystroke. Displays results list.

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | React 19 + TypeScript | Already in place; strong typing reduces runtime bugs |
| Build tool | Vite | Already in place; fast HMR, optimal bundle |
| Styling | Tailwind CSS | Utility-first, no CSS file sprawl, responsive out of the box |
| IndexedDB wrapper | `idb` | Minimal (~1.5kb), promise-based API, eliminates raw IDB boilerplate |
| State management | React Context + `useReducer` | No extra dependency; sufficient for single-screen app with simple state shape |
| Routing | None | Single screen with modals; no router needed |
| Testing | None (out of scope) | Not requested |

## Infrastructure

- No backend, no server, no network requests
- Built with `vite build` → static files in `dist/`
- Deployable to any static host (Vercel, GitHub Pages, Netlify) or run locally
- No PWA/service worker — not needed for initial scope

## Security Considerations

- All data stored locally in the user's browser (IndexedDB) — no exfiltration risk by design
- No user input is eval'd or unsafely injected into the DOM — React's JSX handles escaping
- No external scripts, fonts, or assets loaded at runtime — fully offline
- No auth surface, no privilege escalation risk
- Settings are local-only with no external effect

---

## Implementation Plan

Tasks are listed in dependency order. Each task is self-contained and actionable.

### CLAUDE.md Constraints (must be respected throughout)
- Max 100 lines per function, cyclomatic complexity ≤8, max 5 positional params
- 100-character line limit
- No commented-out code; comment *why*, never *what*
- Zero warnings from ESLint and TypeScript — fix all before committing
- Prefer explicit over clever
- Fail fast with clear, actionable error messages; never swallow exceptions

---

### Task 1 — Install dependencies
**Files:** `package.json`
**Actions:** Install `idb`, `tailwindcss`, `@tailwindcss/vite`
**Acceptance:** `pnpm install` succeeds; no type errors; Tailwind utility classes resolve in components

---

### Task 2 — Configure Tailwind
**Files:** `vite.config.ts`, `src/index.css`
**Actions:** Add Tailwind Vite plugin; add `@import "tailwindcss"` to `index.css`; remove unused default CSS
**Acceptance:** A component using a Tailwind class renders correctly in dev

---

### Task 3 — Define types (`src/types.ts`)
**Types to add:** `Task`, `Settings`, `AppState`, `TaskAction` (discriminated union: `HYDRATE | ADD_TASK | COMPLETE_TASK | UPDATE_SETTINGS`)
**Acceptance:** No TypeScript errors; all other files can import from this module

---

### Task 4 — Implement IndexedDB adapter (`src/db/adapter.ts`)
**Functions to add:**
- `openDB(): Promise<IDBPDatabase>` — opens/upgrades DB, creates `appState` store
- `hydrate(): Promise<AppState>` — reads `'state'` key; returns default state if absent
- `persist(state: AppState): Promise<void>` — writes full state to `'state'` key
**Acceptance:** `hydrate()` returns default state on first run; `persist()` + `hydrate()` round-trips correctly

---

### Task 5 — Implement selectors (`src/selectors.ts`)
**Functions to add:**
- `getCurrentTask(tasks: Task[]): Task | null` — earliest-start incomplete task with `startTime ≤ now`; falls back to first upcoming if none overdue
- `getUpcomingTask(tasks: Task[], current: Task | null): Task | null` — first incomplete task after current by start time
- `hasClash(tasks: Task[], startTime: number, duration: number): Task | null` — checks start–end overlap against incomplete tasks
**Acceptance:** Pure functions with no side effects; edge cases handled (empty list, all completed, all overdue)

---

### Task 6 — Implement reducer (`src/store/reducer.ts`)
**Functions to add:** `taskReducer(state: AppState, action: TaskAction): AppState`
**Key logic:**
- `ADD_TASK`: if `!state.settings.allowOverlap`, call `hasClash`; throw with clear message if clash found; otherwise append task with `crypto.randomUUID()` id
- `COMPLETE_TASK`: find task by id, set `completed: true`, `completedAt: Date.now()`
- `HYDRATE`: replace state wholesale
- `UPDATE_SETTINGS`: merge settings
**Acceptance:** All four actions produce correct next state; TypeScript exhaustive check on action type

---

### Task 7 — Implement TaskContext + `useTaskDispatch` hook (`src/store/TaskContext.tsx`)
**Exports:**
- `TaskProvider` — provides context, calls `hydrate()` on mount, passes state + wrapped dispatch
- `useTaskState(): AppState` — consumes context state
- `useTaskDispatch()` — returns wrapped dispatch that calls `taskReducer` + `persist(newState)` after every action
**Acceptance:** State is hydrated from IDB on mount; dispatching `ADD_TASK` persists to IDB; no `useEffect` sync loop

---

### Task 8 — Implement `App.tsx`
**Actions:** Mount `TaskProvider`; show loading indicator while `hydrate()` resolves; render `HomeScreen` once ready; remove all Vite boilerplate
**Acceptance:** App renders without errors; loading state shown briefly on first mount; `HomeScreen` visible after hydration

---

### Task 9 — Implement `HomeScreen` (`src/components/HomeScreen.tsx`)
**Actions:** Call `getCurrentTask` and `getUpcomingTask` from selectors using context state; render `TaskDisplay` and `AddTaskBtn`; manage open/close state for `AddTaskModal` and `SearchModal` via local `useState`
**Acceptance:** Correct tasks shown; modals open and close correctly

---

### Task 10 — Implement `TaskDisplay` (`src/components/TaskDisplay.tsx`)
**Props:** `current: Task | null`, `upcoming: Task | null`, `onComplete: (id: string) => void`
**Actions:** Render current task (name, start time, duration, complete button); render upcoming task (name, start time); render empty-state friendly prompt when `current` is null and `upcoming` is null
**Acceptance:** All three states render correctly (empty, current only, current + upcoming)

---

### Task 11 — Implement `AddTaskModal` (`src/components/AddTaskModal.tsx`)
**Props:** `open: boolean`, `onClose: () => void`
**Actions:** Form with name (text), start time (datetime-local), duration (number, minutes); on submit call `hasClash` — show inline error if clash and `allowOverlap` is OFF; on success dispatch `ADD_TASK` and call `onClose`
**Acceptance:** Clash error shown correctly; successful submission closes modal and task appears as upcoming/current

---

### Task 12 — Implement `SearchModal` (`src/components/SearchModal.tsx`)
**Props:** `open: boolean`, `onClose: () => void`
**Actions:** Text input; filter all tasks (active + completed) by name substring match on each keystroke; render results list with task name, start time, status
**Acceptance:** Results update on each keystroke; empty state shown when no match; completed tasks appear in results

---

## FAQs

<!-- Agents will append Q&A here during review. -->
