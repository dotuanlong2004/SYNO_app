# AGENTS.md - SYNO AI Onboarding

Bat buoc doc file nay truoc khi mot AI/coding agent moi dung vao du an.

Du an dang dang do, tai lieu cu tung bi lech tien do. Khong duoc code theo tri nho chung chung hoac theo cac file archive cu. Hay doc cac file hien hanh theo thu tu ben duoi roi moi phan tich/sua code.

## 1. Thu Tu Doc Bat Buoc

1. `AGENTS.md` - file dang doc, quy tac lam viec cho AI.
2. Nap bo nho/skill/rule/workflow ngoai repo trong muc "External AI Context" ben duoi.
3. `CURRENT_STATUS.md` - trang thai that, van de dang ket, nhung gi da xac nhan.
4. `PROJECT_MEMORY_SYNO.md` - bo nho ky thuat dai han cua SYNO.
5. `HUONG_DAN_CHAY_AI_X1.md` - runbook moi nhat cho Ronald Jack AI-X1 collector.
6. `ROADMAP.md` - lo trinh san pham hien hanh.
7. File/module lien quan truc tiep den task dang lam.

Khong coi cac file archive/legacy la workflow hien tai. Neu can tra lich su, uu tien Git history hoac tai lieu docx hien hanh trong `docs/source/project-documents`.

## 2. External AI Context

AI moi bat buoc phai doc/nap them cac skill, hooks, memories, rules va workflows ben ngoai repo neu moi truong cho phep. Day la bo nguyen tac lam viec cua user, khong phai tai lieu tham khao tuy chon.

### Windsurf / Codeium Context

Root:

```text
C:\Users\ASUS\.codeium\windsurf
```

Can kiem tra va nap cac nhom sau:

```text
C:\Users\ASUS\.codeium\windsurf\skills
C:\Users\ASUS\.codeium\windsurf\memories
C:\Users\ASUS\.codeium\windsurf\global_workflows
C:\Users\ASUS\.codeium\windsurf\brain
C:\Users\ASUS\.codeium\windsurf\context_state
C:\Users\ASUS\.codeium\windsurf\mcp_config.json
```

Skill quan trong da duoc user chi ro:

```text
C:\Users\ASUS\.codeium\windsurf\skills\defensive-flutter-coding\SKILL.md
```

Danh sach skill can uu tien khi lien quan:

```text
defensive-flutter-coding
defensive-flutter-supabase
docker-devops-troubleshooting
full-stack-feature-implementation
secure-backend-development
supabase
supabase-fullstack-mastery
supabase-postgres-best-practices
```

Khi task cham vao Flutter, Supabase, backend security, full-stack feature, Docker/devops, hoac Postgres, phai doc skill tuong ung truoc khi sua code.

Superpowers skills da duoc mirror vao Windsurf tai:

```text
C:\Users\ASUS\.codeium\windsurf\skills
```

### Cline Context

Root:

```text
C:\Users\ASUS\OneDrive\Documents\Cline
```

Can kiem tra va nap:

```text
C:\Users\ASUS\OneDrive\Documents\Cline\Hooks
C:\Users\ASUS\OneDrive\Documents\Cline\MCP
C:\Users\ASUS\OneDrive\Documents\Cline\Rules
C:\Users\ASUS\OneDrive\Documents\Cline\Workflows
```

Cline MCP hien co the chua GitHub/Supabase config. Neu AI/coding agent moi khong thay GitHub/Supabase tools, phai kiem tra Cline MCP va Apps/Connectors truoc khi ket luan la khong co ket noi.

Superpowers skills da duoc mirror vao Cline tai:

```text
C:\Users\ASUS\OneDrive\Documents\Cline\Skills
```

### Superpowers Skills Installed

Superpowers core va community skills da duoc cai vao:

```text
C:\Users\ASUS\.codex\skills
C:\Users\ASUS\.codeium\windsurf\skills
C:\Users\ASUS\OneDrive\Documents\Cline\Skills
```

AI moi phai uu tien dung cac skill nay khi phu hop:

```text
using-superpowers
brainstorming
writing-plans
executing-plans
test-driven-development
systematic-debugging
verification-before-completion
requesting-code-review
receiving-code-review
dispatching-parallel-agents
subagent-driven-development
using-git-worktrees
finishing-a-development-branch
writing-skills
defense-in-depth
root-cause-tracing
testing-anti-patterns
condition-based-waiting
when-stuck
remembering-conversations
preserving-productive-tensions
collision-zone-thinking
inversion-exercise
meta-pattern-recognition
scale-game
simplification-cascades
tracing-knowledge-lineages
using-skills
gardening-skills-wiki
pulling-updates-from-skills-repository
sharing-skills
testing-skills-with-subagents
```

Quy tac ap dung nhanh:

- Bat dau task moi: doc `using-superpowers` neu co.
- Feature/refactor lon: dung `brainstorming` va `writing-plans` truoc khi code.
- Bug/test fail: dung `systematic-debugging` hoac `root-cause-tracing`.
- Security/Supabase/auth/RLS: dung `defense-in-depth` kem cac skill Supabase rieng.
- Truoc khi noi "xong": dung `verification-before-completion`.
- Khi bi ket qua 2-3 lan thu: dung `when-stuck`.
- Khi viet/sua skill cho SYNO: dung `writing-skills`.

### Neu Khong Doc Duoc External Context

Neu mot AI khong co quyen doc cac duong dan tren, no phai noi ro la bi thieu external context nao va khong duoc gia lap rang da doc. Khi thieu context, phai lam cham hon: doc repo ky hon, khong tu y refactor lon, khong xoa file, khong doi Supabase/schema neu chua xac minh.

## 3. Tong Quan Du An

