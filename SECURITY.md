# SYNO Security Checklist

This repository contains source code for a school SaaS system. Treat all production data, database URLs, API keys, Firebase credentials, and hardware device credentials as secret.

## Never Commit

- `.env`, `.env.*`, `.supabase.local.env`
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, Firebase service account JSON, `HARDWARE_API_KEY`, device passwords
- `backend/firebase-service-account.json`
- `attendance_app/android/app/google-services.json`
- local databases: `*.db`, `*.sqlite`, `*.sqlite3`
- generated output: `node_modules`, `.pub-cache`, `build`, `dist`, `bin`, `obj`, `.dart_tool`, `.gradle`, `Pods`
- IDE/user state: `.idea`, `.vscode`
- logs, packet captures, temp files, and cache files

## Required Runtime Secret Placement

- Backend/server only: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, Firebase Admin credentials.
- Backend plus collector: `HARDWARE_API_KEY`.
- Frontend/Flutter only: publishable or anon Supabase key. Never use service-role keys in clients.
- AI-X1 collector: device password and API key must come from environment variables.

## Pre-Push Audit

Run these from the repo root before pushing important changes:

```powershell
git status --short --branch
git ls-files | rg -i '(^|/)(\.pub-cache|bin|obj|build|dist|node_modules|\.dart_tool|Pods|\.gradle|__pycache__)/|(^|/)\.idea/|(^|/)\.vscode/|(^|/)(google-services\.json|firebase-service-account\.json|database_credentials\.txt|.*\.(p12|p8|pem|key|jks|keystore|db|sqlite|sqlite3))$'
git grep -n -i 'BEGIN PRIVATE KEY\|private_key\|service_role.*eyJ\|SUPABASE_DB_URL=.*postgres\|HARDWARE_API_KEY=.*[A-Za-z0-9_]\{16,\}\|AIza[0-9A-Za-z_-]' HEAD
git diff --cached --name-only
```

Expected result:

- The `git ls-files | rg ...` command prints nothing.
- The `git grep ...` command prints nothing except placeholder/documentation lines that do not contain real values.
- Staged files are intentional and do not include generated artifacts.

## GitHub Repository Settings

Keep these enabled on `dotuanlong2004/SYNO_app`:

- Private visibility.
- Secret scanning.
- Push protection for detected secrets.
- Dependabot alerts.
- Restricted collaborator access.
- Require pull request review before merging if more than one person works on the repo.

## Supabase Rules

- Keep RLS enabled on exposed schemas.
- Do not restore broad `anon` grants on business tables.
- All business data access must be scoped by `school_id`.
- Do not use `user_metadata` as a trusted authorization source.
- Keep security-definer functions out of exposed schemas unless explicitly reviewed.

## If A Secret Is Exposed

1. Rotate the exposed secret immediately in the provider dashboard.
2. Remove it from code.
3. Audit Git history and GitHub secret scanning alerts.
4. Redeploy services with the new secret.
5. Document the incident and the rotation time.
