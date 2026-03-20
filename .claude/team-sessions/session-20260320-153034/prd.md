# PRD: session-20260320-153034

**Status:** In Progress
**Created:** 2026-03-20T10:00:34.943Z
**Author:**

---

## Problem Statement

People with ADHD struggle with traditional to-do apps: long task lists cause overwhelm and decision paralysis, too many UI elements compete for attention, and the cognitive load of managing a task system often outweighs the benefit of using one.

This app targets individuals with ADHD who need a radically simplified task interface. At any moment, the screen shows exactly two things: a button to add a new task, and the current active task plus one upcoming task. Nothing else. The goal is to eliminate visual noise so the user can focus on doing one thing at a time.

## Goals

1. **Reduce overwhelm** — users feel calm and focused when opening the app; no list of 20 tasks is ever visible at once.
2. **Frictionless task capture** — adding a task with a deadline takes as few taps/keystrokes as possible (target: under 10 seconds).
3. **Task searchability** — users can find any previously added task quickly when needed (secondary priority).

## Non-Goals

- Cross-device sync or cloud storage
- Collaboration or task sharing
- Recurring tasks
- Subtasks or task hierarchies
- Notifications or reminders
- Integrations (calendar, Slack, email, etc.)
- Domain-specific workflows or templates
- Any UI element beyond: add-task CTA, current task, one upcoming task, and search

## User Stories

- As a user with ADHD, I want to see only my current task and one upcoming task so that I don't feel overwhelmed.
- As a user, I want to add a task with a deadline quickly so that capturing a thought takes minimal effort.
- As a user, I want to search my tasks so that I can find something I added earlier.
- As a user, I want to mark the current task as done so that the next task becomes the current one.

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Home screen shows exactly two elements: an "Add Task" CTA and a task display area | High |
| FR-2 | Task display area shows the current active task and one upcoming task only; tasks are ordered by start time ascending | High |
| FR-3 | Each task has a name, start time, and tentative duration; end time is derived as start time + duration | High |
| FR-4 | User can mark the current task as complete; it is removed from view and the next task by start time becomes current | High |
| FR-5 | A task whose start time has passed but is not yet marked complete remains the current task | High |
| FR-9 | When multiple tasks are overdue, only the current task (earliest start time) is shown; all other overdue tasks are hidden until the current task is marked complete | High |
| FR-6 | Add task flow validates for time clashes (start–end overlap with existing tasks) before saving | High |
| FR-7 | Clash validation is configurable: "allow overlapping tasks" setting, default OFF | High |
| FR-8 | Search allows finding any task (including completed) by name | Medium |

## Non-Functional Requirements

- **Platform:** Responsive web app; must work on mobile and desktop browsers
- **Offline:** Fully offline — no network requests, no backend
- **Storage:** IndexedDB for all task persistence; no server-side storage
- **Performance:** App must load and be interactive instantly (no perceptible load time for local data)
- **Accessibility:** No specific requirements beyond the inherent simplicity of the two-element UI

## Open Questions

1. What does the empty state look like when there are no tasks?
2. When a task is marked complete, is it permanent or is there an undo/history mechanism?
3. If multiple tasks have a start time in the past (all overdue), which one is "current"?

---

## FAQs

<!-- Agents will append Q&A here during review. -->

**Q:** What does the empty state look like when there are no tasks?
**A:** Show only the "Add Task" CTA with a friendly prompt. Nothing else.

**Q:** When a task is marked complete, is there an undo or history mechanism?
**A:** Completion is permanent. No undo.

**Q:** If multiple tasks have a start time in the past and none are complete, which is "current"?
**A:** The one with the earliest start time. All other overdue tasks are hidden — the "upcoming" slot is only filled by a future-dated task. The second overdue task is not shown at all until the current task is marked complete.

**Q:** How is search surfaced in the UI?
**A:** A modal. Searches all tasks including completed.
