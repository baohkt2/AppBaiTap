
# PROMPT BUILD: Admin – Quản lý bài làm (Web tự học Tin học 6)

## 0. Cách làm việc (đọc trước)

Bạn là senior full-stack engineer, làm việc trên **một dự án Next.js đã chạy được**. Nhiệm vụ: xây phần **quản lý bài làm** cho giáo viên trong trang admin, gộp hai nguồn bài làm (luyện tập thuật toán và đề thi AI).

- **Không viết lại** những gì đã có. Mở rộng và tái sử dụng code hiện tại (schema zod, `FlowDiagram`, `validateFlowchart`, `grading.ts`, `judge.ts`, helper xác thực admin, component UI sẵn có).
- Làm **theo giai đoạn** ở mục 11. Sau mỗi giai đoạn chạy `npm run lint`, `npm run build`, `npm test`, sửa hết lỗi rồi mới sang giai đoạn tiếp.
- Không thêm tính năng ngoài phạm vi. Chỗ nào mơ hồ thì chọn phương án **đơn giản nhất** và ghi lại trong `README.md`/`docs`.
- Giao diện tiếng Việt, comment và tên biến tiếng Anh. Mọi thao tác sửa/xóa dữ liệu phải có hộp thoại xác nhận.
- Tài liệu hệ thống hiện tại: `HE_THONG_TAI_LIEU.md` (đã có trong repo hoặc người dùng cung cấp). Nếu tài liệu và code mâu thuẫn thì **tin code**, và ghi chú chỗ mâu thuẫn.

## 1. Bối cảnh hệ thống hiện có

- Stack: Next.js 16 (App Router) + TypeScript + Tailwind + Supabase Postgres (chỉ truy cập bằng service role ở server) + Gemini (`@google/genai`) + zod + jose + vitest.
- Học sinh đăng nhập bằng tên + lớp (không mật khẩu). Cookie httpOnly chứa `studentId`.
- **Luyện tập thuật toán** (`questions`, `attempts`, `judge_calls`): 3 chế độ `sap_xep` (1đ), `dien_khuyet` (3đ), `tu_do` (10đ). `attempts` chỉ có một dòng cho mỗi (học sinh, câu) và chỉ ghi **lần đúng đầu tiên**.
- **Đề thi AI** (`exams`, `exam_questions`, `exam_submissions`): câu `mcq` và `essay`; tự luận do Gemini chấm; cờ `show_answers_after_submit`; ràng buộc `unique(exam_id, student_id)` nên mỗi học sinh nộp một lần cho mỗi đề.
- Trang admin hiện ở `src/app/admin/page.tsx` dạng tab (Sinh câu hỏi, Chờ duyệt, Đã duyệt, Đề Thi (AI), Học sinh, Bài làm). Đã có `GET /api/admin/students` và `GET /api/admin/submissions`.

## 2. Việc đầu tiên: khảo sát code (làm trước khi viết dòng code nào)

Đọc và ghi kết quả vào một mục ngắn "Findings" ở đầu `docs/admin-submissions.md`:

1. Cấu trúc thực tế của `exam_submissions.answers` (JSON lưu gì: chỉ giá trị học sinh chọn/viết, hay có cả điểm/nhận xét từng câu?), các giá trị `status` đang dùng, kiểu dữ liệu các cột `id`, `exam_id`, `total_score`.
2. Route chấm đề thi và route chấm luyện tập (tài liệu nói cả hai đều ở `POST /api/questions/[id]/submit`): chúng đã tách nhánh chưa, ghi dữ liệu ở đâu.
3. Cách xác thực admin (cookie, helper) và cách các API admin hiện kiểm tra quyền.
4. Tab "Bài làm" và "Học sinh" hiện hiển thị gì, gọi API nào.
5. Hàm tính điểm đề thi hiện có (theo `scoreWeight` và `maxScore`): vị trí, có tách khỏi route được không.

Sau đó điều chỉnh tên cột/kiểu dữ liệu trong các đoạn SQL và API dưới đây cho **khớp thực tế**. Đoạn SQL dưới đây là bản mẫu, không được chạy mù quáng.

## 3. Migration cơ sở dữ liệu

Viết vào `supabase/migrations/<timestamp>_admin_submissions.sql` **và** cập nhật `supabase/schema.sql`. **Không tự chạy**; ghi rõ trong README để người dùng dán vào Supabase SQL Editor.

