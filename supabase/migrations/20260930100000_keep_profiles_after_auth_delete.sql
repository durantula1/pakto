-- Deleting a login must not delete the person's profile and membership rows: they are anonymized
-- instead (see src/modules/account/purge.ts), so offers, decisions and payments keep their author.
alter table app.profiles drop constraint if exists profiles_auth_user_fk;
alter table app.organization_members drop constraint if exists organization_members_auth_user_fk;
