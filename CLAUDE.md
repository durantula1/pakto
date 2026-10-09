# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

pnpm 11 on Node 24.19+. There is no test suite (see the testing preference in AGENTS.md).

```bash
pnpm dev            # next dev on :3000 (also the "dev" entry in .claude/launch.json)
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint .
pnpm build          # next build (Turbopack)
pnpm format         # prettier --write . (default Prettier settings, no config file)
pnpm db:up          # local Postgres 17 + Mailpit (docker-compose.dev.yml); emails at http://localhost:8025
pnpm db:migrate     # apply db/migrations/ (dbmate); pnpm db:new name creates one
pnpm db:pull        # anonymized copy of the server database (scripts/db-pull.sh)
pnpm video:studio   # Remotion Studio for the landing video (video/, its own pnpm package)
pnpm video:render   # re-render public/video/*.mp4 + posters (phone + desktop clips); do it after portal/email UI changes
```

## What the product is

Pakto (formerly MadeFlow) is a mobile-first pilot for agreed offers, change orders, deadlines, stages and payments on construction and renovation sites. The UI copy and most docs are in Bulgarian; keep user-facing strings in Bulgarian. Core flow: project → draft → frozen (sent) version → protected client link → client approves, requests a change, or declines. The pilot does not issue invoices.

**Cloudflare sits in front of pakto.net** (DNS and proxy since 06.10.2026; pakto.io only redirects there). The proxy carries HTTP(S) only, so anything that SSHes to the server (the deploy workflow, `scripts/db-pull.sh`, a person) uses the VPS IP `187.7.64.36`, never `pakto.net`. Caddy takes the visitor's IP from `CF-Connecting-IP`, trusted only from Cloudflare's ranges (`deploy/Caddyfile`). Records for the site are Proxied, mail records DNS only; the dashboard settings, the rollback and what is still pending are in the Cloudflare part of `docs/deployment-notes.md`.

`docs/architecture-decisions.md`, `docs/state-machines.md` and `docs/implementation-plan.md` hold the accepted design. `docs/deployment-notes.md` lists every env var, cron job and storage bucket for the Hostinger VPS deployment (not Vercel; `vercel.json` crons are only a reference). Update it whenever you add an env var, cron or bucket.

## Architecture

**Two separate identities.**
- *Staff* sign in with Better Auth (`src/lib/auth/server.ts`, tables `app.auth_*`, bcrypt passwords, emails through `sendEmail`); `getSessionUser()` reads the session. `src/proxy.ts` (Next 16's replacement for middleware; it must sit next to `src/app`, a root `proxy.ts` is ignored) only checks that the session cookie exists for `/app`, `/onboarding` and `/welcome`; pages verify the session itself. Server code gets the caller through `requireTenantContext()` in `src/lib/authz/tenant-context.ts` (organization, role, permissions), then `requireProjectCapability()` (`project-access.ts`) and `can(member, "<permission>")` (`permissions.ts`).
- *Clients* never have an auth account. `/access/[token]` exchanges a bootstrap secret for an HttpOnly device session cookie scoped to one project (`src/modules/change-portal/session.ts`). Portal pages live under `/portal/[projectPublicId]`. Only SHA-256 hashes of tokens are stored (`src/lib/crypto/portal-token.ts`), and changing `PORTAL_LINK_SECRET` invalidates every client link.

**Data access is server-only.** The browser never reads business tables directly. All reads and writes go through Drizzle (`getDatabase()` in `src/db/index.ts`, `postgres.js`, `server-only`). Every query must filter by `organizationId` from the tenant context. Files (attachments, signatures, logos) live on the server disk under `FILES_DIR` via `src/lib/storage/`: uploads go through a signed ticket to `PUT /api/uploads`, private files are served by routes that check access, logos by `/api/logos`.

**Domain modules** in `src/modules/<domain>/` are split by role:
- `queries.ts`: reads used by Server Components; return allow-listed DTOs, not raw rows.
- `actions.ts` (and `*-actions.ts`): `"use server"` Server Actions. They parse `FormData` with zod, check access as above, write via Drizzle, call `revalidatePath`, and return a `{ error?, ok? }` state for `useActionState`.
- Other files hold domain logic (`pricing.ts`, `revision-diff.ts`, `state.ts`, and so on).

The typeface is Sofia Sans (`src/app/fonts/sofia-sans-standard.woff2`, loaded with `next/font/local` in the root layout as `--font-sans`). Its default Cyrillic is the Bulgarian letterforms and browsers ignore `font-feature-settings: "locl" 0`, so the file is regenerated with the standard forms as default by `scripts/fonts/sofia-sans-standard.py`; do not swap it for the Google Fonts copy.

`src/app` stays thin: routes compose module queries with components from `src/components/<domain>/`, the shared workspace chrome in `src/components/workspace/` (page shell, header, data table, filters), and the shadcn/React Aria primitives in `src/components/ui/`.

**Offers are versioned and immutable once sent.** `change_orders` is the stable identity. Content lives in `change_order_revisions`. After `sent`, the content columns, frozen timestamp and canonical content hash (`src/lib/crypto/canonical-json.ts`) are protected by a database trigger. Revising a sent offer creates a new revision; it never edits the old one. `portal_decisions` and `timeline_events` are append-only and idempotent. The commercial decision and the work status are separate state machines.

**Side channels.** Email goes through SMTP (`src/lib/email/send.ts`: the info@pakto.net mailbox on the server, Mailpit locally), with `app.email_outbox` and retries by the email-outbox cron. Live refresh for staff is Postgres `LISTEN/NOTIFY` (`src/lib/live/hub.ts`) streamed by `/api/live`. Notification fan-out is in `src/modules/notifications/`. PDFs are rendered with `@react-pdf/renderer` in `src/modules/pdf/`, and the client PDF route checks the same portal session. Cron endpoints in `src/app/api/cron/*` require `Authorization: Bearer $CRON_SECRET`.

## Database and migrations

The Drizzle schema is one file, `src/db/schema/index.ts`. New migrations go in `db/migrations/` as timestamped dbmate SQL (`-- migrate:up` / `-- migrate:down`; `pnpm db:new name` creates one), alongside any triggers and grants. `db/migrations/20261005160000_baseline.sql` is the whole `app` schema as of 05.10.2026; the older history (Supabase migrations, drizzle-kit) is only in git. Keep the Drizzle schema in sync with every SQL migration you add. Postgres runs from `docker-compose.dev.yml` locally (`pnpm db:up`, `pnpm db:migrate`, `pnpm db:pull` for an anonymized copy of production) and from `deploy/compose.yml` on the server (GitHub Actions deploys every push to `main`, see `docs/deployment-notes.md`); the app role `pakto_app` cannot change the schema, `pakto_owner` runs migrations.

The "passport" model of the earlier MadeFlow product was dropped on 06.10.2026 (`20261006120000_drop_legacy_madeflow.sql`). Do not rename applied migrations.
