-- Schema for Tin học 6 - Bài 16 app
-- Tables: students, questions, attempts, judge_calls
-- View: leaderboard

create table students (
  id text primary key,                 -- normalized name|class
  name text not null,
  class text not null,
  created_at timestamptz default now()
);

create table questions (
  id text primary key,
  lesson int default 16,
  mode text not null,                  -- sap_xep | dien_khuyet | tu_do
  type text not null,                  -- tuan_tu | re_nhanh | lap
  data jsonb not null,
  status text default 'pending',       -- pending | approved
  created_at timestamptz default now()
);

create table attempts (
  student_id text references students(id),
  question_id text references questions(id),
  correct boolean not null,
  points int not null default 0,
  created_at timestamptz default now(),
  primary key (student_id, question_id)
);

create view leaderboard as
select s.name, s.class, coalesce(sum(a.points),0) as total
from students s left join attempts a on a.student_id = s.id
group by s.id, s.name, s.class order by total desc;

-- NEW TABLE: track Gemini judge calls for rate limiting
create table judge_calls (
  id bigserial primary key,
  student_id text references students(id),
  question_id text,
  created_at timestamptz default now()
);
alter table judge_calls enable row level security;
