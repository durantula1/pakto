-- docs/chat-narrowing-plan.md, part 5: the project-wide chat is gone, every message is about one
-- offer or change. The project-level messages were test data only (checked 2026-09-29).
DELETE FROM app.document_messages WHERE change_order_id IS NULL;
DROP INDEX IF EXISTS app.document_messages_project_idx;
ALTER TABLE app.document_messages ALTER COLUMN change_order_id SET NOT NULL;