```sql
-- 3.1 Nhật ký mọi lần nộp bài luyện tập
create table if not exists submissions (
  id bigserial primary key,
  student_id text references students(id) on delete cascade,
  question_id text references questions(id) on delete set null,
  mode text not null,                  -- sap_xep | dien_khuyet | tu_do
  answer jsonb not null,               -- bài làm của học sinh
  correct boolean not null,
  points int not null default 0,       -- điểm được cộng ở lần nộp này
  wrong_node_ids text[],
  judge_reason text,                   -- lý do của Gemini (nếu có)
  created_at timestamptz default now()
);
create index if not exists submissions_student_idx on submissions (student_id, created_at desc);
create index if not exists submissions_question_idx on submissions (question_id, created_at desc);

-- 3.2 Attempts: đánh dấu chấm tay
alter table attempts add column if not exists source text default 'auto'; -- auto | manual
alter table attempts add column if not exists note text;

-- 3.3 Đề thi: thời điểm bắt đầu làm, thời gian làm, cách chấm
create table if not exists exam_starts (
  exam_id <kiểu của exams.id> references exams(id) on delete cascade,
  student_id text references students(id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (exam_id, student_id)
);
alter table exam_submissions add column if not exists duration_sec int;
alter table exam_submissions add column if not exists is_late boolean default false;
alter table exam_submissions add column if not exists graded_by text default 'auto'; -- auto | manual
alter table exam_submissions add column if not exists teacher_note text;

-- 3.4 Nhật ký thao tác của admin
create table if not exists admin_actions (
  id bigserial primary key,
  action text not null,               -- override | regrade | rescore | retake | reset | merge | rename | delete_student
  target jsonb not null,              -- đối tượng bị tác động (+ bản sao dữ liệu cũ nếu xóa)
  note text,
  created_at timestamptz default now()
);

alter table submissions enable row level security;
alter table exam_starts enable row level security;
alter table admin_actions enable row level security;

-- 3.5 View hợp nhất hai nguồn bài làm để lọc và phân trang ở server
create or replace view admin_submissions_view as
select 'algo'::text as kind, sub.id::text as id, sub.student_id,
       s.name as student_name, s.class as class_name,
       coalesce(q.data->>'title', sub.question_id) as title,
       sub.mode as sub_type, sub.points::numeric as score, null::numeric as max_score,
       sub.correct as correct, null::text as status, sub.created_at
from submissions sub
join students s on s.id = sub.student_id
left join questions q on q.id = sub.question_id
union all
select 'exam'::text, es.id::text, es.student_id, s.name, s.class, e.title,
       'exam'::text, es.total_score::numeric, e.max_score::numeric,
       null::boolean, es.status, es.created_at
from exam_submissions es
join students s on s.id = es.student_id
join exams e on e.id = es.exam_id;
```

Điều chỉnh kiểu dữ liệu (`uuid`/`text`/`int`...) cho khớp bảng thật trước khi lưu migration.

## 4. Ghi dữ liệu ở server (giai đoạn nền)

1. **Luyện tập:** trong route chấm luyện tập, **mọi lần nộp** (đúng hoặc sai) đều `insert` vào `submissions` (`answer`, `correct`, `points` thực nhận ở lần đó, `wrong_node_ids`, `judge_reason`). Logic điểm của `attempts` giữ nguyên (chỉ lần đúng đầu tiên, `on conflict do nothing`).
2. **Đề thi, bắt đầu làm:** khi học sinh **mở đề lần đầu** (route lấy đề đã mask), `insert into exam_starts ... on conflict do nothing`. Không đổi hành vi hiện có của timer.
3. **Đề thi, nộp bài:** tính `duration_sec = now - exam_starts.started_at`. Đặt `is_late = true` nếu vượt `time_limit` + 60 giây dung sai. **Không từ chối** bài nộp muộn (tránh mất bài của học sinh), chỉ ghi nhận và gắn cờ. Nếu không tìm thấy `exam_starts` thì để `duration_sec = null`.
4. Tách hàm tính tổng điểm đề thi thành `src/lib/exam-score.ts` (`computeExamTotal(exam, questions, answers)`) dùng chung cho chấm của học sinh và các thao tác chấm lại của admin. Có unit test.
5. Helper `logAdminAction(action, target, note?)` trong `src/lib/admin-log.ts`. Mọi thao tác thay đổi dữ liệu của admin đều gọi helper này.

