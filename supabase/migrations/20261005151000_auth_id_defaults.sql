-- Better Auth with generateId "uuid" leaves the id of new rows to the database.
ALTER TABLE app.auth_users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE app.auth_sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE app.auth_accounts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE app.auth_verifications ALTER COLUMN id SET DEFAULT gen_random_uuid();
