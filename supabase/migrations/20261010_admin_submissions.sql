-- Migration: admin submissions foundation
-- This file is intentionally written as a reference for Supabase SQL Editor.
-- Adjust column types to match the actual project schema before running.

create table if not exists submissions (
  id bigserial primary key,
  student_id text references students(id) on delete cascade,
  question_id text references questions(id) on delete set null,
  mode text not null,
  answer jsonb not null,
  correct boolean not null,
  points int not null default 0,
  wrong_node_ids text[],
  judge_reason text,
  created_at timestamptz default now()
);

create index if not exists submissions_student_idx on submissions (student_id, created_at desc);
create index if not exists submissions_question_idx on submissions (question_id, created_at desc);

alter table attempts add column if not exists source text default 'auto';
alter table attempts add column if not exists note text;

create table if not exists exam_starts (
  exam_id text not null references exams(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (exam_id, student_id)
);

alter table exam_submissions add column if not exists duration_sec int;
alter table exam_submissions add column if not exists is_late boolean default false;
alter table exam_submissions add column if not exists graded_by text default 'auto';
alter table exam_submissions add column if not exists teacher_note text;

create table if not exists admin_actions (
  id bigserial primary key,
  action text not null,
  target jsonb not null,
  note text,
  created_at timestamptz default now()
);

create or replace view admin_submissions_view as
select 'algo'::text as kind,
       sub.id::text as id,
       sub.student_id,
       s.name as student_name,
       s.class as class_name,
       coalesce(q.data->>'title', sub.question_id) as title,
       sub.mode as sub_type,
       sub.points::numeric as score,
       null::numeric as max_score,
       sub.correct as correct,
       null::text as status,
       sub.created_at
from submissions sub
join students s on s.id = sub.student_id
left join questions q on q.id = sub.question_id
union all
select 'exam'::text,
       es.id::text,
       es.student_id,
       s.name,
       s.class,
       e.title,
       'exam'::text,
       es.total_score::numeric,
       e.max_score::numeric,
       null::boolean,
       es.status,
       es.created_at
from exam_submissions es
join students s on s.id = es.student_id
join exams e on e.id = es.exam_id;
