# PROJECT MEMORY — SYNO (Persistent Engineering Context)

Nguồn tổng hợp: `docs/source/project-documents/SYNO_Master_AI_Engineering_Manual_Merged_Final.docx` (nội dung tương đương file PDF cùng thư mục).

## 1) DB URL status (quan trọng)

- `SUPABASE_URL` hiện tại hợp lệ và trỏ về project SYNO: `bimepdqcwpsynjimvenn`.
- `SUPABASE_DB_URL` local trong `backend/.env` đã được sửa sang Supabase pooler đúng project:
  - host: `aws-1-ap-southeast-1.pooler.supabase.com`
  - user dạng: `postgres.bimepdqcwpsynjimvenn`
  - database: `postgres`
- Direct host `db.bimepdqcwpsynjimvenn.supabase.co:5432` có thể IPv6-only từ Windows network hiện tại, nên local runtime ưu tiên pooler URL.
- `corepack pnpm --filter backend run check:production` ngày 2026-05-25 xác nhận DB URL đúng tenant và kết nối pg-boss được.

> Kết luận: không coi `SUPABASE_DB_URL` local là stale nữa. Nếu môi trường khác báo lỗi tenant/user, kiểm tra lại connection string trong `.env` của môi trường đó, không mở RLS/grant rộng để chữa cháy.

---

## 2) Project context (bắt buộc ghi nhớ)

- Tên hệ thống: **SYNO**.
- Mô hình: **Smart School SaaS Platform** (multi-school).
- Thành phần chính:
  - Web Admin (React, dashboard tab-based)
  - Parent App (Flutter, Android/iOS)
  - Supabase/PostgreSQL (data/auth/realtime/RLS)
  - Ronald Jack AI-X1 SDK service (attendance ingest qua terminal/service)
  - Firebase Cloud Messaging (push realtime)
  - Excel Import + API Integration
- Nguyên tắc cốt lõi multi-tenant: **mọi nghiệp vụ phải school-scoped (`school_id`)**.

---

## 3) Vai trò triển khai AI (theo manual)

- Senior Fullstack System Architect
- Senior Supabase Security Engineer
- QA Reviewer

Không được code kiểu demo/fake completion; mọi thay đổi phải có test evidence + regression check.

---

## 4) Core engineering rules (rút gọn)

1. Không code ngay trước khi audit module liên quan.
2. Không hardcode key/token/secret.
3. Không phá architecture hiện có.
4. Không tự ý đổi DB field/API shape/business logic.
5. Không nhồi backend/business logic vào UI.
6. Mọi task phải có tự test + regression check + báo cáo.

---

## 5) Supabase security baseline (ràng buộc cứng)

- Bảng nghiệp vụ phải có:
  - explicit GRANT
  - RLS enabled
  - POLICY rõ ràng
- Không dùng `service_role` ở frontend.
- Query nghiệp vụ phải filter `school_id`.
- Không disable RLS tạm thời để “chữa cháy”.
- Khi lỗi `42501`: kiểm tra **GRANT trước**, sau đó RLS/POLICY.

---

## 6) Architecture & state rules

- Modular architecture bắt buộc.
- Service layer tách khỏi UI.
- Realtime flow và notification flow tách độc lập.
- Shared types và env config phải centralized.
- Không tự đổi framework quản lý state nếu dự án đang dùng pattern khác.

---

## 7) API & data contract rules

- Không phá response shape hiện có.
- Error response an toàn, có code/message.
- Danh sách lớn cần pagination.
- Auth nghiệp vụ phải gắn user + `school_id`.
- Ưu tiên snake_case theo database; map sang UI model rõ ràng nếu cần.

---

## 8) Database baseline tables (đã xác minh)

Các bảng chính đang có trong Supabase:

- `announcements`
- `attendance_logs`
- `attendance_spam_logs`
- `chat_messages`
- `fee_notices`
- `grade_records`
- `grades`
- `hardware_scan_debounce`
- `student_fees`
- `students`
- `timetables`
- `user_profiles`

Lưu ý nghiệp vụ:
- `students` là bảng trung tâm.
- `user_profiles` là source quan trọng cho role + school mapping.
- Attendance flow phải tôn trọng debounce/spam logs.
- Cần audit tránh chồng chéo giữa `grades/grade_records`, `student_fees/fee_notices`.

---

## 9) Realtime attendance flow (chuẩn)

