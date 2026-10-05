-- Stages and installments always belong to an offer (docs/offer-centric-plan.md). In a project with
-- exactly one base offer, rows left at project level (offer_id null) go to that offer; receipts and
-- client payment reports too (an unassigned receipt may be assigned once, the append-only trigger allows it).
-- Projects with several offers keep their unassigned rows for the team to place.
WITH sole AS (
  SELECT project_id, (array_agg(id))[1] AS offer_id
  FROM app.change_orders
  WHERE document_kind = 'offer' AND archived_at IS NULL AND lifecycle_status <> 'canceled'
  GROUP BY project_id
  HAVING count(*) = 1
)
UPDATE app.project_milestones m SET offer_id = sole.offer_id FROM sole
WHERE m.project_id = sole.project_id AND m.offer_id IS NULL AND m.change_order_id IS NULL;

WITH sole AS (
  SELECT project_id, (array_agg(id))[1] AS offer_id
  FROM app.change_orders
  WHERE document_kind = 'offer' AND archived_at IS NULL AND lifecycle_status <> 'canceled'
  GROUP BY project_id
  HAVING count(*) = 1
)
UPDATE app.payment_installments i SET offer_id = sole.offer_id FROM sole
WHERE i.project_id = sole.project_id AND i.offer_id IS NULL;

WITH sole AS (
  SELECT project_id, (array_agg(id))[1] AS offer_id
  FROM app.change_orders
  WHERE document_kind = 'offer' AND archived_at IS NULL AND lifecycle_status <> 'canceled'
  GROUP BY project_id
  HAVING count(*) = 1
)
UPDATE app.project_receipts r SET offer_id = sole.offer_id FROM sole
WHERE r.project_id = sole.project_id AND r.offer_id IS NULL;

WITH sole AS (
  SELECT project_id, (array_agg(id))[1] AS offer_id
  FROM app.change_orders
  WHERE document_kind = 'offer' AND archived_at IS NULL AND lifecycle_status <> 'canceled'
  GROUP BY project_id
  HAVING count(*) = 1
)
UPDATE app.payment_claims c SET offer_id = sole.offer_id FROM sole
WHERE c.project_id = sole.project_id AND c.offer_id IS NULL;
