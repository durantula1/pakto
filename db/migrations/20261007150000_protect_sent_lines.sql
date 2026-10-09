-- migrate:up

-- A sent version was locked only in its own row, its schedule, payment terms and absorbed changes.
-- Its priced lines and attached files could still be changed or deleted, and the version itself
-- deleted, without breaking any check: the PDF and the portal would then show something the client
-- never approved. They now refuse it like the rest; purging an organization still clears them.

CREATE TRIGGER protect_frozen_line_item BEFORE INSERT OR DELETE OR UPDATE ON app.change_order_line_items
  FOR EACH ROW EXECUTE FUNCTION app.protect_frozen_revision_child();

CREATE TRIGGER protect_frozen_attachment BEFORE INSERT OR DELETE OR UPDATE ON app.change_attachments
  FOR EACH ROW EXECUTE FUNCTION app.protect_frozen_revision_child();

CREATE FUNCTION app.protect_sent_revision_delete() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'app', 'pg_temp'
  AS $$
BEGIN
  IF app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  IF OLD.frozen_at IS NOT NULL THEN
    RAISE EXCEPTION 'A sent version cannot be deleted';
  END IF;
  RETURN OLD;
END
$$;

CREATE TRIGGER protect_sent_revision_delete BEFORE DELETE ON app.change_order_revisions
  FOR EACH ROW EXECUTE FUNCTION app.protect_sent_revision_delete();

-- migrate:down

DROP TRIGGER protect_sent_revision_delete ON app.change_order_revisions;
DROP FUNCTION app.protect_sent_revision_delete();
DROP TRIGGER protect_frozen_attachment ON app.change_attachments;
DROP TRIGGER protect_frozen_line_item ON app.change_order_line_items;