1. Ronald Jack AI-X1 scan
2. SDK attendance service nhận dữ liệu
3. Debounce layer chống trùng
4. Ghi `attendance_logs`
5. Resolve parent linkage
6. Gửi FCM
7. App phụ huynh cập nhật realtime
8. Ghi log/monitoring success-failure

---

## 10) Git / release / quality gates

- Không sửa trực tiếp main; làm theo branch/task.
- Commit nhỏ theo task (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- Không commit secret.
- Không deploy khi chưa có checklist env/build/test/secret.
- Definition of Done yêu cầu:
  - code chạy được
  - không phá chức năng cũ
  - đúng bảo mật/RLS/school_id
  - có test evidence
  - có report rủi ro/regression

---

## 11) Task execution workflow chuẩn (phải bám)

1. Read related modules
2. Analyze dependencies
3. Create implementation plan
4. Split micro tasks
5. Implement
6. Self-test
7. Regression check
8. Final report

---

## 12) Supabase policy updates cần ghi nhớ (May 2026)

### 12.1 Data API grants change (cực kỳ quan trọng)

Supabase thay đổi cơ chế expose Data API cho schema `public`:

- **May 30, 2026**: mặc định cho **new projects**
- **October 30, 2026**: enforced cho **all existing projects**

Ý nghĩa:
- Bảng mới tạo trong `public` **không tự động** truy cập được qua Data API.
- Muốn dùng `supabase-js`, PostgREST (`/rest/v1`), GraphQL (`/graphql/v1`) thì phải có **explicit GRANT**.

Checklist bắt buộc cho mọi migration tạo bảng mới:

```sql
grant select
  on public.your_table
  to anon;

grant select, insert, update, delete
  on public.your_table
  to authenticated;

grant select, insert, update, delete
  on public.your_table
  to service_role;

alter table public.your_table
  enable row level security;

create policy "users can read their own rows"
  on public.your_table
  for select to authenticated
  using (auth.uid() = user_id);
```

Quy tắc thực thi trong dự án này:
1. Mọi migration tạo table mới phải kèm GRANT + RLS + POLICY trong cùng PR.
2. Khi gặp lỗi `42501` từ PostgREST, ưu tiên kiểm tra thiếu GRANT trước.
3. Không merge migration nếu chưa test Data API với role mục tiêu (`anon`, `authenticated`, service path backend).

### 12.2 Ảnh hưởng trực tiếp tới SYNO

Dự án SYNO dùng Supabase Data API (supabase-js) ở Web/App/backend service, nên **thuộc nhóm bị ảnh hưởng**.
Do đó:
- Template migration nội bộ phải chuẩn hóa theo luật mới ngay từ bây giờ.
- Review checklist phải có mục “Data API grants verified”.
- Không giả định “tạo bảng là gọi API được ngay”.

### 12.3 Cập nhật Supabase khác cần lưu ý

- Data API settings có per-table/per-function toggles và default-privileges switch.
- `@supabase/server` là SDK mới (auth/client/CORS/context) cho runtime server/edge.
- Branching vận hành trực tiếp từ dashboard (không bắt buộc GitHub integration).
- Supabase nhấn mạnh security/compliance (ISO 27001) → phù hợp định hướng security-first của SYNO.

Áp dụng thực tế:
- Với module mới, ưu tiên kiến trúc server-side an toàn, tránh đưa logic quyền xuống client.
- Kiểm tra Security Advisor định kỳ để bắt grants/policy thiếu.
- Với mọi mở rộng schema, bắt buộc có test truy cập Data API theo role.

## 13) Operational directive for future upgrades

Khi nâng cấp dự án, luôn đọc file này trước khi sửa code để bảo đảm đúng hướng SYNO:
- Production-ready
- Scalable
- Modular
- Realtime-safe
- SaaS-ready (multi-school isolation)
- Security-first (GRANT/RLS/POLICY/school_id)
- Không đổi lớn khi chưa impact analysis và xác nhận nghiệp vụ

---

## 14) Git identity & project naming (bắt buộc ghi nhớ)

- Tên dự án đang làm việc: **SYNO**
- Git/repo identity cần nhớ khi làm việc: **SYNO**
- Remote workspace hiện tại đang map tới repository:
  - `origin: https://github.com/dotuanlong2004/attendance_app.git`
- Khi viết docs/report/plan cho người dùng, luôn gọi hệ thống là **SYNO** thay vì tên module rời (`attendance_app`, `backend`, `hardware-collector`).

---

## 15) Agent skill upgrade baseline — 9Router (May 2026)

Nguồn tham chiếu đã xác minh:
- Entry skill: `skills/9router/SKILL.md`
- Skills index: `skills/README.md`
- Capability skills có trong repo `decolua/9router`:
  - `9router`
  - `9router-chat`
  - `9router-image`
  - `9router-tts`
  - `9router-stt`
  - `9router-embeddings`
  - `9router-web-search`
  - `9router-web-fetch`

### 15.1 9Router purpose

9Router là AI gateway theo chuẩn OpenAI-compatible REST:
- một endpoint cho nhiều provider/model
- auto-fallback/combo model
- dùng được cho chat/codegen, image, TTS, STT, embeddings, web search, web fetch
- phù hợp để chuẩn hóa lớp AI cho SYNO mà không phải viết boilerplate theo từng vendor

### 15.2 9Router environment baseline

Biến môi trường chuẩn:
- `NINEROUTER_URL`
- `NINEROUTER_KEY` (nếu bật API key auth)

Healthcheck chuẩn:
- `GET ${NINEROUTER_URL}/api/health` → kỳ vọng `{"ok":true}`

Model discovery endpoints:
- `/v1/models`
- `/v1/models/image`
- `/v1/models/tts`
- `/v1/models/stt`
- `/v1/models/embedding`
- `/v1/models/web`
- `/v1/models/image-to-text`

### 15.3 Capability mapping cho SYNO

1. `9router-chat`
   - dùng cho codegen, summarization, assistant nội bộ, prompt orchestration
   - endpoint chính:
     - `POST /v1/chat/completions`
     - `POST /v1/messages`
   - use case SYNO:
     - hỗ trợ AI admin assistant
     - tóm tắt log vận hành
     - sinh nội dung thông báo phụ huynh/nhà trường
     - hỗ trợ phân tích sự cố collector/backend

2. `9router-image`
   - dùng cho tạo ảnh banner/thông báo/tài liệu truyền thông
   - endpoint:
     - `POST /v1/images/generations`
   - use case SYNO:
     - ảnh cho announcement
     - assets cho admin dashboard hoặc parent app content

3. `9router-tts`
   - dành cho voice notification / voice assistant
   - use case SYNO:
     - đọc thông báo
     - trợ năng cho phụ huynh/người dùng

4. `9router-stt`
   - dành cho speech-to-text
   - use case SYNO:
     - nhập liệu bằng giọng nói
     - chuyển voice note thành nội dung xử lý

5. `9router-embeddings`
   - dành cho semantic search / retrieval
   - use case SYNO:
     - tra cứu manual nội bộ
     - semantic search trên docs, policy, SOP, FAQ phụ huynh

6. `9router-web-search`
   - dùng khi cần tìm thông tin web thời gian thực
   - use case SYNO:
     - tra cứu tài liệu vendor
     - tìm policy/platform updates
     - hỗ trợ incident research

7. `9router-web-fetch`
   - dùng lấy URL → markdown/text để agent đọc
   - use case SYNO:
     - ingest docs ngoài
     - đọc release notes / docs / policy online vào workflow phân tích

### 15.4 Rules khi áp dụng 9Router vào SYNO

- Không hardcode `NINEROUTER_KEY`.
- Secrets chỉ ở env/server-side.
- Không gọi AI trực tiếp từ frontend nếu payload chứa dữ liệu nhạy cảm học sinh/phụ huynh.
- Mọi prompt có dữ liệu production phải được sanitize/PPI-aware.
- Nếu dùng AI cho nghiệp vụ multi-tenant, context truyền vào phải school-scoped.
- Không để output AI tự ghi DB hoặc phát notification nếu chưa qua validation/business rules.
- Không dùng AI để bypass audit trail; mọi AI-assisted action quan trọng phải log lại.

---

## 16) Agent workflows cần ưu tiên cho SYNO

### 16.1 Workflow: docs → analysis → implementation
1. Đọc module liên quan
2. Đọc contracts/schema/env liên quan
3. Đọc memory file này
4. Lập impact analysis
5. Chia micro-task
6. Implement
7. Self-test
8. Regression test
9. Update memory/report nếu có thay đổi kiến trúc/quy tắc

### 16.2 Workflow: Supabase-safe change
1. Xác định bảng/policy/function bị ảnh hưởng
2. Kiểm tra `school_id` scope
3. Kiểm tra GRANT
4. Kiểm tra RLS/POLICY
5. Test Data API theo role
6. Chạy security review
7. Ghi risk/regression notes

### 16.3 Workflow: hardware/attendance-safe change
1. Audit flow scan → debounce → attendance_logs → parent mapping → FCM
2. Không đổi thứ tự business flow nếu chưa impact analysis
3. Test duplicate/spam/debounce
4. Test offline/retry/failure logging
5. Test không làm sai school/user binding

### 16.4 Workflow: AI feature rollout
1. Xác định capability cần dùng (`chat`, `image`, `tts`, `stt`, `embedding`, `web-search`, `web-fetch`)
2. Chọn model qua endpoint `/v1/models/<kind>`
3. Thiết kế server-side wrapper/service
4. Thêm input validation + redaction
5. Log usage/error an toàn
6. Test fallback/error path
7. Đánh giá cost/rate-limit/vendor lock-in

---

## 17) Agent hooks/rules đề xuất áp dụng lâu dài

### 17.1 Pre-task hook
Trước mọi task:
- đọc `PROJECT_MEMORY_SYNO.md`
- xác định module bị ảnh hưởng:
  - `backend/`
  - `admin_web/`
  - `attendance_app/`
  - `hardware-collector/`
  - `supabase/`
- xác định đây là task:
  - backend
  - frontend
  - flutter
  - supabase
  - hardware collector
  - AI integration

### 17.2 Pre-write hook
Trước khi sửa code:
- đọc file liên quan trực tiếp
- đọc manifest/config liên quan
- không sửa mù theo assumption
- nếu là DB/API/auth task: kiểm tra contract hiện tại trước

### 17.3 Post-change hook
Sau khi sửa:
- chạy self-test tối thiểu theo module
- kiểm tra regression path gần nhất
- kiểm tra secret leakage
- nếu liên quan Supabase: kiểm tra grant/RLS/policy impact
- nếu liên quan attendance flow: kiểm tra duplicate + realtime + push flow

### 17.4 Reporting hook
Kết quả mọi task phải nêu rõ:
- đã sửa gì
- file nào bị ảnh hưởng
- cách verify
- rủi ro còn lại
- regression scope

---

## 18) SYNO module map for future agent execution

### 18.1 Root
- `package.json`
  - package tối giản cho tooling/collector thử nghiệm Node
- `PROJECT_MEMORY_SYNO.md`
  - nguồn memory/policy trung tâm cho agent

### 18.2 `backend/`
- Node.js + Express + Supabase + PostgreSQL + pg-boss
- vai trò:
  - API nghiệp vụ
  - queue/background jobs
  - tích hợp FCM
  - nhận dữ liệu điểm danh từ collector AI-X1 qua Backend API
- phải ưu tiên rules:
  - service layer rõ ràng
  - auth + school isolation
  - grant/RLS/policy correctness

### 18.3 `admin_web/`
- React 19 + Vite + Tailwind + XLSX
- vai trò:
  - dashboard quản trị
  - import/export/excel admin operations
- cấm:
  - nhét business logic nặng vào UI
  - gọi secret/service_role từ frontend

### 18.4 `attendance_app/`
- Flutter đa nền tảng
- vai trò:
  - parent app / mobile experience
- rules:
  - tách state/service/network rõ
  - không nhúng logic quyền nghiệp vụ vào client
  - push/realtime phải an toàn và đúng tenant

### 18.5 `hardware-collector/`
- lớp tích hợp attendance hardware AI-X1 qua COM SDK
- collector hiện hành: `hardware-collector/ronald-jack-aix1`
- đây là vùng nhạy cảm:
  - dễ phát sinh duplicate logs
  - dễ lệch protocol
  - dễ lỗi quyền máy/service
- mọi thay đổi phải test theo flow thiết bị thực hoặc mock gần thực tế

### 18.6 `supabase/`
- nơi ưu tiên chứa migration/functions cấu trúc DB
- mọi mở rộng schema phải đi kèm:
  - GRANT
  - RLS
  - POLICY
  - verification plan

---

## 19) Nâng cấp tương lai nên ưu tiên

1. Chuẩn hóa bộ skill nội bộ cho SYNO:
   - `syno-backend`
   - `syno-supabase-security`
   - `syno-attendance-hardware`
   - `syno-parent-app`
   - `syno-admin-dashboard`
   - `syno-ai-assistant`

2. Chuẩn hóa rule templates:
   - migration template có sẵn GRANT/RLS/POLICY
   - API change checklist
   - realtime/push checklist
   - hardware regression checklist

3. Chuẩn hóa workflow docs:
   - incident response cho collector
   - release checklist cho backend/admin_web/app
   - rollback playbook cho schema changes

4. Tích hợp AI có kiểm soát:
   - log summarization
   - support assistant nội bộ
   - semantic search docs/manual/policy
   - content generation cho thông báo, nhưng luôn qua business validation

---

## 20) Super Admin platform separation (May 25, 2026)

- `super_admin` is platform-scoped and must have `school_id = null`; do not bind Super Admin accounts to tenant `1`.
- `admin_web` is only for school-scoped `admin` and `teacher` accounts.
- `super_admin_web` is the dedicated React app for platform-level administration.
- Backend school-admin APIs stay under `/api/v1/admin-web/*` and must derive `school_id` from the authenticated user profile.
- Backend platform-admin APIs stay under `/api/v1/platform-admin/*` and must require `role = super_admin`.
- Platform UI/API responsibilities include school CRUD, school admin/teacher account management, Super Admin account management, password reset, active/inactive status, and platform audit logs.
- User requested test account passwords to be `123456`. Current Super Admin target account is `superadmin@syno.local`; the Super Admin test login is `superadmin@syno.local` / `123456` with `school_id = null`.

---

## 21) Git progress rule (May 26, 2026)

- User directive: lam toi dau day code len git toi do.
- Updated directive (May 27, 2026): Gemini/other agents must not commit or push by themselves. Codex owns review, staging, commit, and push.
- Sau moi lat cat tien do co y nghia:
  1. chay verification phu hop voi module;
  2. Gemini/other agents report changed files and verification output;
  3. Codex reviews diff, checks secret/build output, stages exact approved files;
  4. Codex commits nho theo conventional commit;
  5. Codex pushes len remote ngay.
- Khong gom nhieu module lon vao mot commit neu co the tach an toan.
- Neu push that bai vi network/auth/sandbox, bao ro va tiep tuc giu working tree co the commit/push lai.
- Gemini/other agents must not run `git add`, `git commit`, or `git push` unless the user explicitly changes this rule later.

---

## 22) Feature-first execution directive (May 26, 2026)

- User directive: tam gac test phan cung AI-X1 va test thong bao push that de uu tien hoan thien toan bo chuc nang truoc.
- Hardware real-device test va FCM real-device/background test la hau kiem sau khi cac chuc nang/web/app/backend/service da lien ket xong.
- Trong giai do hien tai:
  1. khong dung viec vi thieu device/token that neu co the tiep tuc lam chuc nang bang contract/unit/build tests;
  2. uu tien hoan thien va noi cac service backend, admin_web, parent app, super_admin_web theo roadmap;
  3. van giu contract tests, typecheck, build, smoke tests khi phu hop;
  4. khong hardcode secret, khong mo RLS/grants rong de "test cho nhanh".
- Khi chuc nang da dong bo, lap mot pass test tong hop rieng cho:
  - AI-X1 collector voi thiet bi that;
  - FCM push tren device phu huynh that;
  - attendance -> notification -> parent app refresh;
  - admin_web/super_admin_web end-to-end.

---

## 23) Logo and brand UI directive (May 27, 2026)

- User directive: logo UI phai dung va chuyen nghiep; khong duoc chi cat mot anh roi gan vao man hinh cho co.
- Khi hien thi logo SYNO trong web/app:
  1. uu tien dung logo mark asset lam bieu tuong co khung/tile/spacing ro rang;
  2. render chu "SYNO" va tagline bang text/CSS khi can thay vi phu thuoc vao anh horizontal co nen/khoang trang;
  3. giu ti le, object-fit contain, khong crop, khong stretch;
  4. header/login phai co layout brand component rieng, canh baseline/spacing dung vai tro UI;
  5. neu can dung anh horizontal, chi dung trong khung co kich thuoc phu hop va khong cat mat logo/tagline.

---

## 24) Vietnamese text and UI priority directive (May 27, 2026)

- User directive: tat ca text hien thi trong UI phai la tieng Viet co dau, khong de chu khong dau trong app/web.
- Uu tien giao dien theo thu tu:
  1. parent app (`attendance_app`) la uu tien quan trong nhat;
  2. logo/brand/tong mau theo dung nhan dien SYNO la nen tang quan trong nhat;
  3. sau khi app phu huynh dat chuan moi tiep tuc polish cac trang Admin Web va Super Admin Web.
- Giao dien chuc nang phai lam dang hoang: dung component ro rang, spacing/on-screen text/empty state/error state co chat luong, khong chi gan logo/anh vao cho co.
- Khi sua UI:
  - uu tien tông xanh logo SYNO lam mau chu dao;
  - dung mau phu co kiem soat cho trang thai/thong bao, khong lam lech brand;
  - kiem tra text khong dau va sua thanh tieng Viet co dau truoc khi commit.

---

## 25) Restricted ownership for hardware and Firebase push (May 27, 2026)

- User directive: Gemini/other agents must not modify hardware collector or Firebase push notification implementation.
- Reserved owner: Codex handles these two areas:
  1. Ronald Jack AI-X1 hardware collector and real hardware integration.
  2. Firebase Cloud Messaging push path, including real device-token push tests.
- Gemini/other agents may read related docs/status for context, but must not edit:
  - `hardware-collector/`
  - backend Firebase Admin / push services
  - FCM token registration or push dispatch logic
  - notification queue/worker code that changes real push behavior
- Gemini/other agents should focus on:
  - parent app UI/UX and Vietnamese text polish
  - native app name/icon/brand identity
  - Admin Web and Super Admin Web UI polish
  - non-hardware, non-FCM business features from the roadmap
  - docs/audit/checklists that do not alter hardware or push runtime behavior
- If a feature needs attendance or notification data, Gemini should consume existing APIs/contracts only and leave push/hardware behavior unchanged.

---

## 26) Reporting language and temporary file hygiene (May 27, 2026)

- User directive: Gemini/other agents must report to the user in Vietnamese, with Vietnamese accents.
- Gemini/other agents must not create or leave trash/temp files in the repository.
- Forbidden repo artifacts unless Codex/user explicitly asks for them:
  - `temp_docs.zip`
  - `temp_docs_unzip/`
  - ad-hoc `GEMINI_CHANGELOG.md`
  - duplicate changelog/report files
  - extracted DOCX/PDF working folders
  - broken-encoding reports
- If an agent needs to extract DOCX/PDF or create temporary analysis files, use a temp directory outside the repo or delete the temp artifacts before reporting.
- Reports/checklists must be created only when requested, must use UTF-8 Vietnamese correctly, and must not claim stale facts contradicted by `CURRENT_STATUS.md`.
- Gemini/other agents should report:
  1. files changed;
  2. commands run;
  3. verification output;
  4. files intentionally left for Codex review;
  5. confirmation that no forbidden hardware/FCM files were modified.

---

## 27) Codex handoff for next session (May 28, 2026)

- Codex created a concrete next-session handoff at:

```text
docs/reports/HANDOFF_2026-05-28_CODEX_SESSION.md
```

- The handoff records:
  1. pushed branding/native identity commits for the Parent App;
  2. pushed Parent App UI/text polish commit;
  3. Android emulator install/build/launch commands;
  4. backend, Admin Web, and Super Admin Web startup commands;
  5. current uncommitted dashboard polish in `attendance_app/lib/presentation/pages/dashboard_page.dart`;
  6. the rule that Codex owns hardware collector and Firebase push work.
- Current pushed commits from the latest Codex slice:

```text
5f011df2 feat: brand parent app native identity
be7001aa feat: polish parent app brand text
```

- Before new feature work, check `git status --short`. At handoff time, the only known dirty source file is:

```text
attendance_app/lib/presentation/pages/dashboard_page.dart
```

---

## 28) Quy tắc tiếng Việt có dấu cho tài liệu và bộ nhớ (June 8, 2026)

- User directive: luôn ghi tiếng Việt có dấu đầy đủ trong mọi tài liệu, handoff, runbook, báo cáo, bộ nhớ dự án và nội dung UI/user-facing mới.
- Không viết tiếng Việt không dấu trong file `.md` mới hoặc nội dung hướng dẫn mới, trừ khi đang trích nguyên văn lệnh, biến môi trường, đường dẫn, log, mã lỗi, tên file, tên branch, commit hash hoặc text kỹ thuật bắt buộc giữ nguyên.
- Trước khi commit tài liệu hoặc UI text, kiểm tra nhanh để tránh để sót câu tiếng Việt không dấu.
- Nếu file cũ đang bị lỗi mã hóa hoặc có nội dung không dấu, không tự sửa toàn bộ file nếu không liên quan task; nhưng mọi phần thêm mới phải dùng UTF-8 tiếng Việt có dấu chuẩn.
