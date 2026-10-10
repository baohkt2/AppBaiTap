# Findings – Admin submissions

## 1) Cấu trúc dữ liệu thực tế hiện có

- `exam_submissions.answers` đang lưu `jsonb` với dạng `{ [questionId]: answerValue }`.
- Điểm và nhận xét từng câu không được lưu trực tiếp trong `exam_submissions`; trong route chấm đề thì code tính tổng ở server và trả về `gradedQuestions`, nhưng `exam_submissions` chỉ lưu `answers`, `total_score`, `status` và `created_at`.
- `status` hiện dùng: `submitted`, `graded`.
- `id` của `exam_submissions` là `bigserial` (tự tăng), `exam_id` là `text`, `total_score` là `numeric`.

## 2) Route chấm đề và route luyện tập

- Route luyện tập và route đề thi đều đi qua `src/app/api/questions/[id]/submit/route.ts` theo nhánh dựa trên `loadExamById(db, questionId)`.
- Nếu `loadExamById` tìm thấy đánh dấu là đề thi mới (`exams` table), hệ thống chạy nhánh `exam` và tính điểm ở server.
- Nếu không có đề thi mới thì hệ thống chạy nhánh `questions` cũ, tính điểm luyện tập và ghi vào `attempts`.
- Không có bảng `submissions` ở thời điểm khảo sát ban đầu; đây là điểm cần bổ sung theo kế hoạch.

## 3) Xác thực admin

- Admin session được lưu bằng cookie `admin_session` trong `src/lib/session.ts`.
- `verifyAdminSession()` gọi `jwtVerify` trên cookie, check `payload.admin === true`.
- Tất cả API ở `/api/admin/*` đang gọi `verifyAdminSession()` trước khi xử lý.

## 4) Tab học sinh và bài làm hiện có

- `src/app/admin/page.tsx` đã có `StudentTab` và `SubmissionTab`.
- `StudentTab` gọi `GET /api/admin/students?q=...`.
- `SubmissionTab` gọi `GET /api/admin/submissions` và `GET /api/admin/submissions?id=...`.
- Hiện tại UI chỉ hiển thị danh sách bài làm đề thi và xem chi tiết theo từng đề; chưa có lọc theo loại bài làm hoặc phân trang ở server như kế hoạch.

## 5) Hàm tính điểm đề thi hiện có

- Mục tiêu logic được tích hợp trực tiếp ở `src/app/api/questions/[id]/submit/route.ts`.
- Nó duyệt qua `exam.questions`, cộng điểm MCQ đúng, gọi Gemini cho essay, rồi scale về `exam.maxScore`.
- Chức năng này chưa được tách thành helper dùng chung. Đây là lý do cần tạo `src/lib/exam-score.ts` theo kế hoạch.

## 6) Kết luận ngắn

Code hiện tại đã có khung quản lý học sinh và bài làm ở mức cơ bản, nhưng chưa sẵn sàng cho việc quản trị nâng cao theo kế hoạch. Phần dữ liệu lịch sử bài luyện tập và nhật ký admin cần được bổ sung bằng migration, và logic tính điểm nên được đưa vào helper dùng chung để tái sử dụng cho chấm lại / rescore.
