-- migrate:up

-- Accepting the work now takes the emailed code like a decision on an offer: a forwarded link alone
-- could otherwise sign the handover with any typed name. The code has its own purpose, so it cannot
-- be used for a decision, and the other way round.

ALTER TABLE app.portal_otps DROP CONSTRAINT portal_otps_purpose_check;
ALTER TABLE app.portal_otps ADD CONSTRAINT portal_otps_purpose_check
  CHECK (purpose = ANY (ARRAY['claim'::text, 'email_change'::text, 'decision'::text, 'unlock'::text, 'acceptance'::text]));

-- migrate:down

DELETE FROM app.portal_otps WHERE purpose = 'acceptance';
ALTER TABLE app.portal_otps DROP CONSTRAINT portal_otps_purpose_check;
ALTER TABLE app.portal_otps ADD CONSTRAINT portal_otps_purpose_check
  CHECK (purpose = ANY (ARRAY['claim'::text, 'email_change'::text, 'decision'::text, 'unlock'::text]));
