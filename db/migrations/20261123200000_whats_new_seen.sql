-- migrate:up

-- Which "what's new" screens the user has seen (the version in src/lib/whats-new.ts). NULL = none yet,
-- so everyone who used Pakto before the release gets the walkthrough once, on their next visit.
ALTER TABLE app.profiles ADD COLUMN whats_new_seen text;

-- migrate:down

ALTER TABLE app.profiles DROP COLUMN whats_new_seen;
