# Tài liệu hệ thống – App Bài Tập / Hệ thống Thi & Ôn tập Tin học 6

## 1. Tổng quan

Hệ thống là một ứng dụng Next.js dùng để:
- cho học sinh đăng nhập bằng tên + lớp,
- làm các bài luyện tập sơ đồ khối theo các mode `sap_xep`, `dien_khuyet`, `tu_do`,
- xem bảng xếp hạng,
- làm đề thi AI sinh theo tài liệu nguồn,
- xem kết quả, chấm tự luận bằng Gemini,
- quản trị đề thi, học sinh và bài làm ở trang admin.

Đây là dự án hướng tới học sinh lớp 6, môn Tin học, bài 16 "Các cấu trúc điều khiển".

## 2. Công nghệ sử dụng

- Frontend: Next.js 16 + App Router + TypeScript
- UI: React, Tailwind CSS, Framer Motion
- Backend: Next.js Route Handlers
- Database: Supabase Postgres
- Auth/session: cookie + JWT/jose
- AI: Google Gemini via `@google/genai`
- Validation: Zod
- Testing: Vitest
- Parsing: `mammoth`, `pdf-parse`

## 3. Kiến trúc ứng dụng

### 3.1 Cấu trúc thư mục chính

- `src/app/` — routes, pages, API server handlers
- `src/components/` — UI components chung
- `src/lib/` — business logic, schema, validation, config, prompt, grading
- `src/__tests__/` — unit tests
- `supabase/schema.sql` — schema database
- `data/seed-questions.json` — dữ liệu seed mẫu
- `scripts/seed.ts` — script seed dữ liệu
- `public/` — asset tĩnh

### 3.2 Luồng người dùng chính

1. Học sinh vào `/`
   - nhập tên + lớp
   - đăng nhập, lưu session cookie
2. Học sinh vào `/learn`
   - xem bài học, ôn tập, xếp hạng
3. Học sinh làm bài ở `/learn/practice/[mode]/[id]`
   - chấm điểm trên server
4. Học sinh làm đề thi ở `/learn/exams/[id]`
   - trả lời MCQ + tự luận, nộp bài
   - có thể hiển thị đáp án sau khi nộp nếu đề bật cờ tương ứng
5. Admin vào `/admin`
   - sinh đề từ file/text,
   - quản lý đề thi,
   - sửa đề trực tiếp,
   - quản lý học sinh và bài làm

## 4. Chức năng chính

### 4.1 Học sinh

- Đăng nhập bằng tên và lớp
- Xem tổng điểm cá nhân
- Làm bài luyện tập theo 3 mode:
  - `sap_xep`
  - `dien_khuyet`
  - `tu_do`
- Xem bảng xếp hạng theo toàn trường hoặc theo lớp
- Làm đề thi theo danh sách đề đã được xuất bản
- Nộp bài và xem kết quả

### 4.2 Admin

- Sinh đề thi từ văn bản hoặc file upload
- Tạo đề theo cấu hình số lượng câu, tỉ lệ trắc nghiệm, độ khó
- Duyệt / gỡ duyệt / xóa đề thi
- Chỉnh sửa trực tiếp nội dung đề thi: tiêu đề, mô tả, thời gian, điểm, câu hỏi, đáp án, lời giải
- Xuất bản / gỡ xuất bản đề thi
- Quản lý học sinh
- Quản lý bài làm học sinh
- Học sinh làm đề thi theo cờ `showAnswersAfterSubmit`

## 5. Mô hình dữ liệu

### 5.1 Bảng `students`

Lưu thông tin học sinh:
- `id`: khóa chính, chuẩn hóa theo tên + lớp
- `name`
- `class`
- `created_at`

### 5.2 Bảng `questions`

Lưu câu hỏi luyện tập cũ / legacy:
- `id`
- `lesson`
- `mode`
- `type`
- `data`
- `status`
- `created_at`

### 5.3 Bảng `attempts`

Lưu tiến độ / điểm:
- `student_id`
- `question_id`
- `correct`
- `points`
- `created_at`
- primary key: `(student_id, question_id)`

### 5.4 Bảng `judge_calls`

Dùng để giới hạn lượt chấm AI:
- `student_id`
- `question_id`
- `created_at`

### 5.5 Bảng `exams`

Lưu thông tin đề thi dạng mới:
- `id`
- `title`
- `description`
- `time_limit`
- `max_score`
- `show_answers_after_submit`
- `status`
- `created_at`

