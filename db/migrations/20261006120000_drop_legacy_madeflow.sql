-- migrate:up
-- The "passport" model of the earlier MadeFlow product (orders, specification versions, approvals, payments of the
-- old kind, installations, warranty, service requests, the old activity log and notification outbox). Nothing in the
-- code reads or writes these tables any more and the server database started empty on 06.10.2026, so nothing is lost.

-- Company deletion no longer has these tables to clear.
CREATE OR REPLACE FUNCTION app.purge_organization(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app.organizations WHERE id = p_org AND closure_requested_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Organization % is not scheduled for closure', p_org;
  END IF;
  PERFORM set_config('app.purge_organization', p_org::text, true);
  UPDATE app.change_orders SET current_revision_id = NULL, approved_revision_id = NULL, baseline_offer_id = NULL, absorbed_by_revision_id = NULL WHERE organization_id = p_org;
  DELETE FROM app.payment_claims WHERE organization_id = p_org;
  DELETE FROM app.payment_disputes WHERE organization_id = p_org;
  DELETE FROM app.project_receipts WHERE organization_id = p_org;
  DELETE FROM app.payment_installments WHERE organization_id = p_org;
  DELETE FROM app.offer_acceptances WHERE organization_id = p_org;
  DELETE FROM app.timeline_events WHERE organization_id = p_org;
  DELETE FROM app.portal_decisions WHERE revision_id IN (
    SELECT r.id FROM app.change_order_revisions r JOIN app.change_orders c ON c.id = r.change_order_id WHERE c.organization_id = p_org
  );
  DELETE FROM app.change_attachments WHERE organization_id = p_org;
  DELETE FROM app.portal_otps WHERE project_contact_id IN (
    SELECT pc.id FROM app.project_contacts pc JOIN app.projects p ON p.id = pc.project_id WHERE p.organization_id = p_org
  );
  DELETE FROM app.project_milestones WHERE organization_id = p_org;
  DELETE FROM app.change_order_revisions WHERE change_order_id IN (SELECT id FROM app.change_orders WHERE organization_id = p_org);
  DELETE FROM app.change_orders WHERE organization_id = p_org;
  DELETE FROM app.portal_grants WHERE project_id IN (SELECT id FROM app.projects WHERE organization_id = p_org);
  DELETE FROM app.staff_notifications WHERE organization_id = p_org;
  DELETE FROM app.projects WHERE organization_id = p_org;
  DELETE FROM app.clients WHERE organization_id = p_org;
  DELETE FROM app.team_invites WHERE organization_id = p_org;
  DELETE FROM app.owner_role_requests WHERE organization_id = p_org;
  DELETE FROM app.organizations WHERE id = p_org;
END $function$;

DROP TABLE
  app.version_files, app.order_files, app.quote_items, app.review_requests, app.approvals, app.portal_links,
  app.warranty_items, app.service_requests, app.installations, app.payments, app.order_drafts,
  app.specification_versions, app.orders, app.organization_template_field_overrides,
  app.specification_template_fields, app.specification_templates, app.customers, app.activity_events,
  app.notification_outbox;

-- Columns of the old order numbering, branding and step-up check, and an attachment status nothing sets.
ALTER TABLE app.organizations
  DROP COLUMN brand_color, DROP COLUMN default_locale, DROP COLUMN order_number_prefix,
  DROP COLUMN next_order_number, DROP COLUMN step_up_threshold;
ALTER TABLE app.change_attachments DROP COLUMN processing_status;

DROP FUNCTION app.protect_version_payload();
DROP FUNCTION app.prevent_immutable_record_change();

DROP TYPE
  app.acceptance_status, app.actor_type, app.customer_kind, app.file_category, app.notification_status,
  app.order_stage, app.portal_scope, app.review_state, app.service_status, app.specification_field_type,
  app.template_scope, app.version_status;

-- migrate:down
-- Not reversible: the tables were empty and their code is gone. Restore a backup taken before this migration.
DO $$ BEGIN RAISE EXCEPTION 'drop_legacy_madeflow cannot be rolled back; restore a backup instead'; END $$;
