# Pakto pilot: implementation and acceptance

A project holds one or more agreements; each is an approved base offer with its approved changes, stages, installments and receipts. Draft, pending, and rejected revisions do not change the contract total or deadline. Sent revisions are frozen in PostgreSQL and available as PDFs; client decisions remain in the timeline.

## Implemented flows

1. Create a project and a base offer with line items, a deadline and optional payment terms (more offers can follow in the same project). Send it, have the client approve or request changes, and send a new version. The original sent version and decision remain available.
2. Create additional work against the approved offer. Choose no deadline change or an exact new deadline. After approval, update work status separately from the client decision.
3. View the same calculated contract price, deadline, milestones, planned installments, receipts, balance, and pending decisions in staff and client views.
4. Invite office and field users for selected projects. Review the exact visible projects and actions before sending or saving. Grant payment recording separately. A second owner approves owner role changes; the sole owner can invite or promote the second owner. Access checks run on server requests. In-app notifications refresh live through Postgres `LISTEN/NOTIFY` (`/api/live`) with a visible-tab refresh fallback.
5. Record deposits, partial and final receipts separately from planned installments. Correct a receipt with reversal records; review monthly received amounts by currency and project. A client can dispute a receipt, and an authorized staff member can resolve or correct it.
6. Reuse one client link for a project contact. An owner can rotate it and invalidate prior grants and sessions. PDF downloads are available from frozen offer and change revisions.

The pilot does not issue invoices or replace accounting software. The first 2–3 months are free for 5–10 independent tradespeople and small teams. Track projects created, documents sent and approved, payments recorded, return usage, and friction before pricing paid plans.

## Release gate

- Migrations are dbmate SQL in `db/migrations/`; the deploy applies new ones after a backup.
- Configure a long-lived `PORTAL_LINK_SECRET` before issuing persistent client links. Keep it unchanged across deployments; changing it requires rotating links.
- Manually walk one project through offer → requested correction → approved new version → approved extra work with revised deadline → completed milestone → partial payment → remaining balance. Compare staff and client views and PDF versions.
- A single-offer project looks as before: no offer chips, no "Към оферта" fields.
- Renegotiation that absorbs a change: offer v1 approved, change A approved, v2 includes A and is approved. The price is v2 without A; the deadline is v2's; stages made from v1's schedule still count as planned.
- Two offers: a bathroom (accepted) and a kitchen (in progress), an unassigned deposit later assigned, a change to the kitchen. Totals, chips and the portal agree.
- Access: a project without an email; someone else confirms the contact; the owner resets it; the right person confirms; the approver is handed to a viewer.
- Money: 30/70 terms → installments on approval → client "Платих" → confirmed → disputed → corrected; the client gets the receipts by email.
- End: cancel a pending offer; handover with issues → asked again → accepted; complete the project → archive it. The portal stays readable, reminders stop.
- Manually check field and office permissions with open pages, owner confirmation with two owners, receipt disputes, and rotation of a client link with an existing session.
- Run `pnpm typecheck`, `pnpm lint`, and `pnpm build`. Automated tests are excluded by `AGENTS.md` unless the user explicitly requests them.
