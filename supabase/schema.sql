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

create table exams (
  id text primary key,
  title text not null,
  description text,
  time_limit int,
  max_score numeric not null default 10,
  show_answers_after_submit boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz default now()
);

create table exam_questions (
  id text primary key,
  exam_id text not null references exams(id) on delete cascade,
  type text not null check (type in ('mcq', 'essay')),
  difficulty text not null check (difficulty in ('nhan_biet', 'thong_hieu', 'van_dung')),
  content text not null,
  options jsonb,
  correct_answer text not null,
  explanation text,
  score_weight numeric not null default 1,
  order_index int not null default 0
);

create table exam_submissions (
  id bigserial primary key,
  exam_id text not null references exams(id) on delete cascade,
  student_id text not null references students(id),
  student_name text,
  answers jsonb not null,
  total_score numeric not null default 0,
  status text not null default 'submitted',
  created_at timestamptz default now(),
  duration_sec int,
  is_late boolean default false,
  graded_by text default 'auto',
  teacher_note text,
  unique (exam_id, student_id)
);

create table submissions (
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

create table exam_starts (
  exam_id text not null references exams(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (exam_id, student_id)
);

create table admin_actions (
  id bigserial primary key,
  action text not null,
  target jsonb not null,
  note text,
  created_at timestamptz default now()
);

create table site_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
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
