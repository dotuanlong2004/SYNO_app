# SYNO Release Guide

Current GitHub repository:

```text
https://github.com/dotuanlong2004/SYNO_app
```

The repository must stay private unless the owner explicitly decides otherwise.

## Before A Release

1. Confirm the working tree is clean or only contains intentional release changes.
2. Run the security checks in `SECURITY.md`.
3. Run the core verification commands:

```bat
cmd /c "cd /d d:\attendance_app_dev && corepack pnpm --filter backend test"
cmd /c "cd /d d:\attendance_app_dev && corepack pnpm --filter admin_web build"
dotnet build d:\attendance_app_dev\hardware-collector\ronald-jack-aix1 -c Release
```

4. For Flutter, run `flutter analyze` and `flutter test` from `attendance_app` when the local Flutter toolchain is responsive.
5. Confirm no real `.env`, service account JSON, database dump, cache, or build output is staged.

## Release Checklist

- [ ] Backend tests pass.
- [ ] Admin Web production build passes.
- [ ] AI-X1 collector builds with 0 warnings and 0 errors.
- [ ] Flutter analyze/test result is recorded, or the blocker is documented.
- [ ] `SECURITY.md` checklist passes.
- [ ] Production secrets are configured outside Git.
- [ ] `HARDWARE_API_KEY` is set on both backend and collector in production.
- [ ] Firebase service account is configured in backend runtime, not committed.
- [ ] Supabase RLS/grants remain strict and school-scoped.

## Tagging

Use semantic versioning:

```bat
git tag -a vX.Y.Z -m "Release vX.Y.Z - short summary"
git push origin vX.Y.Z
```

Then create the GitHub release from the tag in the private `SYNO_app` repository.

Do not attach local `.env`, database dumps, build folders, or generated collector binaries to a release unless they have been reviewed and intentionally packaged as release artifacts.
