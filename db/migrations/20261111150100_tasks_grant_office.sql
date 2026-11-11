-- migrate:up

-- The two new keys live in the previous migration; a new enum value cannot be used in the same
-- transaction that adds it, so the grant is a migration of its own. "Координатор" (role office)
-- includes every permission except recording payments, so existing coordinators keep matching it.
UPDATE app.organization_members
SET permissions = permissions || ARRAY['tasks.assign', 'tasks.view_all']::app.member_permission[]
WHERE role = 'office'
  AND NOT ('tasks.assign' = ANY (permissions));

UPDATE app.team_invites
SET permissions = permissions || ARRAY['tasks.assign', 'tasks.view_all']::app.member_permission[]
WHERE role = 'office'
  AND NOT ('tasks.assign' = ANY (permissions));

-- migrate:down

UPDATE app.organization_members
SET permissions = array_remove(array_remove(permissions, 'tasks.assign'::app.member_permission), 'tasks.view_all'::app.member_permission);

UPDATE app.team_invites
SET permissions = array_remove(array_remove(permissions, 'tasks.assign'::app.member_permission), 'tasks.view_all'::app.member_permission);