## 5. Đặc tả use case

Tác nhân: **Giáo viên (admin)**, đã đăng nhập bằng `ADMIN_PASSWORD`. Mọi API dưới `/api/admin/*` bắt buộc kiểm tra cookie admin.

### UC1. Danh sách bài làm hợp nhất (P1)

- Nguồn: `admin_submissions_view`.
- Bộ lọc: `kind` (tất cả / luyện tập / đề thi), lớp, tìm theo tên học sinh (**không phân biệt dấu**, dùng chuẩn hóa sẵn có), đề hoặc câu hỏi, chế độ (`sap_xep`/`dien_khuyet`/`tu_do`), kết quả (đúng/sai, chỉ áp dụng luyện tập), `status` (đề thi), khoảng ngày.
- Cột: thời gian, loại (🧩/📝), học sinh, lớp, tên đề/câu, điểm (đề thi hiển thị `score/max`), trạng thái.
- Sắp xếp theo `created_at` giảm dần; phân trang **ở server** (25 dòng/trang); đếm tổng.
- Bấm vào dòng mở chi tiết (UC2/UC3). Trạng thái rỗng: "Không có bài làm khớp bộ lọc".

### UC2. Chi tiết bài làm đề thi (P1)

- Hiển thị thông tin: học sinh, lớp, đề, thời điểm nộp, `duration_sec`, `is_late`, `status`, `graded_by`, tổng điểm.
- Từng câu theo `order_index`: MCQ (đáp án chọn so với đáp án đúng, tô đúng/sai), tự luận (bài viết của học sinh, điểm, nhận xét của Gemini).
- Hiện `explanation` của câu và cờ `show_answers_after_submit` (để biết học sinh đã được xem đáp án chưa).
- Nút hành động: Chấm lại câu (UC4), Cho làm lại (UC5).

### UC3. Chi tiết bài làm luyện tập (P1)

- Hiển thị học sinh, câu hỏi (tiêu đề, `scenario`), chế độ, thời gian, kết quả, điểm, `judge_reason`.
- `sap_xep`: bảng từng ô, học sinh đặt gì và đáp án đúng, ô sai tô đỏ.
- `dien_khuyet`: từng ô, chữ học sinh gõ so với `accepted`.
- `tu_do`: **vẽ lại sơ đồ của học sinh** bằng `FlowDiagram` (chỉ xem) cạnh sơ đồ mẫu.
- Điều hướng lần nộp trước/sau của cùng học sinh với cùng câu; hiện số lần thử.
- Với các bài làm cũ (trước khi có `submissions`) chỉ có dòng `attempts`: hiển thị thông báo "Chưa có dữ liệu chi tiết cho bài làm này".

### UC4. Chấm lại / chỉnh điểm (P1)

**Đề thi, tự luận** (`POST /api/admin/exam-submissions/[id]/regrade`):

- Chế độ `ai`: gọi lại Gemini chấm đúng câu đó (prompt chấm tự luận hiện có), **không tính vào lượt của học sinh** (`judge_calls`), không giới hạn nhưng ghi `admin_actions`.
- Chế độ `manual`: nhập điểm (0 đến `score_weight` của câu) và nhận xét.
- Sau đó tính lại `total_score` bằng `computeExamTotal`, đặt `graded_by = 'manual'`, lưu `teacher_note` nếu có.

**Đề thi, đổi đáp án MCQ** (`POST /api/admin/exams/[id]/rescore`):

- Dùng khi admin vừa sửa `correct_answer` của một câu. Tham số `dryRun=true` trả về số bài nộp sẽ bị ảnh hưởng và số điểm thay đổi; `dryRun=false` mới tính lại và lưu.
- Giao diện: sau khi lưu chỉnh sửa đề, nếu đề đã có bài nộp thì hiện hộp thoại "Đề đã có N bài nộp. Chấm lại?".
- Giữ nguyên điểm tự luận đã chấm tay (`graded_by = 'manual'` không bị AI ghi đè).

**Luyện tập** (`POST /api/admin/algo-submissions/[id]/override`) với `{ correct: boolean, note?: string, addToAccepted?: string }`:

