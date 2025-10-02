# Repository Guidelines

## Project Structure & Module Organization
LeadFlip runs on Next.js 15 App Router with TypeScript. UI entries live in `src/app`, shared components in `src/components`, and AI/business logic in `src/lib` (`src/lib/agents` for Claude workflows, `src/lib/supabase` for DB helpers). Shared types sit in `src/types`; middleware sits at `src/middleware.ts`. Agent prompt specs live under `.claude/`. Database SQL stays in `supabase/migrations`, and operational helpers such as `scripts/migrate-supabase.ts` and `run-migration.js` handle schema syncs.

## Build, Test, and Development Commands
- `npm run dev` — Next.js dev server with hot reload.
- `npm run build` / `npm run start` — production compile and serve.
- `npm run lint` — `eslint-config-next` across TypeScript/TSX.
- `npm run test:agents` — Jest suites in `src/lib/agents/__tests__`.
- `node run-migration.js` — executes the Supabase seed migration via Management API.
- `npx supabase db push` — CLI alternative for local database alignment.

## Coding Style & Naming Conventions
Write new code in TypeScript with 2-space indents and single quotes. Prefer React function components; mark Client Components explicitly when hooks or browser APIs are used. Co-locate agent utilities beneath `src/lib/agents` and keep files focused on one concern. Group Tailwind utilities from layout → spacing → typography. Run `npm run lint` before pushing—no formatter is bundled, so mirror existing style in edited files.

## Testing Guidelines
Jest + `ts-jest` power unit tests; `jest.setup.js` seeds environment variables and timeout. Place specs in `__tests__` folders named `*.test.ts`, mocking `@anthropic-ai/claude-agent-sdk` to avoid live calls. Coverage is gathered from `src/**`, so add positive and failure-path assertions when touching agents or Supabase helpers. Document any manual verification for Twilio or Realtime websocket flows in the PR body.

## Commit & Pull Request Guidelines
History shows Conventional Commits (`feat:`, `fix:`, `chore:`); follow the same tense and scope. PRs should include a concise summary, linked issue, screenshots or call logs for UX/call updates, and the commands/tests you ran. Request review only after lint, tests, and required migrations succeed locally.

## Agent & Infrastructure Notes
Update `.claude/agents/lead-classifier.md` whenever classifier behavior changes, and keep runtime secrets in `.env.local`. `npm run websocket-server` and `npm run worker` expect compiled files in `dist/server`; ensure your build or deploy process emits them before shipping background services. Treat Supabase, Twilio, and AI credentials as secrets—never commit them and rotate immediately if exposed.
