
# PROMPT BUILD: Admin Dashboard (trang tổng quan) – Web tự học Tin học 6

## 0. Cách làm việc (đọc trước)

Bạn là senior full-stack engineer, làm việc trên **dự án Next.js đã chạy được**. Nhiệm vụ: xây **dashboard tổng quan** cho giáo viên tại `/admin`, giúp trả lời nhanh các câu hỏi: *Lớp đang học thế nào? Ai cần nhắc? Câu nào quá khó? Đề thi ra sao? Quota Gemini còn không?*

- **Tái sử dụng** những gì đã có: helper xác thực admin, style/component trang admin, `FlowDiagram`, các hàm chuẩn hóa, schema zod. Không viết lại.
- Làm **theo giai đoạn** ở mục 9. Sau mỗi giai đoạn chạy `npm run lint`, `npm run build`, `npm test`, sửa hết lỗi rồi mới sang giai đoạn tiếp.
- Không thêm tính năng ngoài phạm vi. Chỗ nào mơ hồ thì chọn phương án **đơn giản nhất** và ghi lại trong `README.md`.
- Giao diện tiếng Việt; comment và tên biến tiếng Anh.
- Tài liệu hệ thống: `HE_THONG_TAI_LIEU.md`. Nếu tài liệu mâu thuẫn với code thì **tin code**.

## 1. Bối cảnh và phụ thuộc dữ liệu

Bảng hiện có: `students`, `questions`, `attempts` (một dòng mỗi cặp học sinh-câu, chỉ ghi lần đúng đầu), `judge_calls`, `exams`, `exam_questions`, `exam_submissions`, view `leaderboard`.

Theo kế hoạch "quản lý bài làm" (prompt riêng) còn có các bảng: `submissions` (mọi lần nộp luyện tập), `exam_starts`, `admin_actions`, cột `duration_sec`/`is_late` của `exam_submissions`, và view `admin_submissions_view`.

**Việc đầu tiên:** kiểm tra trong `supabase/schema.sql` và code xem các bảng/cột nêu trên **đã tồn tại chưa**. Dashboard phải **chạy được cả khi chưa có** chúng, theo nguyên tắc suy giảm có kiểm soát:

| Widget                                                 | Cần                          | Nếu thiếu                                                                                                             |
| ------------------------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Lượt nộp, tỉ lệ đúng theo thời gian, câu khó | `submissions`               | Dùng`attempts` (chỉ lần đúng): ẩn tỉ lệ đúng/câu khó, hiện ghi chú "Cần bật ghi nhận mọi lần nộp" |
| Cảnh báo nộp muộn/nộp nhanh                       | `duration_sec`, `is_late` | Ẩn widget cảnh báo                                                                                                   |
| Nhật ký Gemini mở rộng                             | `admin_actions`             | Chỉ đếm`judge_calls`                                                                                               |

Đặt cờ phát hiện tính năng (feature detection) ở **một chỗ** (`src/lib/admin/capabilities.ts`), cache kết quả, dùng cho cả API và UI.

## 2. Mục tiêu

Một trang `/admin` (tab "Tổng quan" là mặc định khi vào admin) hiển thị trên **một màn hình** các chỉ số chính, mọi thứ có thể bấm để **đi sâu** sang trang chi tiết (danh sách bài làm, hồ sơ học sinh, thống kê đề...) với bộ lọc đã gán sẵn. Tải nhanh (một request tổng hợp), dùng được trên điện thoại.

## 3. Bố cục và các widget

Bộ lọc toàn trang (đặt trên cùng, lưu trong **URL search params** để chia sẻ/tải lại được):

- **Khoảng thời gian:** Hôm nay / 7 ngày (mặc định) / 30 ngày / Tất cả. Mốc ngày tính theo múi giờ **`Asia/Ho_Chi_Minh`**.
- **Lớp:** Tất cả hoặc một lớp cụ thể (danh sách lớp lấy từ `students`).
- Nút **Làm mới**; hiển thị "Cập nhật lúc HH:mm".

### 3.1 Thẻ chỉ số (KPI), mỗi thẻ có giá trị và **so với kỳ trước cùng độ dài** (▲/▼ %)