- Sai → Đúng: tạo/cập nhật dòng `attempts` với điểm của chế độ (nếu câu đó chưa có điểm), `source = 'manual'`.
- Đúng → Sai: đặt `points = 0` cho dòng `attempts` (giữ dòng để không cho cộng điểm lại), `source = 'manual'`.
- `addToAccepted` (chỉ `dien_khuyet`): thêm chuỗi vào `accepted` của đúng ô trong `questions.data`, sau khi chuẩn hóa và loại trùng.
- Bảng xếp hạng cập nhật tự động vì được suy ra từ `attempts`.

### UC5. Cho làm lại (P1)

- **Đề thi** (`POST /api/admin/exam-submissions/[id]/reset`): trước khi xóa, lưu **toàn bộ bản sao** `exam_submissions` (và `exam_starts`) vào `admin_actions.target`; sau đó xóa dòng `exam_submissions` và `exam_starts` để học sinh làm lại từ đầu.
- **Luyện tập** (`POST /api/admin/attempts/reset` với `{ studentId, questionId }`): xóa dòng `attempts` của câu đó để học sinh được tính điểm lại. Không xóa `submissions` (giữ lịch sử).
- Luôn xác nhận bằng hộp thoại nêu rõ hệ quả.

### UC6. Hồ sơ học sinh (P1)

Trang `/admin/students/[id]`: tổng điểm luyện tập và hạng (toàn bộ, trong lớp); tiến độ theo chế độ và theo cấu trúc (tuần tự/rẽ nhánh/lặp: số câu đúng trên tổng câu đã duyệt); danh sách đề thi với điểm từng đề (đề chưa nộp hiển thị "Chưa làm"); lịch sử bài làm gần đây; câu sai nhiều nhất; lần hoạt động cuối. Các nút: sửa tên/lớp, gộp, xóa (UC7).

### UC7. Quản lý tài khoản học sinh (P1)

- **Sửa tên/lớp:** `PATCH /api/admin/students/[id]`, đổi `name`, `class`. Cập nhật luôn `exam_submissions.student_name`. Nếu `id` chuẩn hóa mới trùng một tài khoản khác thì từ chối và gợi ý dùng gộp.
- **Gộp:** `POST /api/admin/students/merge` với `{ fromId, toId, dryRun }`. Chuyển `submissions`, `attempts`, `judge_calls`, `exam_submissions`, `exam_starts` từ tài khoản nguồn sang đích. Xử lý xung đột: `attempts` cùng câu thì giữ dòng điểm cao hơn; `exam_submissions` cùng đề thì **dừng và yêu cầu giáo viên chọn bài giữ lại**; `exam_starts` giữ thời điểm sớm hơn. Màn xem trước (dryRun) cho thấy số dòng sẽ chuyển và xung đột. Sau khi gộp xóa tài khoản nguồn. Làm trong **một transaction** (dùng hàm SQL/RPC nếu cần).
- **Xóa:** `DELETE /api/admin/students/[id]`, yêu cầu gõ lại tên học sinh để xác nhận; xóa kéo theo dữ liệu liên quan (kiểm tra `on delete cascade` ở mọi bảng, bổ sung nếu thiếu). Lưu bản tóm tắt vào `admin_actions`.

### UC8. Xuất báo cáo CSV (P1)

`GET /api/admin/reports/export?type=summary|detail&class=&from=&to=`:

- `summary`: mỗi hàng một học sinh: tên, lớp, điểm luyện tập theo từng chế độ, tổng điểm luyện tập, điểm từng đề thi (mỗi đề một cột), lần hoạt động cuối.
- `detail`: mỗi hàng một lần nộp (từ `admin_submissions_view`).
- UTF-8 **có BOM**, dấu phân cách dấu phẩy, escape đúng dấu ngoặc kép và xuống dòng. Trả về dạng tải file (`Content-Disposition`).

### UC9. Thống kê một đề thi (P2)

`/admin/exams/[id]/stats`: số bài nộp trên số học sinh có thể làm, điểm trung bình / cao nhất / thấp nhất, phân bố điểm (biểu đồ cột đơn giản bằng SVG/CSS, không thêm thư viện nặng), **tỉ lệ đúng từng câu MCQ** (đánh dấu câu < 20% đúng là "đáng nghi đáp án sai"), điểm trung bình từng câu tự luận, danh sách học sinh chưa nộp.

