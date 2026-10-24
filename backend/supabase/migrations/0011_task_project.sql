-- Link tasks to a project so project progress can count its tasks alongside
-- its steps. Deleting a project keeps its tasks and just unlinks them.

alter table tasks
  add column if not exists project_id uuid references projects(id) on delete set null;

create index if not exists tasks_project_id_idx on tasks (project_id);
