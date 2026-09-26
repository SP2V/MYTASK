alter table tasks
  add column if not exists calendar_color_id text
  check (calendar_color_id is null or calendar_color_id in ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'));
