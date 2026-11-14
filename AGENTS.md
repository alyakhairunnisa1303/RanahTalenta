<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HireMatch AI — agent notes

Next.js 16.4.6 + React 19.3 App Router, TypeScript strict, Tailwind v4. `node_modules` is not committed — run `npm install` before doing anything. Use npm; `package-lock.json` (lockfile v3) is the source of truth even though the README lists yarn/pnpm/bun.

## Commands

- `npm install` — required first; `next` is not present in a fresh clone.
- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint` — runs `eslint` directly (flat config), not `next lint`.
- `npx tsc --noEmit` — typecheck; there is no `typecheck` script.
- `npx tsx scripts/test-scoring.ts` — only test entrypoint (manual harness; no Jest/Vitest). `tsx` is a devDependency.

Run `next dev`/`next build` before `tsc --noEmit` on a fresh clone: `app/layout.tsx` uses the generated `LayoutProps<"/">` type from `.next/types`, which does not exist until Next generates it.

## Layout and branch state (read before editing)

- This repo is mid-refactor between two App Router locations. Current feature branches have a live root `app/` plus a placeholder `src/app/api/screen/route.ts`. Next.js silently ignores `src/app` whenever a root `app/` exists, so an API route added/implemented only under `src/app` will not be served. `origin/main` already moved the app to `src/app/`; do not casually merge or forward-port that refactor.
- `src/lib/*`, `src/data/*`, `src/types/*`, `src/app/api/*`, `src/components/`, `scripts/`, and `samples/` are committed 0-byte placeholders that form the team's module map (extract → anonymize → score via Gemini; `scoring.mock.ts` for offline runs; `scripts/test-scoring.ts` harness). Fill files in place; don't delete or restructure the placeholder tree.
- Branch ownership is parallel: `feat/ai-scoring` (current), `feat/backend-pipeline`, `feat/frontend-dashboard`, `feat/develop`, `main`. Avoid broad renames or moves of shared files; they cause cross-branch conflicts.
- Path alias `@/*` maps to repo root (`"./*"`), not `src/`. Use `@/src/lib/...`; `@/lib/...` resolves to a nonexistent root `lib/`.

## Toolchain quirks

- Tailwind v4 has no `tailwind.config.*`; theme is CSS-first in `app/globals.css` (`@import "tailwindcss"` + `@theme`). CSS is processed by `@tailwindcss/turbopack` via `turbopack.rules` in `next.config.ts`.
- `next.config.ts` enables Next 16 flags `cacheComponents`, `partialPrefetching`, and `experimental.agentFeedback`. The latter rewrites the `nextjs-agent-rules` block above — treat that block as generated and don't hand-edit inside its markers.
- Document parsing uses `pdf-parse` and `mammoth`; LLM access uses `@google/genai` (Gemini). `.env*` is gitignored except the empty `.env.example` — add required keys there, never commit secrets.
- History uses Conventional Commits (`chore:`, `refactor:`). No CI, pre-commit hooks, formatter, or test runner is configured.
