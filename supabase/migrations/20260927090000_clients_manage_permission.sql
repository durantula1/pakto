-- Editing a client changes every project of that client (docs/clients-plan.md, 8).
ALTER TYPE app.member_permission ADD VALUE IF NOT EXISTS 'clients.manage';
