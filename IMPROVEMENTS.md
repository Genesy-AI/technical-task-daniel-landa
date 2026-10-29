# TinyEnginy — Codebase Analysis & Technical Roadmap

| | |
|---|---|
| **Type** | Epic / Technical roadmap |
| **Status** | Proposed |
| **Scope** | `backend/`, `frontend/`, tooling |
| **Last reviewed** | 2026-10-29 |

## TL;DR

The product works end to end: you can import leads, generate messages, verify emails and find phones. The foundations are what will slow us down next. All of the API lives in one 390-line `index.ts` with hand-rolled validation. Some endpoints are broken or unused. There is no CI, and frontend lint doesn't run. Long-running work (email verification) blocks HTTP requests. Validation rules are copied between frontend and backend.

The roadmap below runs in four phases, ordered by **risk × user impact / effort**:

1. **Stabilize**: fix what is broken today and add CI so it stays fixed (≈1 sprint).
2. **Restructure**: a layered backend, shared contracts and schema validation (≈1–2 sprints).
3. **Scale**: PAGINATION, async bulk jobs, a separate worker, a real database (≈2 sprints).
4. **Product & security**: auth, multi-tenancy, observability, UX upgrades (ongoing).

Priority legend: 🔴 P0 (broken / risky now) · 🟠 P1 (blocks scaling or velocity) · 🟢 P2 (nice to have).
Effort: S (≤1 day) · M (2–4 days) · L (1–2 weeks).

---

## Phase 1 — Stabilize

### 🔴 1.1 Fix broken / dead CRUD endpoints — *S*
- `POST /leads` (`backend/src/index.ts:31`) reads `name`, but the frontend type `LeadsCreateInput` sends `firstName`. Every request from the UI would get a 400.
- `PATCH /leads/:id` (`index.ts:64`) reads `name`, while the frontend calls `PUT` (`frontend/src/api/modules/leads.ts`). The method and the field name both mismatch. It also calls `String(undefined)`, so an omitted field is stored as the literal `"undefined"`.
- `GET /leads/:id` returns `200 null` for a missing lead and passes `Number("abc")` (NaN) straight to Prisma. Unhandled Prisma errors (e.g. deleting a missing id) become unformatted 500s.
- `create`, `update`, `getOne` and `delete` are not used anywhere in the UI.

**Proposal:** decide per endpoint whether to keep and fix it (with tests) or delete it. Lead editing is a likely next feature, so fix `create`/`update` and add a contract test that catches frontend/backend drift. Delete the rest.

### 🔴 1.2 Remove secrets from source — *S*
Provider API keys are hard-coded as fallbacks (`backend/src/phoneEnrichment/providers.ts:38,48,57`). Read them only from env vars and fail fast at startup when one is missing. Document them in `.env.sample`. Rotate the keys, since they are in git history.

### 🔴 1.3 Restore frontend linting — *S*
`pnpm lint` fails: ESLint 9 no longer reads `.eslintrc.cjs`. CLAUDE.md requires zero warnings, but nothing is enforced today. Migrate to `eslint.config.js` (flat config). Add ESLint to the backend as well; it currently has only Prettier. Some files are not formatted, e.g. `workflows/activities/utils.ts` and `LeadsList.tsx`.

### 🔴 1.4 CI pipeline — *S*
There is no `.github/workflows`. Add a GitHub Actions job per package that runs `install → format:check → lint → build → test`. Add `prisma migrate diff` to catch schema changes that have no migration. Make it a required check on `main`.

### 🟠 1.5 Stop committing the database — *S*
`backend/prisma/dev.db` is tracked. Each developer's local data ends up in diffs and can conflict. Add it to `.gitignore` and provide a `pnpm seed` script that uses the CSVs in `docs/`.

---

## Phase 2 — Restructure

### 🟠 2.1 Layered backend — *M*
Split `index.ts` into `routes/` (HTTP only) → `services/` (business logic) → `db`/`temporal` clients. Add a central error-handling middleware with a consistent error shape (`{ error: { code, message, details } }`). Benefits:
- Logic can be unit-tested without HTTP. Today only utilities are tested and no endpoint is.
- Each endpoint no longer repeats the same `try/catch` + `console.error` + 500 block.

Add **supertest** route tests for every endpoint.

### 🟠 2.2 Schema validation + shared contracts — *M*
- Validation today is manual `typeof` chains (e.g. `index.ts:186–200`). The bulk import rejects with one generic sentence and doesn't say which field failed.
- `leadFields.ts` and `countryCode.ts` are **duplicated** between frontend and backend. Frontend API types are hand-written, so they can drift (which is how 1.1 happened).

**Proposal:** a pnpm workspace with a `packages/shared` package of **zod** schemas, used by backend request validation, frontend CSV validation and the inferred API types. A further option is `zod-to-openapi`, which would give generated docs.

### 🟠 2.3 Centralize configuration — *S*
The Temporal address `localhost:7233`, namespace `default`, task queue `'myQueue'` and port `4000` are hard-coded in several files. Move them to one typed `config.ts` that is validated with zod at boot. Give task queues meaningful names (`leads-main`).

### 🟢 2.4 Simplify frontend API layer — *M*
`useApiMutation.ts` relies on heavy type gymnastics with `any`, `ts-toolbelt` and `lodash.get`, and only one mutation uses it. Every other component calls `useMutation` directly. Pick one pattern. The simplest is a set of small typed hooks (`useDeleteLeads`, `useVerifyEmails`…) with shared query keys (`leadsKeys.all`). Drop the `lodash` and `ts-toolbelt` dependencies.