- Ten he thong: SYNO
- Mo hinh: Smart School SaaS Platform
- Doi tuong: nha truong, phu huynh, admin ky thuat
- Thanh phan chinh:
  - `admin_web` - React Web Admin
  - `super_admin_web` - React Super Admin Web rieng cho platform super_admin
  - `attendance_app` - Flutter parent app
  - `backend` - Node/Express API
  - Supabase/PostgreSQL - database, auth, realtime/RLS
  - `hardware-collector/ronald-jack-aix1` - collector Ronald Jack AI-X1
  - Firebase Cloud Messaging - push notification path

Supabase project hien tai:

```text
Name: SYNO APP
Ref: bimepdqcwpsynjimvenn
Region: ap-southeast-1
Production school_id: 1
Production school: Huu Nghi School (HNS)
Website: https://hns.edu.vn/
Levels: primary, secondary, high_school
```

## 4. Trang Thai Hien Tai Can Nho

- Backend chay tren port `3000`.
- AI-X1 collector hien tai dung flow C# trong `hardware-collector/ronald-jack-aix1`.
- Thiet bi da xac nhan:

```text
IP: 192.168.0.225
Port: 4370
Serial: AYTD01032550
Polling: 3s
```

- Khong dung flow cu `C:\ZKCollector\x86\ZKCollector.exe --console` cho AI-X1 hien tai.
- Supabase project dang active va database da co cac bang nghiep vu chinh.
- Super Admin phai tach rieng: `super_admin_web` + `/api/v1/platform-admin/*`; profile `super_admin` co `school_id=null`, khong gan vao tenant `1`.
- Strict RLS/grants da apply tren Supabase production ngay 2026-05-20:
  - khong con `anon` table grants tren cac bang nghiep vu da audit;
  - policies da school-scoped theo role + `school_id`;
  - tenant FK `school_id` da validate;
  - neu man hinh nao loi quyen sau cutover, sua flow theo strict RLS, khong mo lai grant rong.

## 5. Van De Dang Ket

1. `SUPABASE_DB_URL` dang stale/sai.
   - `ENABLE_ATTENDANCE_QUEUE=false` dang tat queue local.
   - Khong bat pg-boss/queue neu chua cap nhat dung connection string tu Supabase Dashboard.

2. FCM chua hoan tat local.
   - `FIREBASE_SERVICE_ACCOUNT_JSON` chua cau hinh trong `backend/.env`.
   - Notification co the chi log, chua push that toi device.

3. Collector con hardcode config.
   - Device/backend/Supabase constants nam trong `hardware-collector/ronald-jack-aix1/Program.cs`.
   - Nen chuyen sang config/env truoc production.

4. Working tree co the dang dirty.
   - Co build output trong `hardware-collector/ronald-jack-aix1/bin` va `obj`.
   - Khong revert/sua file user da thay doi neu khong duoc yeu cau.

## 6. Quy Tac Supabase Va Bao Mat

- Moi du lieu nghiep vu phai scoped theo `school_id`.
- Khong dua `service_role` key vao frontend, Flutter app, Web Admin client, hay repo public.
- Khong hardcode secret/token/key moi.
- Khong disable RLS de chua chay.
- Migration tao bang public moi phai co:
  - `CREATE TABLE`
  - explicit `GRANT`
  - `ENABLE ROW LEVEL SECURITY`
  - policy dung role/nghiep vu
- Khi gap loi `42501`, kiem tra GRANT truoc, sau do RLS/policy.
- Khong dung `user_metadata` lam nguon phan quyen tin cay. Neu can auth claims cho authorization, uu tien app metadata/server-side profile.

## 7. Quy Tac Khi Sua Code

- Audit module lien quan truoc khi sua.
- Bam pattern san co, khong doi architecture neu task khong yeu cau.
- Khong sua lan sang module khong lien quan.
- Khong xoa tai lieu/file cu neu chua co ly do ro; neu can don, uu tien archive.
- Khong commit build output, secret, cache, log.
- Moi thay doi lien quan user-facing/API/DB nen co test hoac it nhat co cach verify ro.
- Neu lam viec voi Supabase, uu tien query doc/tool hien tai thay vi doan theo tri nho.

## 8. Lenh Chay Hien Tai

Backend:

```bat
cmd /c "cd /d d:\attendance_app_dev && corepack pnpm --filter backend build && corepack pnpm --filter backend start"
```

AI-X1 collector:

```bat
dotnet build d:\attendance_app_dev\hardware-collector\ronald-jack-aix1 -c Release
d:\attendance_app_dev\hardware-collector\ronald-jack-aix1\bin\Release\net472\TestCOMReflect.exe
```

## 9. Tai Lieu Cu

Tai lieu markdown cu, Node Local Agent, MITA/ZK flow cu va cac phase da qua khong con la workflow hien tai. Neu can tra lich su, dung Git history hoac tai lieu docx hien hanh trong `docs/source/project-documents`.

## 10. Khi Bat Dau Mot Task Moi

AI phai tra loi ngan gon rang da doc `AGENTS.md`, sau do:

1. Xac dinh task thuoc module nao.
2. Xac nhan da nap external AI context nao: Windsurf skills/memories/workflows va Cline hooks/rules/workflows/MCP.
3. Doc file/module lien quan.
4. Neu Supabase lien quan, kiem tra schema/RLS/data hien tai truoc khi sua.
5. Neu hardware/AI-X1 lien quan, doi chieu voi `HUONG_DAN_CHAY_AI_X1.md`.
6. Neu tai lieu mâu thuan, uu tien theo thu tu:
   - database/code hien tai
   - `CURRENT_STATUS.md`
   - `PROJECT_MEMORY_SYNO.md`
   - external skills/rules/workflows cua user neu ap dung truc tiep
   - file ke hoach `.docx`
   - archive cu
