-- Default categories, matching the app's built-in defaults.
-- Safe to re-run: skips insertion if categories already exist.
insert into categories (name, color, icon)
select v.name, v.color, v.icon
from (values
  ('Work', 'blue', 'Briefcase'),
  ('Personal', 'violet', 'User'),
  ('Study', 'green', 'BookOpen'),
  ('Other', 'slate', 'Tag')
) as v(name, color, icon)
where not exists (select 1 from categories);

insert into settings (id)
values ('app-settings')
on conflict (id) do nothing;
