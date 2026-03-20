# Review Checklist: session-20260320-153034

**Created:** 2026-03-20T10:00:34.943Z

---

## Code Review

- [ ] Code follows project style guide
- [ ] No dead code or commented-out blocks
- [ ] Functions are ≤100 lines, cyclomatic complexity ≤8
- [ ] No magic numbers — constants are named
- [ ] Error handling is explicit and actionable
- [ ] No swallowed exceptions
- [ ] Tests cover happy path and edge cases
- [ ] Test coverage meets project threshold

## Security Audit

- [ ] No hardcoded secrets or credentials
- [ ] All user input is validated at boundaries
- [ ] SQL queries use parameterised statements
- [ ] No XSS vectors in rendered output
- [ ] Dependencies have no known CVEs
- [ ] Auth/authz enforced on all endpoints
- [ ] Sensitive data is not logged
- [ ] HTTPS enforced for all external calls

## Architecture Alignment

- [ ] Implementation matches approved architecture.md
- [ ] No undocumented third-party services introduced
- [ ] Data model changes are backward-compatible or migrated

## Deployment

- [ ] Environment variables documented in .env.example
- [ ] Migrations are reversible
- [ ] Feature flags set correctly for rollout

---

<!-- Agents append additional review items below. -->

**Q:** Architect review — 2026-03-20
**A:**

## Conforms

- **Layer separation** — UI components contain no business logic. Selectors, reducer, and DB adapter are properly isolated in their own modules.
- **Types** (`src/types.ts`) — All four required types present: `Task`, `Settings`, `AppState`, `TaskAction` as discriminated union with all four variants. Interface over type used per linter rules.
- **IndexedDB adapter** (`src/db/adapter.ts`) — `openDB`, `hydrate`, `persist` all present. Module-level singleton pattern for `dbInstance` is correct and efficient. Default state returned on first run. Justification comment on the cast is appropriate.
- **Selectors** (`src/selectors.ts`) — All three functions present and pure. `getCurrentTask` correctly handles overdue-first then upcoming fallback. `hasClash` correctly uses `startTime < tEnd && endTime > t.startTime` interval overlap formula. Edge cases (empty list, all completed) handled.
- **Reducer** (`src/store/reducer.ts`) — All four actions handled. Exhaustive check via `never` on default branch. Clash validated in reducer AND in UI (defensive double-check). `crypto.randomUUID()` used for ID generation.
- **TaskProvider** (`src/store/TaskContext.tsx`) — `wrappedDispatch` correctly computes `nextState` then calls `persist(nextState)` — no `useEffect` sync loop as required. Hydration error is logged and does not crash the app.
- **Context/hooks split** (`src/store/context.ts`, `hooks.ts`) — Correctly split to satisfy fast-refresh ESLint constraint. Clean separation.
- **App.tsx** — Vite boilerplate fully removed. `TaskProvider` wraps `HomeScreen`. Clean.
- **HomeScreen** — Calls selectors from context state. Modal open/close via local `useState`. Imports hooks from `hooks.ts` not `TaskContext.tsx`.
- **TaskDisplay** — All three states rendered (empty, current-only, current+upcoming). Empty state shown only when both are null (correct per PRD FAQ).
- **AddTaskModal** — Clash checked in UI before dispatching. Inline error displayed. Form resets on close. `name.trim()` applied before dispatch.
- **SearchModal** — Filters all tasks (active + completed) in-memory on each keystroke. Empty state and no-results state both handled. Focus managed via `useRef` + `useEffect` instead of forbidden `autoFocus`.
- **Zero warnings** — Confirmed clean `pnpm lint` and `pnpm tsc --noEmit` output.
- **CLAUDE.md constraints** — All functions well under 100 lines. No commented-out code. No magic numbers (DB constants are named). Errors fail fast with actionable messages.

## Deviations

1. **`src/assets/` contains unused Vite boilerplate** (`hero.png`, `react.svg`, `vite.svg`) — not imported anywhere in the current codebase. These are dead assets.
2. **`DEFAULT_STATE` duplicated** — defined in both `src/store/context.ts:4` and `src/store/TaskContext.tsx:7`. Single source of truth would be cleaner.
3. **Architecture doc not updated** — HLD System Overview (line 18) still mentions `useEffect` syncing to IndexedDB, which was superseded during the architecture interview. The finalised decision (persist in `wrappedDispatch`) is not reflected there.
4. **Task 8 acceptance criterion partially unmet** — architecture specifies "show loading indicator while `hydrate()` resolves". `TaskProvider` returns `null` during hydration (`TaskContext.tsx:34`), so `App` renders nothing rather than an explicit loading indicator. Functional but silent.

## Issues

1. **`getUpcomingTask` edge case** (`src/selectors.ts:22`) — When `current` is an overdue task, `getUpcomingTask` filters by `t.id !== current.id`. This correctly excludes the current task. However, if there are multiple overdue tasks (e.g. tasks A and B both past their start time), task B would be shown as "upcoming" even though it is also overdue. The PRD FAQ states the earliest overdue task is current — but the second overdue task should arguably also be treated as "now", not "up next". This is an unresolved open question worth flagging.
2. **`wrappedDispatch` stale closure** (`src/store/TaskContext.tsx:28-32`) — `wrappedDispatch` captures `state` from the render closure. If two dispatches are called in rapid succession before a re-render, the second call will compute `nextState` from stale state and persist the wrong value. The in-memory reducer state (via `dispatch`) will self-correct on re-render, but the IndexedDB write will be based on stale state. Low probability for this app's usage pattern, but a real bug.
3. **Empty task name accepted** (`src/components/AddTaskModal.tsx:59`) — `name.trim()` is applied on dispatch but there is no guard preventing an all-whitespace name from passing the `required` HTML attribute check (browsers treat whitespace-only as non-empty for `required`). A task with name `"   "` trimmed to `""` would be saved.

