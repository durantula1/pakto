-- docs/portal-simplify-plan.md, A1: a client confirms their email once. Invitations of the same client
-- with the email another invitation already confirmed become confirmed too.
UPDATE app.project_contacts pc
SET email_verified_at = src.email_verified_at, locked_at = src.email_verified_at
FROM (
  SELECT DISTINCT ON (client_id, lower(btrim(email))) client_id, lower(btrim(email)) AS email, email_verified_at
  FROM app.project_contacts
  WHERE email_verified_at IS NOT NULL AND email IS NOT NULL
  ORDER BY client_id, lower(btrim(email)), email_verified_at
) src
WHERE pc.client_id = src.client_id
  AND lower(btrim(pc.email)) = src.email
  AND pc.email_verified_at IS NULL
  AND pc.removed_at IS NULL;
