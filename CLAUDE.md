# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

pnpm 11 on Node 24.19+. There is no test suite (see the testing preference in AGENTS.md).

```bash
pnpm dev            # next dev on :3000 (also the "dev" entry in .claude/launch.json)
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint .
pnpm build          # next build --webpack
pnpm format         # prettier --write . (default Prettier settings, no config file)
pnpm db:generate    # drizzle-kit generate from src/db/schema/index.ts
pnpm video:studio   # Remotion Studio for the landing video (video/, its own pnpm package)
pnpm video:render   # re-render public/video/*.mp4 + posters (phone + desktop clips); do it after portal/email UI changes
```

## What the product is

Pakto (formerly MadeFlow) is a mobile-first pilot for agreed offers, change orders, deadlines, stages and payments on construction and renovation sites. The UI copy and most docs are in Bulgarian; keep user-facing strings in Bulgarian. Core flow: project → draft → frozen (sent) version → protected client link → client approves, requests a change, or declines. The pilot does not issue invoices.

`docs/architecture-decisions.md`, `docs/state-machines.md` and `docs/implementation-plan.md` hold the accepted design. `docs/deployment-notes.md` lists every env var, cron job and storage bucket for the Hostinger VPS deployment (not Vercel; `vercel.json` crons are only a reference). Update it whenever you add an env var, cron or bucket.

## Architecture

**Two separate identities.**
- *Staff* sign in with Better Auth (`src/lib/auth/server.ts`, tables `app.auth_*`, bcrypt passwords, emails through `sendEmail`); `getSessionUser()` reads the session. `src/proxy.ts` (Next 16's replacement for middleware; it must sit next to `src/app`, a root `proxy.ts` is ignored) only checks that the session cookie exists for `/app`, `/onboarding` and `/welcome`; pages verify the session itself. Server code gets the caller through `requireTenantContext()` in `src/lib/authz/tenant-context.ts` (organization, role, permissions), then `requireProjectCapability()` (`project-access.ts`) and `can(member, "<permission>")` (`permissions.ts`).
- *Clients* never have an auth account. `/access/[token]` exchanges a bootstrap secret for an HttpOnly device session cookie scoped to one project (`src/modules/change-portal/session.ts`). Portal pages live under `/portal/[projectPublicId]`. Only SHA-256 hashes of tokens are stored (`src/lib/crypto/portal-token.ts`), and changing `PORTAL_LINK_SECRET` invalidates every client link.

**Data access is server-only.** The browser never reads business tables directly; the Supabase Data API roles have no grants. All reads and writes go through Drizzle (`getDatabase()` in `src/db/index.ts`, `postgres.js`, `server-only`). Every query must filter by `organizationId` from the tenant context. Files (attachments, signatures, logos) live on the server disk under `FILES_DIR` via `src/lib/storage/`: uploads go through a signed ticket to `PUT /api/uploads`, private files are served by routes that check access, logos by `/api/logos`.

**Domain modules** in `src/modules/<domain>/` are split by role:
- `queries.ts`: reads used by Server Components; return allow-listed DTOs, not raw rows.
- `actions.ts` (and `*-actions.ts`): `"use server"` Server Actions. They parse `FormData` with zod, check access as above, write via Drizzle, call `revalidatePath`, and return a `{ error?, ok? }` state for `useActionState`.
- Other files hold domain logic (`pricing.ts`, `revision-diff.ts`, `state.ts`, and so on).

`src/app` stays thin: routes compose module queries with components from `src/components/<domain>/`, the shared workspace chrome in `src/components/workspace/` (page shell, header, data table, filters), and the shadcn/React Aria primitives in `src/components/ui/`.

**Offers are versioned and immutable once sent.** `change_orders` is the stable identity. Content lives in `change_order_revisions`. After `sent`, the content columns, frozen timestamp and canonical content hash (`src/lib/crypto/canonical-json.ts`) are protected by a database trigger. Revising a sent offer creates a new revision; it never edits the old one. `portal_decisions` and `timeline_events` are append-only and idempotent. The commercial decision and the work status are separate state machines.

**Side channels.** Email goes through Resend (`src/lib/email/send.ts`). Notification fan-out is in `src/modules/notifications/`. PDFs are rendered with `@react-pdf/renderer` in `src/modules/pdf/`, and the client PDF route checks the same portal session. Cron endpoints in `src/app/api/cron/*` require `Authorization: Bearer $CRON_SECRET`.

## Database and migrations

The Drizzle schema is one file, `src/db/schema/index.ts`. New migrations go in `db/migrations/` as timestamped dbmate SQL (`-- migrate:up` / `-- migrate:down`; `pnpm db:new name` creates one), alongside any triggers and grants. `db/migrations/20261005160000_baseline.sql` is the whole `app` schema as of 05.10.2026; `supabase/migrations/` and `drizzle/` are the history before it and are not replayed. Until the move to our own server is done, also apply each new migration to Supabase (`apply_migration`), the database `DATABASE_URL` still points at. Keep the Drizzle schema in sync with every SQL migration you add. Postgres runs from `docker-compose.dev.yml` locally (`pnpm db:up`, `pnpm db:migrate`, `pnpm db:pull` for an anonymized copy of production) and from `deploy/compose.postgres.yml` on the server; the app role `pakto_app` cannot change the schema, `pakto_owner` runs migrations.

Legacy "passport" tables and routes from the earlier MadeFlow product remain only for migration and rollback, and only owners can reach them. New navigation and features use the modules above. Applied migrations and database object names (for example the `madeflow_staff_receive` realtime policy) keep the old name; do not rename them.