## Suggested Fixes

---

**Q:** Architect review — FR-9 (multiple overdue tasks) — 2026-03-20
**A:**

## Conforms

- **PRD updated** — FR-9 added correctly. FAQ answer for the overdue-task question updated to reflect the decision: only the current (earliest) overdue task is shown; the "upcoming" slot is filled only by a future-dated task.

## Deviations

- **`getUpcomingTask` not yet updated** (`src/selectors.ts:18-24`) — FR-9 is now in the PRD but the implementation has not changed. Currently `getUpcomingTask` returns the first incomplete task after the current one regardless of whether it is overdue. This violates FR-9.

## Issues

- **Single file, single function to fix** — `getUpcomingTask` at `src/selectors.ts:18`. The fix is: filter candidates to only tasks where `startTime > Date.now()` (future-dated) before returning the first one. If the only remaining incomplete tasks are all overdue, return `null` so the upcoming slot stays empty.

## Suggested Fix

In `src/selectors.ts`, change `getUpcomingTask` to:
```ts
export function getUpcomingTask(tasks: Task[], current: Task | null): Task | null {
  if (current === null) return null
  const now = Date.now()
  const incomplete = incompleteSortedByStartTime(tasks)
  // only future-dated tasks qualify for the upcoming slot (FR-9)
  const future = incomplete.filter((t) => t.id !== current.id && t.startTime > now)
  return future[0] ?? null
}
```

---

1. **Dead assets** — Delete `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`.
2. **Deduplicate `DEFAULT_STATE`** — Export it from `src/store/context.ts` and import it in `TaskContext.tsx` instead of redefining.
3. **Update architecture doc** — Correct the HLD Data Flow section to reflect `wrappedDispatch` persistence pattern (no `useEffect`).
4. **Loading indicator** — Render a minimal loading state in `App.tsx` or pass a loading prop through `TaskProvider` so the screen isn't blank on boot.
5. **Stale closure fix** — Use a `ref` to hold the latest state for the `persist` call, or restructure `wrappedDispatch` to derive `nextState` inside the reducer callback form (`dispatch(action)` first, then read from a ref).
6. **Empty name guard** — Add `if (!name.trim()) { setError('Task name cannot be empty.'); return }` before the dispatch in `AddTaskModal.handleSubmit`.

---

**Q:** Architect review — Bug report + UI changes — 2026-03-20
**A:**

## Bug 1 — Future task shown as "NOW" (regression from FR-9 fix)

**Root cause** (`src/selectors.ts:7-16`): `getCurrentTask` has a fallback on line 15:
```ts
return incomplete[0]  // fallback: returns first upcoming task if none overdue
```
This fallback was correct before FR-9, but now creates a regression: if there are no overdue tasks, the first *future* task is returned as current and shown as "NOW". The screenshot confirms this — "nesoi application" starts at 18:15, it is 17:47, it is not yet overdue, but `getCurrentTask` returns it as current via the fallback.

**Required fix** (`src/selectors.ts:15`): The fallback should return `null` when no tasks are overdue. The "upcoming" slot (via `getUpcomingTask`) already handles showing the next future task. Showing a future task as "NOW" is incorrect; it should appear in the "UP NEXT" slot only.

Change line 15 from:
```ts
return incomplete[0]
```
to:
```ts
return null
```

This means: if no task is overdue, `current = null` and `upcoming = first future task`. The home screen shows only the "UP NEXT" card + Add Task CTA. This is correct behaviour per FR-2 and FR-5.

## Bug 2 — No way to change settings (missing feature)

**Root cause**: `UPDATE_SETTINGS` action exists in the reducer and types, but there is no UI surface to invoke it. The `allowOverlap` setting is permanently stuck at `false` (default) with no way for the user to toggle it. This was an implementation gap — the architecture specified the setting as configurable (FR-7) but no settings UI was ever built.

**Required fix**: Add a settings modal (gear icon trigger) accessible from the home screen. It needs a single toggle: "Allow overlapping tasks". Trigger via a gear icon using `react-icons`.

## Bug 3 — Search trigger is text, not icon

**Observation** (`src/components/HomeScreen.tsx:33-38`): Search is a plain text button "Search tasks". Per user requirement, it should be an icon button using `react-icons`.

## Suggested Fixes (for developer)

1. **`src/selectors.ts:15`** — Change `return incomplete[0]` to `return null`. Removes the regression where future tasks appear as "NOW".

2. **`src/components/HomeScreen.tsx`** — Replace text "Search tasks" button with a row of two icon buttons (search icon + gear icon) from `react-icons`. Add `settingsOpen` local state and render a `SettingsModal`.

3. **`src/components/SettingsModal.tsx`** (new file) — Modal with a single toggle for `allowOverlap`. On change, dispatch `UPDATE_SETTINGS`. Props: `open: boolean`, `onClose: () => void`.

4. **Install `react-icons`** — `pnpm add react-icons`.
