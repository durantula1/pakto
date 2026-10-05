-- When the user went through (or skipped) the welcome screens; null shows them once after sign-up.
alter table app.profiles add column if not exists welcome_seen_at timestamptz;

-- People who already use the app skip the welcome screens.
update app.profiles set welcome_seen_at = now() where welcome_seen_at is null;