### 5.6 Bảng `exam_questions`

Lưu từng câu hỏi của đề thi:
- `id`
- `exam_id`
- `type` (`mcq` hoặc `essay`)
- `difficulty`
- `content`
- `options`
- `correct_answer`
- `explanation`
- `score_weight`
- `order_index`

### 5.7 Bảng `exam_submissions`

Lưu bài nộp của học sinh cho mỗi đề:
- `id`
- `exam_id`
- `student_id`
- `student_name`
- `answers`
- `total_score`
- `status`
- `created_at`
- unique: `(exam_id, student_id)`

## 6. Session & auth

- Session học sinh được lưu bằng cookie httpOnly
- `getStudentId()` đọc cookie từ server
- Không tin dữ liệu client gửi lên, mọi API xác thực server-side
- Mỗi học sinh có `studentId` định danh duy nhất

### 6.1 Đăng nhập

- Route: `src/app/api/auth/login/route.ts`
- Xử lý tối thiểu:
  - validate tên và lớp
  - chuẩn hóa id
  - upsert vào `students`
  - tạo cookie

### 6.2 Đăng xuất

- Route: `src/app/api/auth/logout/route.ts`
- Xóa cookie session

### 6.3 Thông tin hiện tại

- Route: `src/app/api/me/route.ts`
- Trả về thông tin học sinh đang đăng nhập

## 7. Các mode luyện tập

### 7.1 `sap_xep`

- Bài có sẵn sơ đồ khối và các thẻ nội dung
- Học sinh kéo card đúng vị trí
- Điểm: `1`
- Mục tiêu: sắp xếp đúng thứ tự các bước logic

### 7.2 `dien_khuyet`

- Sơ đồ có ô trống
- Học sinh nhập câu trả lời ngắn
- Kết quả chấm dựa trên chuẩn hóa câu trả lời + AI judge nếu cần
- Điểm: `3`

### 7.3 `tu_do`

- Học sinh tự vẽ sơ đồ khối theo đề bài
- Có validation cấu trúc sơ đồ
- Nếu hợp lệ mới gọi AI judge
- Điểm: `10`

## 8. Đề thi AI

### 8.1 Mục tiêu

Hệ thống có thể sinh đề thi từ tài liệu text, PDF hoặc Word.

### 8.2 Workflow

1. Admin upload file hoặc dán text
2. Route `/api/admin/exams/generate` đọc tài liệu
3. Gọi Gemini với prompt chuyên biệt
4. Validate output bằng `examSchema`
5. Lưu vào bảng `exams` + `exam_questions`
6. Admin xem danh sách đề và chỉnh sửa trực tiếp nếu cần

### 8.3 Đề thi có cờ hiển thị đáp án sau nộp

- Field: `showAnswersAfterSubmit`
- Mặc định: `false`
- Khi bật, học sinh sau khi nộp mới thấy đáp án + giải thích
- Khi tắt, học sinh chỉ thấy điểm và phản hồi chung, không lộ đáp án

## 9. Chấm điểm / grading

### 9.1 Luyện tập

- `src/lib/grading.ts` xử lý logic chấm cho `sap_xep` và `dien_khuyet`
- `src/lib/judge.ts` xử lý judge AI cho các trường hợp cần đánh giá mềm
- Có kiểm soát số lượt gọi Gemini theo học sinh và theo câu

### 9.2 Đề thi / tự luận

- `src/app/api/questions/[id]/submit/route.ts` là route chấm đề thi
- Với câu MCQ: chấm đúng / sai theo đáp án
- Với câu essay:
  - nếu rỗng: báo "Bạn chưa làm câu này."
  - nếu có nội dung: gửi lên Gemini để chấm điểm
  - nếu AI không trả về kết quả phù hợp: fallback xử lý lỗi rõ ràng

### 9.3 Đánh giá đáp án tự luận

- AI được yêu cầu trả về định dạng JSON với `results` gồm:
  - `id`
  - `score`
  - `feedback`
- Tính điểm cuối cùng theo `scoreWeight` và `maxScore` của đề

## 10. API chính

### 10.1 Student APIs

- `GET /api/me` — thông tin tài khoản
- `GET /api/questions?mode=...` — danh sách câu hỏi / đề thi
- `GET /api/questions/[id]` — lấy câu hỏi hoặc đề thi đã mask
- `POST /api/questions/[id]/submit` — nộp bài
- `GET /api/leaderboard` — bảng xếp hạng

