# SEERAAI PRO — Release Readiness, Regression & Rollback Checklist (Phases G–I)

**Target Project ID:** `leafy-rush-xvd6f`  
**Firestore Database ID:** `ai-studio-seeraaitrilingua-18431532-f42a-4a5a-b5b1-c3c0e6b05478`  
**Storage Bucket:** `leafy-rush-xvd6f.firebasestorage.app`  
**Cloud Run Service:** `https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app` (`europe-west3`)  
**Current Gate Status:** **HOLD / AWAITING HUMAN APPROVAL & EMULATOR EXECUTION**

---

## 1. Evidence Separation Ledger

- **Source-Level Findings:** Verified directly across `firestore.rules`, `storage.rules`, `server-app.ts`, `src/server/**`, `src/services/**`, `src/components/**`, `src/views/**`, `functions/src/courtDocuments.ts`, and `capacitor.config.json`.
- **Executed Container Tests:** Verified cleanly via `npx tsx tests/security_remediation_verification.test.ts`, `npx tsx tests/phase7d2_signout_safety.test.ts`, `npx tsx tests/phase8_legal_knowledge_base.test.ts`, `npm run lint` (`tsc --noEmit`), and `npm run build`.
- **Emulator Test Results:** **BLOCKED in current container** (`java: not found`, `NO_EMULATOR_CACHE`, `@firebase/rules-unit-testing` absent). Complete suites staged in `tests/firestore.rules.test.ts` (20 scenarios) and `tests/storage.rules.test.ts` (8 groups) for local/CI Java-enabled execution.
- **Live Production Observations:** **NOT VERIFIED** (`firebase` CLI unauthenticated: `No authorized accounts`). Currently active Firestore Rules, Storage Rules, Cloud Functions revision, Auth users, and Custom Claims in `leafy-rush-xvd6f` remain uninspected.

---

## 2. Phase G — Functional Regression Matrix

| Workflow | Security Alignment Applied | Expected Impact | Verification Status |
|---|---|---|---|
| **Login & Registration** | `authenticateUser` rejects anonymous on staff routes; `forgot-password` no longer echoes `resetLink`; self role escalation blocked in `users/{uid}` | Normal email/password login, sign-up, and email reset delivery preserved | Source + Rules aligned; Emulator pending |
| **User Profiles** | Users can update profile fields; blocked from mutating `role`, `admin`, `courtRole`, `institutionId`, `subscriptionTier` | Zero impact to display preferences or settings | Rules test #15 staged; `phase7d2` signout safety PASSED (`12/12`) |
| **Institutional Access** | Backend & Rules verify verified-email + matching `institutionId` + `courtRole` custom claims | Prevents cross-tenant access (`Inst A` vs `Inst B`); **requires Custom Claims backfill before Rules publish** | Source aligned; Claims endpoint `/api/admin/set-court-claims` added |
| **Legal Research (Trilingual OM/AM/EN)** | Fixed `searchTokens` poisoning bug; `searchLegalSources` cleanly falls back to local corpus on Firestore offline/permission errors; `legislation_repository` / `cassation_decisions` remain publicly readable | Non-existent laws no longer hallucinate `SOURCE_GROUNDED`; OM/AM/EN search works offline & online | `phase8_legal_knowledge_base.test.ts` PASSED (`9/9`); `security_remediation_verification.test.ts` PASSED |
| **Legal Document Uploads** | `POST /api/legal/sources/upload` & `/review` derive identity strictly from Firebase Bearer token; `storage.rules.candidate` allows PDF/DOCX/XLSX/Images/Audio/Video <= 50MB | Client body `uploaderRole` forgery blocked; legitimate `PUBLISHED` listing works | Live Express HTTP test PASSED |
| **Court Document Management** | Removed `<8MB` base64 `dataUrl` Firestore write in `courtDocuments.ts`; aligned `functions/src/courtDocuments.ts` `ROLES`; immutable `institutionId` | Prevents 1MB Firestore document bloat & cross-court tampering | Source & Candidate Rules aligned; Emulator test #6/#13/#14/#19 staged |
| **Judgments & Orders** | `institutions/{id}/courtDocuments` & `cases` require verified `canEditCasesIn(institutionId)` | Public drafts blocked; judges/assistant_judges/registrars of same court operate normally | Rules tests #6–#11 staged |
| **Evidence Management** | `POST /api/evidence/extract-video-metadata` & `/extract-metadata` require authentication & tenant authorization | Prevents cross-tenant metadata tampering | Source verified |
| **Witness Scheduling** | `witness_schedules` & `witness_statements` locked to `isInstitutionStaff`; `witnessSchedulingService.ts` filters by `institutionId` | Eliminates public read/write exposure of witness PII | Source verified; Rules test #17 staged |
| **Courtroom Audio Workflows** | `/uploads/court-audio`, `POST /api/cases/:caseId/audio-recording`, and `GET /api/cases/:caseId/audio-recordings` gated by `authenticateUser, authorizeCourtStaff` + client Bearer header added | Unauthenticated audio interception eliminated | Source verified; Rules test #18 staged |
| **Audit Logging** | `audit_logs`, `institutions/{id}/auditLogs`, `admin_activity_logs` enforce immutable `update, delete: if false`; `functions/src/courtDocuments.ts` writes `courtDocumentAudit` | Forensic integrity guaranteed | Source verified; Rules tests #10 & #16 staged |
| **Telegram Integration** | Admin dashboard attaches Bearer token; webhook & miniapp fall back secrets use CSPRNG; 9 internal `telegram_*` collections locked to `isAdmin()`; public feeds remain readable | No more public PII leak in `telegram_logs`/`subscribers` or predictable webhook spoofing | Source verified |
| **Trilingual UI (OM / AM / EN)** | Preserved across `legalSearch.ts`, `legalAnswerService.ts`, and all React views | All three languages supported identically | `phase8` test #9 PASSED |

