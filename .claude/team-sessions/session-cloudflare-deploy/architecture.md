# Architecture: Cloudflare Pages Deployment + GitHub Actions CI/CD

**Status:** In Progress
**Created:** 2026-03-22
**Scope:** Deployment pipeline only — no changes to app source code

---

## System Overview (HLD)

This is a fully static SPA (Vite + React 19 + TypeScript). There is no backend, no SSR, and no server-side logic. The deployment target is **Cloudflare Pages**, which serves the contents of `dist/` as a CDN-distributed static site.

**Production flow:**
Push to `main` → GitHub Actions builds the app → `cloudflare/pages-action` uploads the `dist/` directory to Cloudflare Pages → live at `to-do.kunal-singh.com`.

**Preview flow:**
Open a PR → GitHub Actions builds the app → `cloudflare/pages-action` creates an isolated preview deployment → posts the preview URL as a PR comment → preview is torn down when the PR closes.

**First-time setup** (one-off, manual):

1. Create Cloudflare account and generate an API token scoped to Pages.
2. Create the Cloudflare Pages project (via Wrangler CLI or dashboard) with direct-upload mode (no Git integration — CI owns deploys).
3. Add custom domain `to-do.kunal-singh.com` in the Pages dashboard.
4. Store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub repo secrets.

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub                                   │
│                                                              │
│  ┌────────────┐   push/main     ┌──────────────────────┐    │
│  │  main      │────────────────▶│  GitHub Actions      │    │
│  │  branch    │                 │  deploy.yml          │    │
│  └────────────┘                 │                      │    │
│                                 │  1. checkout         │    │
│  ┌────────────┐   pull_request  │  2. setup node 22    │    │
│  │  feature   │────────────────▶│  3. setup pnpm       │    │
│  │  branches  │                 │  4. pnpm install     │    │
│  └────────────┘                 │  5. pnpm lint        │    │
│                                 │  6. pnpm tsc         │    │
│                                 │  7. pnpm build       │    │
│                                 │  8. cloudflare/      │    │
│                                 │     pages-action     │    │
│                                 └──────────┬───────────┘    │
│                                            │                │
└────────────────────────────────────────────┼────────────────┘
                                             │ API (HTTPS)
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Cloudflare Pages Project: adhd-todo                 │   │
│  │                                                      │   │
│  │  Production deployment  ◀── push to main            │   │
│  │  to-do.kunal-singh.com                               │   │
│  │                                                      │   │
│  │  Preview deployment     ◀── pull_request             │   │
│  │  <hash>.adhd-todo.pages.dev                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DNS: to-do.kunal-singh.com → CNAME → pages.dev      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Production Deploy (push to `main`)

```
git push origin main
  → GitHub Actions: deploy.yml triggered (push event, branch: main)
  → actions/checkout@v4
  → actions/setup-node@v4 (node 22.15.0, cache: pnpm)
  → pnpm/action-setup@v4 (version: 9)
  → pnpm install --frozen-lockfile
  → pnpm lint          (ESLint — fail fast on any warning)
  → pnpm tsc --noEmit  (type check — fail fast on any error)
  → pnpm build         (tsc -b && vite build → dist/)
  → cloudflare/pages-action@v1
      projectName: adhd-todo
      directory: dist
      branch: main       (signals production deployment to CF)
  → Cloudflare Pages serves dist/ at to-do.kunal-singh.com
```

### Preview Deploy (pull_request)

```
git push origin feature/xyz && open PR
  → GitHub Actions: deploy.yml triggered (pull_request event)
  → same build steps as above
  → cloudflare/pages-action@v1
      projectName: adhd-todo
      directory: dist
      (no branch arg → CF creates a preview deployment)
  → Action posts preview URL as PR comment
  → Preview lives at <hash>.adhd-todo.pages.dev
  → Preview is automatically deleted when PR is closed/merged
```

---

## Technology Decisions