### UC10. Phân tích câu luyện tập (P2)

`/admin/questions/[id]/stats`: tỉ lệ đúng, số lần thử trung bình, **ô nào sai nhiều nhất**, các đáp án sai phổ biến ở `dien_khuyet` (nhóm theo chuỗi chuẩn hóa, top 10) kèm nút "Chấp nhận cách viết này".

### UC11. Thống kê theo lớp và tổng quan (P2)

`/admin`: số học sinh, lượt nộp hôm nay và 7 ngày, tỉ lệ đúng chung, 5 câu khó nhất, số đề đã nộp, số lần Gemini được gọi hôm nay (từ `judge_calls`). `/admin/classes/[class]`: điểm trung bình, học sinh chưa làm gì, phân bố điểm, tiến độ theo cấu trúc.

### UC12. Nhật ký thao tác (P2)

Danh sách `admin_actions` theo thời gian, lọc theo loại thao tác, xem JSON `target`. Chỉ đọc, không cho sửa/xóa.

### UC13. Cảnh báo bất thường (P3)

Đánh dấu (chỉ hiển thị, không tự chặn): nộp đề quá nhanh (`duration_sec` rất nhỏ so với `time_limit`), `is_late = true`, nhiều lần nộp liên tiếp sai trong thời gian ngắn, nhiều lượt gọi Gemini bất thường. Hiện ở dashboard và cột "Cảnh báo" của UC1.

## 6. Cấu trúc route và API

Trang (tách khỏi `page.tsx` lớn hiện tại; tab "Học sinh" và "Bài làm" cũ **trỏ sang** các trang mới, không xóa đột ngột):

```
/admin/submissions                UC1
/admin/submissions/exam/[id]      UC2 + UC4 + UC5
/admin/submissions/algo/[id]      UC3 + UC4 + UC5
/admin/students                   danh sách học sinh
/admin/students/[id]              UC6 + UC7
/admin/exams/[id]/stats           UC9
/admin/questions/[id]/stats       UC10
/admin/classes/[class]            UC11
/admin/reports                    UC8
/admin/logs                       UC12
```

API (đều dưới `/api/admin/`, kiểm tra cookie admin, validate input bằng zod):

```
GET    submissions?kind=&class=&q=&examId=&questionId=&mode=&correct=&status=&from=&to=&page=&pageSize=
GET    submissions/algo/[id]            GET submissions/exam/[id]
POST   exam-submissions/[id]/regrade    POST exam-submissions/[id]/reset
POST   exams/[id]/rescore               GET  exams/[id]/stats
POST   algo-submissions/[id]/override   POST attempts/reset
GET    questions/[id]/stats
GET    students   GET students/[id]   PATCH students/[id]   DELETE students/[id]   POST students/merge
GET    reports/export                   GET logs
```

Giữ tương thích với `GET /api/admin/students` và `GET /api/admin/submissions` đang có (mở rộng tham số, không phá cách gọi cũ trừ khi cập nhật luôn nơi gọi).

## 7. Yêu cầu giao diện

- Desktop là chính, nhưng **bảng cuộn ngang được trên điện thoại** (giáo viên có thể xem nhanh bằng điện thoại). Chi tiết bài làm hiển thị tốt ở màn hình hẹp.
- Dùng lại style/component hiện có của trang admin để nhất quán; không thêm thư viện UI mới trừ khi thật cần.
- Trạng thái loading (skeleton), lỗi, rỗng cho mọi bảng. Thông báo thành công/thất bại (toast) sau mỗi thao tác.
- Mọi hành động thay đổi dữ liệu có hộp thoại xác nhận nêu rõ hệ quả (số bài nộp bị ảnh hưởng, điểm sẽ đổi thế nào).
- Hiển thị thời gian theo múi giờ `Asia/Ho_Chi_Minh`.

## 8. Bảo mật và toàn vẹn dữ liệu

