# SEERAAI PRO — Phase 8B.6.7 Remediated Handoff Package

This package contains the candidate security rules, emulator configurations, CI workflows, synchronized manifests, and test suites for SEERAAI PRO (`sai-ethio-legal-ai` v5.0.0).

## Remediated Files
- `firestore.rules.phase8b5.3.integrated.candidate`: Remediated Firestore Security Rules (zero hardcoded emails, verified claims only, tenant isolation, immutable audit logs, and hardened `admin_activity_logs` restricted to `isAdmin()` read/create with `update, delete: if false`).
- `storage.rules.phase8b5.4.integrated.candidate`: Remediated Storage Security Rules (zero hardcoded emails, protected institutional courtDocuments, MIME checks, 50MB/5MB size limits, dual `legal_docs` path support).
- `firebase.emulator.test.json`: Firebase Emulator Suite configuration targeting `demo-seeraai-test`.
- `.github/workflows/rules-test.yml`: GitHub Actions workflow using strict `npm ci`, isolated guard check, `firebase-tools` fallback, and emulator execution.
- `tests/firestore.rules.test.ts`: 21-case Firestore rules unit test suite using `@firebase/rules-unit-testing` (`^4.0.1`), including verified-admin and unauthorized `admin_activity_logs` read/create/update/delete checks.
- `tests/storage.rules.test.ts`: 8-case Storage rules unit test suite using `@firebase/rules-unit-testing` (`^4.0.1`).
- `package.json` & `package-lock.json`: Synchronized project manifest and lockfile (`@firebase/rules-unit-testing@^4.0.1` aligned with `firebase@^11.0.1`).

## Pending Owner Decisions (Before Production Promotion)
1. **Upload Size Policy:** `src/services/courtDocuments.ts` enforces `5 GB` (`uploadBytes`), whereas `functions/src/courtDocuments.ts` and candidate Storage Rules enforce `50 MB`. Choose Option A (align client to 50 MB) or Option B (approve larger cap + `uploadBytesResumable` refactor).
2. **Passwordless / Guest Auth Compatibility:** `signInByEmailOnly` in `src/context/AuthContext.tsx` calls `signInAnonymously(auth)`; hardened rules intentionally deny anonymous sessions access to private user/court resources.

## Instructions for GitHub Integration
1. Unzip this package in your local repository branch (`ci/rules-emulator-tests`).
2. Verify checksums (`sha256sum -c SHA256SUMS.txt`), commit, and push to `ayee71/SEERAAI-`.
3. Trigger the workflow (`rules-emulator-tests`) via GitHub Actions `workflow_dispatch` or PR and verify all emulator tests PASS before any merge/deploy approval.

## Safety Boundaries
- **Zero Production Mutation:** This package does NOT modify production `firestore.rules`, `storage.rules`, or `firebase.json`.
- **Isolated Testing:** All tests run exclusively against project ID `demo-seeraai-test`.
