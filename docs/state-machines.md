# Pakto state machines

## Offer and change versions

```text
draft -> sent -> viewed -> approved | declined | changes_requested | expired
sent/viewed -> superseded   (the company withdraws it for a new version)
```

- `change_orders.current_revision_id` is the version being worked on: a draft, or the one awaiting the client.
- `change_orders.approved_revision_id` is the version in force: the last one the client approved. Contract price, deadline and approved changes are read through it, never through `current_revision_id`.
- An approved offer can get a new version (renegotiation). The approved version stays in force while the new one is a draft, sent, declined or expired. Approval moves `approved_revision_id` in the same transaction that records the decision. The earlier version keeps the status `approved` in the history and is shown as replaced.
- An approved change is final. A correction to it is a new change.
- A project can hold several base offers (a bathroom now, a kitchen later). Each is its own agreement: its changes point at it through `baseline_offer_id`, and its stages, installments and receipts carry `offer_id`. `offer_id` null means project level ("без оферта"); a receipt with no offer can be assigned to one once.
- A new version of an approved offer can absorb approved changes (`revision_absorbed_changes`, frozen and fingerprinted with the version). When that version is approved, the changes get `absorbed_by_revision_id` and stop adding to the price.
- An offer version can carry payment terms (`change_order_payment_terms`: share, and due on approval, after a schedule line, on completion or on a date). They are frozen with the version; on approval they become the offer's installments. Installments from an earlier version's terms are replaced only while nothing was paid or claimed against them; otherwise the team is notified to adjust the plan.
- The deadline of an offer is the one set by whichever of its documents (the offer version or a change) was approved last.
- Cancel: a document that is not approved can be canceled (`canceled`, client-visible, the client is emailed when it was waiting for them). For an approved offer only the newer pending version is withdrawn; the approved one stays in force. An offer with receipts is not canceled.
- Expiry: a version past `response_due_at` cannot be decided even before the daily job marks it `expired`; the portal and the document page mark it expired when they open.

## Offer display status

One status shown everywhere (`offerDisplayStatus`), from the versions, the stages and the handover:

```text
draft -> pending -> in_force -> in_progress -> awaiting_acceptance -> accepted
                                                  awaiting_acceptance -> issues -> awaiting_acceptance
pending -> changes_requested | declined | expired
any not approved -> canceled
```

## Project

```text
active -> completed -> archived
completed -> active        (reopen)
archived -> completed      (owner restores)
```

- Active: everything. Completed: payments, payment disputes, "Платих" and questions still work; new documents, decisions, stages and reminders stop. Archived: read-only, out of lists (own filter), the portal stays readable.

## Handover

`offer_acceptances` is append-only; the latest row is the state: `requested` (staff) -> `accepted` (approver with a confirmed email, typed name, IP) | `issues` (note) -> `requested` again.

## Client payments

- "Платих": `payment_claims` `pending -> confirmed` (creates the receipt) `| rejected` (with a reason the client sees).
- Receipt disputes: one open dispute per receipt (`payment_disputes_one_open_uidx`); after a resolution the client can dispute again.

## Client contacts

- Exactly one primary approver per project (`project_contacts_one_approver_uidx`); viewers see everything and decide nothing. Each contact has their own link.
- A confirmed email stays the client's. The team can change name, phone and role, or remove a viewer; only an owner's reset (`app.contact_change = 'reset'`) clears the confirmation, revokes the contact's links and sessions and issues a new link.
- Every contact belongs to a client (`project_contacts.client_id`, required). A project's contracting client (`projects.client_id`) never changes after creation; only a merge (`app.client_merge = 'on'`) moves it.

## Client portal session

```text
link opened ──> started (only the link's project) ──code on the confirmed email──> unlocked (every invited project)
      │                    │                                                          │
      │                    └─ link rotated / contact removed ─> ended                 ├─ contact removed or link revoked ─> loses that project only
      │                                                                               ├─ owner resets the verification ─> ended on every device
      └─ same client, same device, confirmed or same project ─> joins the open session └─ "Изход", expiry or 30 idle days ─> ended
```

- One session per client and device (cookie `sitechange_portal_c_<orgId>`); sessions from before clients (one project each) keep working until they expire.
- Every request checks that the client is still an active contact of the project with a live link, so removal and revocation apply at once.
- Decisions, payments and questions still record the per-project contact (`project_contact_id`).
- A contact removed from a project can no longer dispute its decisions from an old email.

## Order stage (legacy)

```text
draft
  -> awaiting_approval
  -> approved
  -> in_production
  -> ready_for_installation
  -> installed
  -> completed
  -> service
```

Order stage describes operational progress. It never determines which specification version is valid for production.

## Specification version

```text
draft row
  -> publish -> published
  -> send -> awaiting_approval
  -> approve -> approved
  -> later approval -> superseded
```

`changes_requested` is stored on a review request. The reviewed version remains immutable and may remain `awaiting_approval` until it is revoked or superseded by a new published revision.

## Production version invariant

- `orders.current_approved_version_id` is the only production-version pointer.
- Creating or publishing a newer revision does not change that pointer.
- Approval changes the pointer in the same transaction that records the approval.
- A repeated approval request returns the existing receipt and makes no duplicate records.

## Installation and service

```text
scheduled -> installed -> accepted | issues
completed -> service -> completed
```

Installation acceptance uses its own scope and evidence. Approval links are never reused for after-sales access.