### 🟢 2.5 Break up large components — *S/M*
`LeadsList.tsx` (~400 lines) holds the toolbar, dropdown, table, rows and mutations. Extract `LeadsToolbar`, `LeadsTable`, `LeadRow` and an `ActionsMenu`. Replace its inline SVGs with `@tabler/icons-react`, as CLAUDE.md requires. Extract one accessible `Modal` primitive: focus trap, `role="dialog"`, `aria-modal`, restoring focus on close. Both modals currently each implement their own Escape handling.

---

## Phase 3 — Scale

### 🟠 3.1 Make email verification asynchronous — *M*
`POST /leads/verify-emails` runs `workflow.execute` **sequentially inside the HTTP request** (`index.ts:300`). With N leads and a 1s timeout × 3 retries, the request can take minutes and hit proxy timeouts. Reuse the pattern already proven in phone enrichment:
- Start one idempotent workflow per lead (`verify-email-${leadId}`). Today's `Date.now()` suffix defeats idempotency.
- Persist an `emailVerificationStatus` and return immediately.
- The UI polls (or uses SSE) and shows progress.

Both features can then share one "lead job status" UI component.

### 🟠 3.2 Long-lived Temporal client & separate worker process — *S*
- Each request opens and closes a new `Connection` (`index.ts:291,351`). Create one client at boot and reuse it.
- The API process also runs the worker (`index.ts:391`). A worker crash kills the API, and the two can't be scaled independently. Add a `pnpm worker` entrypoint and deploy it separately.

### 🟠 3.3 Pagination, sorting, filtering, search — *M*
`GET /leads` returns the whole table, and the UI renders every row. The leads table is the core screen. Add cursor pagination plus server-side filters (country, verified, has phone, enrichment status) and search. On the frontend, add a virtualized table (TanStack Table + Virtual). This also gives the polling in 3.1 something to work with: refetch only the visible or in-flight leads.

### 🟠 3.4 Bulk operations at scale — *M*
- **Import**: duplicates are detected by **first + last name**. Two different people named "John Smith" collide, while the same email imported twice gets through. Use a unique `email` (scoped per workspace later) with `createMany`/upsert in a transaction. Rows that fail should say *why* (the current response only returns counts). Send large files through a background workflow with progress.
- **Generate messages**: runs one `UPDATE` per lead. Batch the writes in a transaction.
- **Select all** only selects the loaded page, which matters once 3.3 lands. Add "select all N matching"

### 🟢 3.6 Phone enrichment follow-ups — *S/M*
- Rate limits are per worker via `maxTaskQueueActivitiesPerSecond`. Make them env-configurable per provider and add a metric/alert on 429s.
- Leads have no company website field, so `companyWebsite` is guessed from the email domain. That's wrong for gmail.com and similar. Add a `companyWebsite` field, or skip Orion for free-mail domains.
- Store *which* provider found each phone, and how often, to drive provider-ordering and cost decisions.
- A "Re-run" action for `NOT_FOUND` leads after a cooldown period.
- **Status can get stuck.** Only the workflow's activities write `phoneEnrichmentStatus`. If the workflow is terminated, times out, or `updatePhoneEnrichment` runs out of retries, the lead stays `IN_PROGRESS` forever. The UI then shows a spinner and polls endlessly. Treat Temporal as the source of truth: reconcile stale `IN_PROGRESS` rows against the real workflow state (on read or in a periodic job).

---

## Phase 4 — Product, security & operations

### 🔴 4.1 Authentication & multi-tenancy — *L*
There is no auth, and CORS is `*` (`index.ts:19`). Anyone who can reach the API can read and delete every lead. Add auth (session/JWT via an IdP), a `workspaceId` on `lead` plus scoping on every query, a CORS allow-list, `helmet`, request body size limits and rate limiting. This is a hard prerequisite before any real deployment.

### 🟠 4.2 Observability — *M*
- Replace `console.*` with structured logging (pino) carrying request IDs.
- Add OpenTelemetry tracing across API → Temporal → providers.
- Add `/healthz` and `/readyz` covering the DB and Temporal.
- Add error tracking (Sentry) on both apps.
- Build provider dashboards: latency, hit rate, failures and cost per provider.

### 🟠 4.3 Testing strategy — *M*
- Unit tests are good for utilities and workflows. Add API route tests (2.1).
- Add a Playwright happy-path E2E: import CSV → generate messages → find phone.
- Add MSW for frontend API mocking.

### 🟢 4.4 UX improvements — *M*
- Lead detail drawer with inline editing (builds on 1.1).
- Template management: save and reuse message templates. Show a live preview for a sample lead and flag leads with missing fields before generating instead of after.
- Real email verification provider. The current activity is a mock based on string matching.
- Replace polling with SSE/WebSocket push for job progress.
- Confirmation dialog for bulk delete (currently a single click) and an undo toast.
- Dark mode and design tokens, so colors and spacing come from one Tailwind theme.

### 🟢 4.5 Developer experience — *S*
- A pnpm workspace at the root with a single `pnpm dev` that starts API, worker, web and Temporal.
- Pin the `.nvmrc` version in `engines`.
- Pre-commit hooks (lint-staged + Prettier).
- Renovate for dependency updates.