create table if not exists site_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

create index if not exists submissions_created_at_idx on submissions (created_at);
create index if not exists exam_submissions_created_at_idx on exam_submissions (created_at);
create index if not exists judge_calls_created_at_idx on judge_calls (created_at);
create index if not exists questions_status_idx on questions (status);

-- Example helper: the dashboard route can read `lesson_doc_url` from site_settings.
-- Example usage in SQL editor:
-- insert into site_settings(key, value) values ('lesson_doc_url', 'https://docs.google.com/document/.../edit')
-- on conflict (key) do update set value = excluded.value, updated_at = now();