| Decision             | Choice                                    | Rationale                                                                          |
| -------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Hosting              | Cloudflare Pages                          | Global CDN, free tier generous, no cold starts, built-in preview deployments       |
| Deploy method        | `cloudflare/pages-action` (direct upload) | CI owns the deploy; no Cloudflare ↔ GitHub OAuth coupling; simpler secret rotation |
| CI platform          | GitHub Actions                            | Repo already on GitHub; no extra service needed                                    |
| Node version         | 22.15.0 (LTS)                             | User-specified; pinned for reproducibility                                         |
| pnpm version         | 9 (latest 9.x)                            | Compatible with Node 22 LTS; matches lockfile format                               |
| pnpm install flag    | `--frozen-lockfile`                       | Prevents silent lockfile mutations in CI                                           |
| Lint/typecheck in CI | Yes, before build                         | Fail fast — no point uploading a broken build                                      |
| Secrets storage      | GitHub repo secrets                       | Standard; scoped to repo; no third-party vault needed for this scale               |
| Custom domain        | `to-do.kunal-singh.com`                   | User-specified; CNAME to Cloudflare Pages                                          |

---

## Low-Level Design

### GitHub Actions Workflow: `.github/workflows/deploy.yml`

**Triggers:**

- `push` to `main`
- `pull_request` targeting `main` (opened, synchronize, reopened)

**Jobs:**

#### `deploy` job

| Step       | Action/Command                                       | Purpose                                                |
| ---------- | ---------------------------------------------------- | ------------------------------------------------------ |
| checkout   | `actions/checkout@v4`                                | Full repo clone                                        |
| setup-node | `actions/setup-node@v4` node `22.15.0`, cache `pnpm` | Pin Node, cache `~/.pnpm-store`                        |
| setup-pnpm | `pnpm/action-setup@v4` version `9`                   | Install pnpm before node cache restore                 |
| install    | `pnpm install --frozen-lockfile`                     | Reproducible install; fails if lockfile is stale       |
| lint       | `pnpm lint`                                          | Zero-warning policy — workflow fails on any lint error |
| typecheck  | `pnpm tsc --noEmit`                                  | Fail before build if types are broken                  |
| build      | `pnpm build`                                         | `tsc -b && vite build` → `dist/`                       |
| deploy     | `cloudflare/pages-action@v1`                         | Upload `dist/` to Cloudflare Pages                     |

**Secrets used (must be set in GitHub repo settings):**

- `CLOUDFLARE_API_TOKEN` — CF API token with `Cloudflare Pages: Edit` permission
- `CLOUDFLARE_ACCOUNT_ID` — CF account ID (visible in CF dashboard sidebar)

**Branch logic inside `cloudflare/pages-action`:**

- When triggered by push to `main`: pass `branch: main` → CF treats it as production
- When triggered by PR: omit `branch` → CF auto-creates a named preview deployment

### Cloudflare Pages Project Setup (one-off manual steps)

1. Install Wrangler locally: `pnpm add -g wrangler`
2. Authenticate: `wrangler login`
3. Create project (direct-upload mode, no Git integration):
   ```
   wrangler pages project create adhd-todo --production-branch main
   ```
4. In CF dashboard → Pages → `adhd-todo` → Custom Domains → add `to-do.kunal-singh.com`
5. At DNS registrar (or Cloudflare DNS): add CNAME `to-do` → `adhd-todo.pages.dev`
6. In GitHub repo → Settings → Secrets and variables → Actions → add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### Cloudflare API Token Scopes

Create a **custom token** (not Global API Key) with:

- Permission: `Cloudflare Pages — Edit`
- Account resource: your account
- Zone resource: none required (Pages uses account-level permission)

---

## Infrastructure