1. **Học sinh hoạt động:** số học sinh có ít nhất một lượt nộp (luyện tập hoặc đề thi) trong kỳ / tổng số học sinh (của lớp đang lọc).
2. **Lượt luyện tập:** số lượt nộp, kèm **tỉ lệ đúng** (%).
3. **Bài thi đã nộp:** số bài nộp, kèm **điểm trung bình** quy về % điểm tối đa của từng đề.
4. **Câu chờ duyệt:** số câu `questions.status = 'pending'` (không phụ thuộc bộ lọc thời gian), bấm vào mở tab "Chờ duyệt".
5. **Lượt gọi Gemini hôm nay:** từ `judge_calls` (+ `admin_actions` loại chấm lại bằng AI nếu có); nếu đặt biến tùy chọn `GEMINI_DAILY_LIMIT` thì hiện thanh tiến độ và đổi màu khi > 80%. Ghi chú nhỏ "ước lượng".

### 3.2 Biểu đồ

- **Hoạt động theo ngày:** cột chồng hai màu (luyện tập / đề thi) cho từng ngày trong kỳ. **Điền 0 cho ngày không có dữ liệu** để trục thời gian liên tục. Với "Hôm nay" hiển thị theo giờ.
- **Tỉ lệ đúng theo chế độ và theo cấu trúc:** hai nhóm thanh ngang: `sap_xep` / `dien_khuyet` / `tu_do` và `tuan_tu` / `re_nhanh` / `lap`, kèm số lượt nộp. Cho thấy học sinh yếu phần nào.
- **Phân bố tổng điểm luyện tập:** histogram theo khoảng điểm (0, 1–10, 11–30, 31–60, 61+; hằng số cấu hình được) cho các học sinh trong lớp đang lọc.
- **Điểm trung bình theo đề thi:** thanh ngang mỗi đề (% điểm tối đa) kèm số bài nộp; bấm vào mở trang thống kê của đề (hoặc danh sách bài làm lọc theo đề nếu trang thống kê chưa có).

### 3.3 Bảng và danh sách (mỗi bảng tối đa 5–10 dòng, có link "Xem tất cả")

- **Top 5 học sinh** (bảng xếp hạng nhanh: họ tên đầy đủ, lớp, điểm), lấy từ `leaderboard`.
- **Câu luyện tập khó nhất:** top 5 có tỉ lệ đúng thấp nhất với **tối thiểu 5 lượt nộp** (hằng số cấu hình), cột: tiêu đề, chế độ, cấu trúc, tỉ lệ đúng, số lượt. Bấm mở thống kê/chi tiết câu.
- **Học sinh cần nhắc:** học sinh **chưa có lượt nộp nào trong N ngày** (mặc định N = 7, hằng số) hoặc chưa làm gì từ đầu; cột: họ tên, lớp, lần hoạt động cuối ("Chưa từng làm" nếu không có). Bấm mở hồ sơ học sinh.
- **So sánh các lớp** (chỉ hiện khi bộ lọc lớp là "Tất cả"): mỗi lớp một dòng: số học sinh, số hoạt động, điểm luyện tập trung bình, số bài thi nộp, điểm thi trung bình.
- **Hoạt động gần đây:** 10 lượt nộp mới nhất (cả luyện tập và đề thi): thời gian tương đối ("5 phút trước"), học sinh, lớp, tên đề/câu, kết quả/điểm. Bấm mở chi tiết.
- **Cảnh báo** (chỉ hiện khi có dữ liệu): số bài thi nộp muộn, số bài nộp quá nhanh (`duration_sec` < 10% `time_limit`), học sinh có số lần nộp sai liên tiếp bất thường. Mỗi mục bấm mở danh sách bài làm đã lọc. Chỉ để xem, không tự chặn.

### 3.4 Đi sâu (drill-down)

Mỗi số liệu/dòng bấm được đều dẫn tới trang đích **kèm tham số lọc** (ví dụ `/admin/submissions?kind=exam&examId=...&from=...&to=...`). Nếu trang đích chưa tồn tại, dẫn tới tab hiện có gần nhất và ghi chú `// TODO` kèm tham số dự kiến trong code, **không để link chết**.

## 4. Lớp dữ liệu

### 4.1 Một API tổng hợp

`GET /api/admin/dashboard?range=today|7d|30d|all&class=<lớp|all>&refresh=0|1`

- Kiểm tra cookie admin như các API admin khác.
- Trả về **một JSON** chứa mọi widget, định nghĩa bằng **zod** (`src/lib/admin/dashboard-schema.ts`), UI chỉ đọc theo schema này.
- Validate tham số bằng zod (`range` thuộc enum, `class` chuẩn hóa bằng hàm chuẩn hóa lớp sẵn có).
- Có kèm `meta`: `generatedAt`, `range`, `class`, `capabilities` (mục 1), `previousPeriod` (mốc từ-đến của kỳ trước).