---

## 3. Phase H — Ordered Production Deployment & Rollback Plan

**CRITICAL ORDERING RULE:** Do **NOT** publish `firestore.rules.candidate` or `storage.rules.candidate` until Step 3 (Custom Claims Backfill) completes! Publishing candidate Rules before active institutional staff hold `institutionId` & `courtRole`/`admin` Custom Claims will immediately return `PERMISSION_DENIED` across institutional court UI.

### Pre-Deployment Verification Gates (Must All Pass First)
1. **Authenticate Read-Only Production CLI:** Run `firebase login` and inspect current live project `leafy-rush-xvd6f`:
   - Export currently active Firestore Rules, Storage Rules, CORS, IAM bindings, and Cloud Run env vars (verify names only: `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_MINIAPP_HMAC_SECRET`, `TELEGRAM_SETUP_SECRET`, `TELEGRAM_SERVERLESS_TOKEN`).
2. **Run Full Firebase Emulator Suite (with Java JRE >= 17 installed):**
   - `npm install --no-save @firebase/rules-unit-testing` (or add devDependency cleanly if approved)
   - `firebase emulators:exec --only firestore "npx tsx tests/firestore.rules.test.ts"` (must achieve **20/20 PASS**)
   - `firebase emulators:exec --only storage "npx tsx tests/storage.rules.test.ts"` (must achieve **8/8 PASS**)
3. **Create Pre-Change Backups:**
   - Save copy of currently active live `firestore.rules` & `storage.rules` as `firestore.rules.prod.bak` & `storage.rules.prod.bak`.
   - Export Cloud Firestore database `ai-studio-seeraaitrilingua-18431532-f42a-4a5a-b5b1-c3c0e6b05478` to a secure GCS backup bucket prior to rollout.
   - Record current Cloud Run revision tag in `europe-west3` and Functions revision.

### Controlled Deployment Sequence (Only After Phase I Approval)
1. **Deploy Updated Backend & Cloud Functions First** (maintaining compatibility with both legacy profile fallback and Custom Claims):
   - Deploy Cloud Run revision (`server-app.ts`, built `dist/`, updated client bundle) while ensuring `TELEGRAM_WEBHOOK_SECRET` and `TELEGRAM_MINIAPP_HMAC_SECRET` are explicitly set in Cloud Run Secret Manager.
   - Deploy updated `functions/src/courtDocuments.ts` (`court_admin`, `legal_expert`, `courtDocumentAudit`).
2. **Run Admin Custom Claims Provisioning / Backfill:**
   - Using `POST /api/admin/set-court-claims` (or an approved one-time Admin SDK batch script logged to `admin_activity_logs`), stamp verified `admin: true` on verified Superadmins and `courtRole` + `institutionId` on every approved active user in `court_users` / `users`.
   - Prompt active court sessions to refresh their ID token (`getIdToken(true)`) or force token refresh.
3. **Tag Legacy `witness_schedules` Documents (Optional Low-Risk Hygiene):**
   - Inspect any legacy `witness_schedules` docs missing `institutionId` and stamp their owning court's `institutionId` before strict read enforcement.
4. **Promote & Publish Security Rules (`leafy-rush-xvd6f`):**
   - Copy `firestore.rules.candidate` -> `firestore.rules` and `storage.rules.candidate` -> `storage.rules` only after human sign-off.
   - Deploy Rules specifically targeting database `ai-studio-seeraaitrilingua-18431532-f42a-4a5a-b5b1-c3c0e6b05478` and bucket `leafy-rush-xvd6f.firebasestorage.app`.
5. **Post-Deploy Smoke Checks:**
   - Verify unauthenticated access to `/legislation_repository` succeeds while `/court_documents`, `/witness_schedules`, `/telegram_logs`, and `/admin_activity_logs` deny.
   - Verify an Institution A judge reads/uploads inside Institution A and receives `PERMISSION_DENIED` on Institution B.

### Rollback Sequence (If Any P0 Regression Occurs)
1. **Immediate Rules Rollback (< 2 minutes):** Re-publish `firestore.rules.prod.bak` / `storage.rules.prod.bak` or revert rules version directly in Firebase Console Rules History for `leafy-rush-xvd6f`.
2. **Cloud Run Revision Rollback (< 2 minutes):** Shift 100% traffic back to the previously recorded healthy Cloud Run revision in `europe-west3`.
3. **Audit & Preserve:** Never delete user data or Firestore documents during rollback; inspect `admin_activity_logs` and Cloud Logging for denied claim mismatches (`token.institutionId` / `token.email_verified`).

---

## 4. Phase I — Human Approval Gate (Required Sign-Offs)

No production changes have been executed. Explicitly obtain human authorization for:
- [ ] **Security / Principal Architect Approval:** Sign off on `firestore.rules.candidate`, `storage.rules.candidate`, and unified backend source diffs.
- [ ] **Judicial Administration Approval:** Approve Custom Claims mapping (`admin`, `courtRole`, `institutionId`) for all active institutional staff accounts in `leafy-rush-xvd6f`.
- [ ] **Release Manager Approval:** Authorize production Cloud Run deployment, Cloud Functions deployment, and Firebase Rules publication after Java Emulator verification (`20/20` + `8/8` PASS) completes.