- Mọi truy vấn Supabase chỉ ở server (`import 'server-only'`); không đưa dữ liệu học sinh vào biến `NEXT_PUBLIC_*`.
- Validate toàn bộ input (id, tham số lọc, phân trang giới hạn `pageSize ≤ 100`) bằng zod; dùng truy vấn tham số hóa, không nối chuỗi SQL.
- Thao tác nhiều bước (gộp tài khoản, reset đề thi, rescore hàng loạt) phải **atomic** (transaction hoặc RPC), nếu lỗi thì không để dữ liệu nửa chừng.
- Không bao giờ gửi đáp án/`correct_answer` ra các API học sinh; các API admin mới không được lộ ra đường học sinh.
- Chống XSS: nội dung học sinh nhập (tự luận, tên) chỉ render dạng text, không `dangerouslySetInnerHTML`.
- Prompt chấm lại bằng AI coi bài làm học sinh là **dữ liệu**, không phải chỉ dẫn (giữ nguyên cách đã làm ở prompt chấm hiện có).

## 9. Kiểm thử (vitest)

Thêm test cho:

- `computeExamTotal` (MCQ đúng/sai, tự luận có/không điểm, `scoreWeight` và `maxScore`, làm tròn).
- Logic override luyện tập: sai→đúng, đúng→sai, câu đã có điểm, `addToAccepted` (chuẩn hóa, loại trùng).
- Logic gộp tài khoản (hàm thuần tách riêng): chuyển dữ liệu, xung đột `attempts`, xung đột `exam_submissions`, `dryRun`.
- Chuẩn hóa tìm kiếm tên không dấu.
- Hàm sinh CSV: BOM, escape ngoặc kép, dấu phẩy, xuống dòng, tiếng Việt.
- Tính `is_late` và `duration_sec`.
- Zod schema của các tham số lọc/phân trang.

## 10. Việc người dùng phải tự làm (liệt kê trong README)

1. Chạy file migration trong Supabase SQL Editor (sau khi đã đối chiếu kiểu dữ liệu).
2. Triển khai lại lên Vercel.
3. Lưu ý: bài làm luyện tập **trước thời điểm có `submissions`** sẽ không có dữ liệu chi tiết.

## 11. Kế hoạch theo giai đoạn

**Giai đoạn 1 – Nền tảng dữ liệu:** khảo sát code (mục 2) và ghi Findings; migration (mục 3); ghi `submissions` ở route luyện tập; `exam_starts`, `duration_sec`, `is_late` ở đề thi; tách `computeExamTotal`; `logAdminAction`. Test.

**Giai đoạn 2 – Xem dữ liệu:** UC1 (danh sách hợp nhất + bộ lọc + phân trang server), UC2, UC3, UC6; trang `/admin/students` và `/admin/students/[id]`; tab cũ trỏ sang trang mới. Test tìm kiếm và API danh sách.

**Giai đoạn 3 – Thao tác quản trị:** UC4 (regrade AI/tay, rescore đề, override luyện tập, `addToAccepted`), UC5 (reset đề thi và luyện tập), UC7 (sửa/gộp/xóa với dryRun và transaction), UC8 (CSV). Test các logic nêu ở mục 9.

**Giai đoạn 4 – Thống kê và hoàn thiện:** UC9, UC10, UC11, UC12, UC13; rà soát responsive, trạng thái loading/lỗi/rỗng, cập nhật `docs/admin-submissions.md` và `README.md`.

## 12. Tiêu chí hoàn thành

- Giáo viên xem được **mọi** bài làm (luyện tập và đề thi) trong một danh sách có lọc, tìm theo tên không dấu, phân trang ở server.
- Mở chi tiết thấy được học sinh làm gì so với đáp án; chế độ Tự do vẽ lại được sơ đồ của học sinh.
- Chấm lại tự luận (AI hoặc tay), chấm lại đề sau khi sửa đáp án, đổi Đúng/Sai bài luyện tập đều cập nhật điểm đúng, bảng xếp hạng cập nhật theo.
- Cho làm lại được cả đề thi và câu luyện tập, có lưu bản sao trong `admin_actions`.
- Gộp tài khoản trùng an toàn (xem trước, xử lý xung đột, atomic).
- Xuất CSV mở được trong Excel đúng tiếng Việt.
- Không rò rỉ đáp án hay khóa bí mật phía client; `npm run lint`, `build`, `test` đều qua.

Khi xong, tóm tắt: những gì đã làm, các quyết định đơn giản hóa, những chỗ code thực tế khác với tài liệu, và **danh sách việc người dùng cần tự làm**.
