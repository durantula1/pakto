-- Run by scripts/db-pull.sh on the LOCAL copy only (psql -v keep='mitqqq35%'): replaces what identifies a person.
-- Triggers are switched off for the session, because the append-only tables must not be edited on a real database.
-- Passwords of all staff become "pakto-dev"; staff whose email matches :'keep' keep that email so you can sign in.
SET session_replication_role = replica;
BEGIN;

-- Staff: login and profile
UPDATE app.auth_users SET
  name = 'Служител ' || left(id::text, 4),
  email = CASE WHEN email LIKE :'keep' THEN email ELSE 'staff-' || left(id::text, 8) || '@example.test' END,
  email_verified = true;
UPDATE app.profiles SET
  display_name = 'Служител ' || left(id::text, 4),
  email = (SELECT u.email FROM app.auth_users u WHERE u.id = profiles.id),
  phone = NULL
WHERE deleted_at IS NULL;
UPDATE app.auth_accounts SET password = '$2b$10$groPOXy4Ze97du69IRAC3e2aes7N/iIktUu61jy32zykRftjc7xgG' WHERE provider_id = 'credential';
DELETE FROM app.auth_sessions;
DELETE FROM app.auth_verifications;
UPDATE app.team_invites SET email = 'invite-' || left(id::text, 8) || '@example.test', token_hash = md5(random()::text);

-- Clients and contacts
UPDATE app.clients SET
  name = 'Клиент ' || left(id::text, 4), email = 'client-' || left(id::text, 8) || '@example.test',
  phone = '+359000000000', address = NULL;
UPDATE app.project_contacts SET
  name = 'Клиент ' || left(id::text, 4), email = 'contact-' || left(id::text, 8) || '@example.test', phone = '+359000000000';
UPDATE app.organizations SET phone = '+359000000000';
UPDATE app.projects SET site_address = 'Адрес на обекта';

-- Traces of who decided what from where
UPDATE app.portal_decisions SET typed_name = 'Клиент', ip = NULL, user_agent = NULL, verified_email = 'client@example.test';
UPDATE app.offer_acceptances SET typed_name = 'Клиент', ip = NULL, user_agent = NULL;
UPDATE app.approvals SET approver_name = 'Клиент', approver_email = 'client@example.test', user_agent = NULL;
UPDATE app.portal_otps SET email = 'client@example.test', target_email = NULL, created_ip = NULL;
UPDATE app.portal_sessions SET created_ip = NULL, user_agent = NULL;

-- Client links and sessions stop working (decisions still point at them, so the rows stay): new links are made locally
UPDATE app.portal_sessions SET session_hash = md5(random()::text), revoked_at = coalesce(revoked_at, now());
UPDATE app.portal_otps SET code_hash = md5(random()::text);
UPDATE app.portal_grants SET token_hash = md5(random()::text), token_ciphertext = 'invalidated';
UPDATE app.portal_links SET token_hash = md5(random()::text);

-- Mail records and queued notifications (nothing from the copy must ever be sent)
DELETE FROM app.email_outbox;
DELETE FROM app.notification_outbox;
UPDATE app.notification_preferences SET email = false;

COMMIT;
RESET session_replication_role;