### 4.2 Truy vấn: tổng hợp ở database, không ở JS

Viết migration **`supabase/migrations/<timestamp>_admin_dashboard.sql`** (và cập nhật `supabase/schema.sql`), **không tự chạy**, hướng dẫn người dùng dán vào Supabase SQL Editor. Gồm các **hàm SQL** (RPC) trả `jsonb` hoặc bảng, ví dụ:

```sql
-- Hoạt động theo ngày (luyện tập + đề thi), múi giờ Việt Nam
create or replace function dash_daily_activity(p_from timestamptz, p_to timestamptz, p_class text)
returns table(day date, algo_count int, exam_count int)
language sql stable as $$
  with algo as (
    select (sub.created_at at time zone 'Asia/Ho_Chi_Minh')::date d, count(*) c
    from submissions sub join students s on s.id = sub.student_id
    where sub.created_at >= p_from and sub.created_at < p_to
      and (p_class is null or s.class = p_class)
    group by 1),
  ex as (
    select (es.created_at at time zone 'Asia/Ho_Chi_Minh')::date d, count(*) c
    from exam_submissions es join students s on s.id = es.student_id
    where es.created_at >= p_from and es.created_at < p_to
      and (p_class is null or s.class = p_class)
    group by 1)
  select coalesce(algo.d, ex.d), coalesce(algo.c,0)::int, coalesce(ex.c,0)::int
  from algo full join ex on algo.d = ex.d order by 1;
$$;

-- Câu khó nhất (tối thiểu p_min lượt nộp)
create or replace function dash_hardest_questions(p_from timestamptz, p_to timestamptz,
                                                  p_class text, p_min int, p_limit int)
returns table(question_id text, title text, mode text, structure text, attempts int, correct_rate numeric)
language sql stable as $$
  select sub.question_id, coalesce(q.data->>'title', sub.question_id), sub.mode,
         q.type, count(*)::int, round(100.0 * avg((sub.correct)::int), 1)
  from submissions sub
  join students s on s.id = sub.student_id
  left join questions q on q.id = sub.question_id
  where sub.created_at >= p_from and sub.created_at < p_to
    and (p_class is null or s.class = p_class)
  group by sub.question_id, q.data->>'title', sub.mode, q.type
  having count(*) >= p_min
  order by 6 asc, 5 desc limit p_limit;
$$;
```

Các hàm còn lại tự viết tương tự: KPI (kỳ hiện tại và kỳ trước), tỉ lệ đúng theo chế độ/cấu trúc, phân bố điểm, điểm trung bình theo đề, so sánh lớp, học sinh cần nhắc, hoạt động gần đây, cảnh báo. **Điều chỉnh tên cột/kiểu dữ liệu cho khớp schema thật** (kiểu `id` của `exams`, tên cột điểm...). Chỉ `select`, không thay đổi dữ liệu. Đánh index cần thiết (`submissions(created_at)`, `exam_submissions(created_at)`) trong cùng migration.

Route handler gọi các RPC song song (`Promise.all`), ghép thành payload, rồi parse bằng zod trước khi trả.

### 4.3 Cache và hiệu năng (Supabase gói free)

- Cache kết quả theo khóa `(range, class)` trong **60 giây** (`unstable_cache` của Next.js hoặc bộ nhớ trong có TTL). `refresh=1` bỏ qua cache.
- Giới hạn kích thước: danh sách tối đa 10 dòng, biểu đồ theo ngày tối đa 90 điểm (khi `all` thì gộp theo tuần nếu dài hơn).
- Không tải toàn bộ bảng về JS để tính. Không gọi từ client trực tiếp tới Supabase.

## 5. Giao diện

Tạo thư mục `src/components/admin/dashboard/`:

