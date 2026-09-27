-- docs/portal-simplify-plan.md, В4: a client has at most one active invitation per project.
-- Checked before: no project holds two active contacts of the same client.
CREATE UNIQUE INDEX project_contacts_one_per_client_uidx ON app.project_contacts (project_id, client_id)
  WHERE removed_at IS NULL;