### 10.2 Admin APIs

- `GET /api/admin/auth` — kiểm tra trạng thái admin
- `POST /api/admin/auth` — đăng nhập admin
- `GET /api/admin/questions` — xem danh sách câu hỏi theo status
- `PATCH /api/admin/questions` — duyệt, gỡ duyệt, xóa, cập nhật JSON
- `GET /api/admin/exams` — danh sách hoặc chi tiết đề thi
- `PATCH /api/admin/exams` — publish/unpublish/update/delete
- `POST /api/admin/exams/generate` — sinh đề từ file/text
- `GET /api/admin/students` — danh sách học sinh
- `GET /api/admin/submissions` — danh sách bài làm

## 11. Trang admin

Trang admin được xây dựng ở [src/app/admin/page.tsx](../src/app/admin/page.tsx) và có các tab:
- Sinh câu hỏi
- Chờ duyệt
- Đã duyệt
- Đề Thi (AI)
- Học sinh
- Bài làm

### 11.1 Tab đề thi AI

Có các chức năng:
- chọn source mode: upload file hoặc paste text
- cấu hình số lượng câu, tỉ lệ MCQ, độ khó
- sinh đề thi bằng AI
- xem danh sách đề thi
- chọn đề và xem chi tiết
- chỉnh sửa trực tiếp từng câu hỏi
- bật/tắt hiển thị đáp án sau khi nộp
- publish/unpublish/delete

## 12. Prompt AI và validation

### 12.1 `src/lib/prompts.ts`

Chứa prompt cho:
- sinh câu luyện tập
- judge sơ đồ `dien_khuyet`
- judge sơ đồ `tu_do`
- sinh đề thi AI

### 12.2 Quy tắc quan trọng

- Không nhắc đến nguồn tài liệu trong output đề thi
- Nội dung xuất ra phải là JSON hợp lệ
- Không để meta-language như "theo tài liệu" xuất hiện
- Dữ liệu trả về được sanitize trước khi lưu

## 13. Màn hình học sinh chính

### 13.1 `/learn`

- Hiển thị layout chung
- Tab bài học / ôn tập / bảng xếp hạng
- Học sinh có thể vào lại các bài cũ đã làm

### 13.2 `/learn/exams/[id]`

- Hiển thị đề thi
- Timer đếm ngược
- Tự động submit khi hết giờ
- Chấm điểm và trả kết quả
- Có thể ẩn/hiện đáp án tùy theo đề

## 14. Testing

Các test quan trọng nằm trong `src/__tests__/`:
- `grading.test.ts`
- `masking.test.ts`
- `normalize.test.ts`
- `seed.test.ts`
- `validate.test.ts`

Mục tiêu:
- validate flowchart
- chuẩn hóa dữ liệu học sinh
- chấm điểm
- seed dữ liệu ban đầu

## 15. Hướng dẫn chạy dự án

### 15.1 Cài đặt

```bash
npm install
```

### 15.2 Chạy dev

```bash
npm run dev
```

### 15.3 Build production

```bash
npm run build
```

### 15.4 Chạy test

```bash
npm test
```

## 16. Biến môi trường cần chuẩn bị

Theo thực tế project hiện tại, cần có:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `NEXT_PUBLIC_LESSON_DOC_URL` (nếu cần embed tài liệu học)

## 17. Lưu ý triển khai

- Tất cả API xử lý Gemini đều đặt `export const maxDuration = 60` khi cần dùng serverless runtime
- Không lưu secret trong biến `NEXT_PUBLIC_*`
- Không overloading dữ liệu luyện tập vào bảng đề thi cũ nếu đã có hệ thống đề thi riêng
- Hệ thống ưu tiên dùng `exams` + `exam_questions` cho đề thi mới

## 18. Kết luận

Hệ thống này là một nền tảng học tập và kiểm tra AI-assisted cho môn Tin học lớp 6 với các đặc điểm sau:
- học sinh làm bài luyện tập và thi trực tuyến,
- AI sinh đề từ tài liệu,
- chấm điểm tự động và có kiểm soát lượt judge,
- admin quản trị toàn bộ nội dung và học sinh,
- hệ thống đề thi có tính linh hoạt cao và có cờ kiểm soát việc lộ đáp án sau khi nộp.

Đây là một hệ thống đủ lớn để vận hành như một sản phẩm học tập trực tuyến, nhưng vẫn giữ được cấu trúc code rõ ràng và dễ mở rộng.
