# CLAUDE.md

Guidelines for working in this repository. Treat this codebase as production code.

## Project layout

- `backend/` — Express 5 + Prisma (SQLite) + Temporal workflows, TypeScript, Vitest.
- `frontend/` — React 18 + Vite + TanStack Query + Tailwind CSS v4, TypeScript, Vitest + Testing Library.
- `docs/` — sample CSVs and UI wireframes.

Both packages use **pnpm** and the Node version in `.nvmrc`.

## Commands

Backend (`cd backend`):
- `pnpm dev` — start API server
- `pnpm test` — run tests
- `pnpm build` — type-check and compile
- `pnpm format` — Prettier
- `pnpm migrate:dev` / `pnpm gen:prisma` — after any Prisma schema change

Frontend (`cd frontend`):
- `pnpm dev` — start dev server
- `pnpm test` — run tests
- `pnpm lint` — ESLint (zero warnings allowed)
- `pnpm build` — type-check and build
- `pnpm format` — Prettier

Before considering a change done, run tests, lint/type-check (`build`), and format for every package you touched.

## Clean code

- Keep code clean, readable and consistent with the surrounding code (naming, structure, idioms, comment density).
- **No dead code.** Remove unused imports, variables, functions, components, types, commented-out code, stray `console.log`s and leftover debug code. If something becomes unused because of your change, delete it.
- Keep functions small and focused; extract shared logic instead of duplicating it.
- Use strict, explicit TypeScript types. Avoid `any` and unnecessary type assertions.
- Handle errors explicitly and give the user meaningful feedback; never swallow errors silently.
- Don't add speculative abstractions or features that weren't requested.
- Prisma schema changes always go with a migration (`pnpm migrate:dev`) — never edit existing migrations.

## Testing

- **Every bug fix must include a test** that fails without the fix and passes with it, reproducing the reported bug.
- **Every new feature must include tests** that verify the new behaviour works, including relevant edge cases and error paths.
- **Do not modify existing tests** unless the behaviour they cover is intentionally changed by your work. In that case, update only the affected assertions and explain why. Never weaken or delete a test just to make it pass.
- Place tests next to the code they cover using the `*.test.ts(x)` convention (e.g. `src/utils/csvParser.test.ts`).
- Prefer testing behaviour over implementation details. Frontend component tests should use Testing Library queries the way a user would interact with the UI.
- All tests must pass before a change is considered complete.

## Frontend style

- Keep the UI **polished, modern and beautiful**: consistent spacing, clear visual hierarchy, readable typography and a coherent color palette.
- Style with Tailwind utility classes; reuse existing patterns and colors in the app rather than inventing new ones per component.
- Provide good interaction feedback: hover/focus/active/disabled states, loading indicators, empty states, and success/error toasts (`react-hot-toast`).
- Make layouts responsive and accessible: semantic HTML, labels for form inputs, keyboard navigation, visible focus rings and sufficient color contrast.
- Use `@tabler/icons-react` for icons to keep iconography consistent.
- Long-running actions (e.g. workflows) must show progress/status to the user — never leave the UI silently waiting.
