-- Every outgoing email leaves a row here: the daily count against the mailbox limit, failures to look at,
-- and retries for background mail (notifications, reminders, receipts) that hit a temporary SMTP error.
-- Body columns are filled only for mail that may be retried; codes and links in interactive mail are not kept.
CREATE TABLE app.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  to_address text NOT NULL,
  subject text,
  text_body text,
  html_body text,
  reply_to text,
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'queued', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX email_outbox_due_idx ON app.email_outbox (next_attempt_at) WHERE status = 'queued';
CREATE INDEX email_outbox_sent_idx ON app.email_outbox (sent_at) WHERE status = 'sent';
CREATE INDEX email_outbox_created_idx ON app.email_outbox (created_at);
ALTER TABLE app.email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app.email_outbox FROM anon, authenticated;