- `DashboardFilters`, `KpiCard`, `StackedBarChart`, `HorizontalBars`, `Histogram`, `DataTable` nhỏ, `ActivityFeed`, `AlertsPanel`, `Skeleton` cho từng widget.
- **Biểu đồ tự vẽ bằng SVG/CSS** (không thêm thư viện biểu đồ nặng). Mỗi biểu đồ có `role="img"` + `aria-label` mô tả, và hiển thị giá trị số ở nhãn/tooltip (không chỉ dựa vào màu).
- Lưới **responsive**: điện thoại 1 cột (KPI xếp 2×), tablet 2 cột, desktop 3–4 cột. Bảng cuộn ngang được khi hẹp. Giáo viên có thể xem nhanh bằng điện thoại.
- Màu nhất quán theo bảng màu hiện có của trang admin, tương phản đủ, hỗ trợ `prefers-reduced-motion` (tắt hiệu ứng).
- Trạng thái: **loading** (skeleton từng widget), **lỗi** (thẻ lỗi + nút Thử lại, một widget lỗi không làm hỏng cả trang), **rỗng** ("Chưa có bài làm nào trong khoảng này").
- Số liệu so với kỳ trước: mũi tên ▲/▼ kèm %; khi kỳ trước = 0 thì hiện "mới", không chia cho 0. Dùng định dạng số Việt (`vi-VN`) và thời gian tương đối bằng tiếng Việt.
- Tự làm mới mỗi 60 giây **chỉ khi tab đang hiển thị** (`visibilitychange`), có thể tắt/bật.

## 6. Bảo mật

- Truy vấn Supabase và khóa chỉ ở server (`import 'server-only'`). Không đưa dữ liệu học sinh vào biến `NEXT_PUBLIC_*`.
- Mọi tham số được validate; chỉ dùng RPC/truy vấn tham số hóa, không nối chuỗi SQL.
- Không trả đáp án (`correct_answer`, `accepted`, sơ đồ mẫu) trong payload dashboard; chỉ số liệu tổng hợp và tiêu đề.
- API dashboard trả 401 khi không có cookie admin; UI chuyển về màn hình đăng nhập admin.
- Hiển thị tên học sinh dạng text (không `dangerouslySetInnerHTML`).

## 7. Kiểm thử (vitest)

Viết các hàm tính toán thuần vào `src/lib/admin/dashboard-utils.ts` và test:

- `resolveRange(range, now)`: mốc từ-đến và **kỳ trước cùng độ dài**, đúng theo múi giờ `Asia/Ho_Chi_Minh` (kiểm tra gần nửa đêm và đổi tháng).
- `fillMissingDays` (điền 0), gộp theo tuần khi quá dài.
- `percentChange(current, previous)` (kể cả previous = 0).
- `bucketScores` (phân bố điểm, biên các khoảng).
- Zod schema của payload (chấp nhận payload hợp lệ, từ chối thiếu trường), schema tham số API.
- Test route: 401 khi chưa đăng nhập; tham số sai bị từ chối.

## 8. Việc người dùng phải tự làm (ghi trong README)

1. Chạy file migration của dashboard trong Supabase SQL Editor (sau khi đối chiếu kiểu dữ liệu).
2. (Tùy chọn) đặt `GEMINI_DAILY_LIMIT` trong biến môi trường Vercel nếu muốn thanh tiến độ quota.
3. Triển khai lại lên Vercel.

## 9. Kế hoạch theo giai đoạn

**Giai đoạn 1 – Dữ liệu:** phát hiện tính năng (mục 1), migration và các hàm RPC (mục 4.2), `dashboard-utils.ts`, schema zod, `GET /api/admin/dashboard` kèm cache. Test mục 7. Kiểm tra API bằng dữ liệu seed.

**Giai đoạn 2 – Giao diện:** `DashboardFilters`, KPI, các biểu đồ, bảng, danh sách hoạt động, cảnh báo; loading/lỗi/rỗng; responsive.

**Giai đoạn 3 – Hoàn thiện:** bộ lọc lưu trong URL, drill-down kèm tham số lọc, tự làm mới, accessibility, cập nhật `README.md` và `docs`.

## 10. Tiêu chí hoàn thành

- `/admin` hiển thị đủ KPI, biểu đồ, bảng ở mục 3, tải bằng **một** request tổng hợp, có cache 60 giây.
- Đổi khoảng thời gian/lớp thì mọi widget cập nhật; bộ lọc nằm trong URL.
- Mọi số liệu bấm được dẫn tới đúng trang với bộ lọc tương ứng, không có link chết.
- Chạy được khi chưa có `submissions`/`exam_starts` (widget phụ thuộc ẩn có ghi chú rõ ràng, không lỗi).
- Mốc ngày theo giờ Việt Nam; không có lỗi chia cho 0.
- Dùng tốt trên điện thoại; không lộ đáp án hay khóa bí mật ở client.
- `npm run lint`, `build`, `test` đều qua.

Khi xong, tóm tắt: những gì đã làm, các quyết định đơn giản hóa, chỗ code thực tế khác tài liệu, và **danh sách việc người dùng cần tự làm**.
