-- migrate:up

-- A task can belong to one stage of its project, so the stage shows how much of its work is done.
-- Deleting the stage keeps the task, without the link.
alter table app.tasks
  add column milestone_id uuid references app.project_milestones(id) on delete set null;

create index tasks_milestone_idx on app.tasks (milestone_id) where milestone_id is not null;

-- migrate:down

drop index if exists app.tasks_milestone_idx;
alter table app.tasks drop column if exists milestone_id;