| Resource             | Provider                     | Notes                                                          |
| -------------------- | ---------------------------- | -------------------------------------------------------------- |
| Static hosting + CDN | Cloudflare Pages             | Free tier; 500 deploys/month; unlimited bandwidth              |
| DNS                  | Cloudflare DNS (or external) | CNAME `to-do.kunal-singh.com` → `adhd-todo.pages.dev`          |
| CI/CD                | GitHub Actions               | Free for public repos; 2000 min/month on free plan for private |
| Secrets              | GitHub repo secrets          | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`                |
| Build cache          | GitHub Actions cache         | pnpm store cached by `actions/setup-node`                      |

No servers, no containers, no databases. The app is fully static and client-side.

---

## Security Considerations

- **API token scope** — use a scoped custom token (`Pages: Edit` only), not a Global API Key. Rotate if compromised without affecting other CF services.
- **Secret exposure** — `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are GitHub encrypted secrets; never logged or echoed in workflow steps.
- **Lockfile integrity** — `--frozen-lockfile` prevents dependency substitution attacks via stale lockfiles.
- **No server attack surface** — there is no origin server; Cloudflare serves static files directly from CDN edge. No SSRF, injection, or auth surface.
- **Branch protection** — enable branch protection on `main` requiring the `deploy` workflow to pass before merge; prevents broken builds reaching production.
- **Preview deployments** — preview URLs are unguessable hashes on `.pages.dev`; not indexed by default; acceptable for a personal app.

---

## Implementation Plan

Tasks are in dependency order. Each is self-contained.

### Constraints (from CLAUDE.md — must be respected throughout)

- Zero warnings from ESLint and TypeScript before committing
- No commented-out code
- Functions ≤100 lines, cyclomatic complexity ≤8, 100-char line limit
- Prefer explicit over clever
- Fail fast with clear, actionable messages

---

### Task 1 — Create Cloudflare Pages project (manual, one-off)

**Prerequisites:** Cloudflare account exists, Wrangler installed locally
**Steps:**

1. `wrangler login`
2. `wrangler pages project create adhd-todo --production-branch main`
3. Note the `CLOUDFLARE_ACCOUNT_ID` from dashboard sidebar

**Acceptance:** `wrangler pages project list` shows `adhd-todo`

---

### Task 2 — Generate scoped Cloudflare API token

**Steps:**

1. CF Dashboard → My Profile → API Tokens → Create Token → Custom Token
2. Permission: `Cloudflare Pages — Edit`, Account: your account
3. Copy token immediately (shown once)

**Acceptance:** Token value in hand; scope is `Pages: Edit` only

---

### Task 3 — Add GitHub repo secrets

**File:** GitHub repo settings (no code change)
**Steps:**

1. `kunal-singh/adhd-todo` → Settings → Secrets and variables → Actions
2. Add `CLOUDFLARE_API_TOKEN` (value from Task 2)
3. Add `CLOUDFLARE_ACCOUNT_ID` (value from Task 1)

**Acceptance:** Both secrets appear in the repo secrets list (values masked)

---

### Task 4 — Create GitHub Actions workflow

**File:** `.github/workflows/deploy.yml` (new file)
**Contents:** Single job `deploy` with steps: checkout, setup-pnpm, setup-node (22.15.0), pnpm install --frozen-lockfile, pnpm lint, pnpm tsc --noEmit, pnpm build, cloudflare/pages-action@v1
**Branch logic:**

- On `push` to `main`: include `branch: main` in pages-action inputs
- On `pull_request`: omit `branch` input (preview deployment)

**Acceptance:** Workflow file passes `actionlint`; pushing to `main` triggers a production deploy; opening a PR triggers a preview deploy with URL posted as comment

---

### Task 5 — Configure custom domain

**Steps (manual, in CF dashboard):**

1. Pages → `adhd-todo` → Custom Domains → Add `to-do.kunal-singh.com`
2. Add CNAME record: `to-do` → `adhd-todo.pages.dev` at DNS provider
3. Wait for CF to verify and provision TLS certificate (auto, ~1 min)

**Acceptance:** `https://to-do.kunal-singh.com` serves the app with valid TLS

---

### Task 6 — Enable branch protection on `main`

**Steps (manual, in GitHub):**

1. `kunal-singh/adhd-todo` → Settings → Branches → Add rule for `main`
2. Require status checks: `deploy` job must pass
3. Require PR before merging

**Acceptance:** Direct pushes to `main` are blocked; PRs require the deploy check to pass

---
