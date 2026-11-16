# SEERAAI PRO — Firebase Security Remediation Report (Phases A–E)

**Application:** SEERAAI PRO (`sai-ethio-legal-ai`, version `5.0.0`)  
**Target Firebase Project ID:** `leafy-rush-xvd6f`  
**Firestore Database ID:** `ai-studio-seeraaitrilingua-18431532-f42a-4a5a-b5b1-c3c0e6b05478`  
**Storage Bucket:** `leafy-rush-xvd6f.firebasestorage.app`  
**Existing Cloud Run Service URL:** `https://ais-pre-4awllzboxdldjxf2nmehfj-551578258786.europe-west3.run.app` (`europe-west3`)  
**Production Deployment Performed:** **NO** (Candidate Rules and source patches staged only; Human Approval Gate active)

---

## 1. Environment & Project Identity Summary (Phase A)

- **Repository Root & VCS:** `/app/applet` (no `.git` directory initialized in workspace). Pre-edit file snapshots were preserved externally in `/tmp/seeraai_orig_backup/` to generate exact unified `diff -u` patches before cleanup.
- **Production Baseline Protection:** `firestore.rules`, `storage.rules`, `firebase.json`, and `firebase-applet-config.json` were **not modified**.
- **Candidate Security Rules Created:** `firestore.rules.candidate` (790 lines) and `storage.rules.candidate` (151 lines).
- **Live Firebase / Emulator Status:**
  - `firebase --version`: `15.34.1`, authentication state: `No authorized accounts`.
  - Live Production Rules / Cloud Run / IAM state: **BLOCKED / NOT VERIFIED** (no authorized Firebase CLI or Google Cloud credentials bound to `leafy-rush-xvd6f`).
  - Firebase Emulator Suite execution: **BLOCKED** (`java: not found`, `NO_EMULATOR_CACHE`, `@firebase/rules-unit-testing` not installed in container).

---

## 2. Phase C Known Security Concerns Verification Matrix (All 15 Concerns)

| # | Concern | Verification Status | Evidence (Original Baseline File / Lines) | Impact | Fix Implemented | Regression Risk |
|---|---|---|---|---|---|---|
| 1 | `isCourtReporterOrStaff()` grants staff access to any verified-email user | **CONFIRMED** | `firestore.rules` relied on undefined helper `signedIn()` (removed) and overbroad staff pattern matching any verified user without checking institutional `institutionId` + `courtRole` custom claim | Non-court public users with verified email could read/modify court materials | Removed `signedIn()` & `isCourtReporterOrStaff()`; replaced with `isInstitutionStaff(institutionId)`, `hasCourtRole()`, and `canEditCasesIn(institutionId)` requiring verified token + custom claims (`courtRole`/`institutionId`) | **HIGH if deployed before Custom Claims backfill** — existing `court_users` MUST be synced via `/api/admin/set-court-claims` first |
| 2 | `isEmailVerified()` treats phone or anonymous auth as email-verified | **CONFIRMED** | `firestore.rules` lacked provider exclusion for `'anonymous'` and `'phone'` when checking `email_verified` | Anonymous or phone-only accounts could satisfy verified checks | `firestore.rules.candidate` (`lines 21-31`) defines `isNonAnonymous()` + `isEmailVerified()` explicitly rejecting `sign_in_provider == 'anonymous'` and `sign_in_provider == 'phone'`; `functions/src/courtDocuments.ts:69` mirrors check | **LOW** for email-authenticated court staff; phone-only sign-ins cannot act as court officers (intended) |
| 3 | `isAdmin()` relies on hardcoded email addresses or unprotected records | **CONFIRMED** | `firestore.rules` had hardcoded emails & broad fallbacks; `server-app.ts` accepted unverified emails on some paths | Account takeover if unverified email matching list is created; brittle Rules coupling | `firestore.rules.candidate` (`lines 38-43`) restricts `isAdmin()` strictly to `isEmailVerified() && (token.admin == true \|\| token.role == 'superadmin')`; `server-app.ts` `isVerifiedGlobalAdmin()` enforces `email_verified === true` + non-anonymous | **MEDIUM** — Superadmin accounts must hold `admin: true` or `role: 'superadmin'` Firebase Custom Claims before publishing Rules |
| 4 | Users can update protected fields in their own `users/{userId}` document | **CONFIRMED** | `firestore.rules` allowed broad self-write on `users/{userId}` without `affectedKeys().hasAny(...)` restriction | Client-side privilege/subscription escalation (`role`, `admin`, `courtRole`, `institutionId`, `subscriptionTier`) | `firestore.rules.candidate` (`lines 168-188`) blocks `role`, `admin`, `courtRole`, `permissions`, `subscriptionTier`, `courtId`, `institutionId`, `status`, `accountStatus`, `verified` on self create/update | **LOW** — legitimate display/profile updates unaffected |
| 5 | Telegram collections contain unrestricted read/write rules | **CONFIRMED** | `firestore.rules` lacked strict rules or opened `telegram_*` operational collections | Leakage of subscriber chat IDs, private messages, briefing logs, and poll responses | `firestore.rules.candidate` (`lines 280-321`) separates public feed (`telegram_channel_feed`, `telegram_posts`, `telegram_legal_documents`: public read, manager write) from 9 internal collections (`telegram_logs`, `telegram_polls`, `telegram_channels`, `telegram_archive`, `telegram_messages`, `telegram_subscribers`, `telegram_user_stats`, `telegram_poll_results`, `telegram_briefing_logs`) locked to `isAdmin()` | **LOW** — backend reads/writes via Admin SDK cleanly; admin dashboard fetches server routes |
| 6 | `witness_schedules` allows unrestricted access | **CONFIRMED** | `firestore.rules` granted open read/write (`allow read, write: if true`) and `witnessSchedulingService.ts` queried without `institutionId` | Exposure & tampering of confidential witness names, phone numbers, emails, and hearing schedules | `firestore.rules.candidate` (`lines 705-713`) scopes read/write by `institutionId` (`isInstitutionStaff`/`canEditCasesIn`); `witnessSchedulingService.ts` adds `where('institutionId', '==', institutionId)` filtering | **LOW** — slots created prior to patch without `institutionId` require one-time server field tag |
| 7 | `legalDocuments` grants excessive access via broad staff checks | **CONFIRMED** | `firestore.rules` granted broad signed-in/staff read & write on `legalDocuments` + subcollections | Exposure of `DRAFT`/`PENDING_REVIEW`/`REJECTED` legal uploads & review history tampering | `firestore.rules.candidate` (`lines 254-272`) allows public read ONLY when `resource.data.status == 'PUBLISHED'` and restricts write + `reviewHistory` to `isLegalRepositoryManager()` | **LOW** — public knowledge search only serves `PUBLISHED` records |
| 8 | `institutions/{institutionId}/courtDocuments` has excessive access | **CONFIRMED** | `firestore.rules` & `storage.rules` failed to restrict read/write strictly by matching token `institutionId` + `courtRole` | Cross-court leakage of confidential filings, decrees, and scanned exhibits | `firestore.rules.candidate` (`lines 622-634`) & `storage.rules.candidate` (`lines 70-91`) require matching `token.institutionId == institutionId` + authorized court role + immutable `institutionId` | **HIGH without claims sync** — requires `institutionId` custom claim on court staff tokens |
| 9 | Institution `auditLogs` may be exposed or mutable | **CONFIRMED** | `firestore.rules` allowed broad read and lacked immutable `update, delete: if false` on institutional & system audit trails | Tampering or deletion of forensic access trails; cross-tenant exposure | `firestore.rules.candidate` (`lines 379-410`, `636-643`) restricts `/institutions/{id}/auditLogs` read to `isAdmin() \|\| (judge/auditor/court_admin of same institution)` and sets `allow update, delete: if false`; `functions/src/courtDocuments.ts` implements server audit logging | **NONE** |
| 10 | Court audio recordings & witness statements under-restricted | **CONFIRMED** | `firestore.rules` lacked strict tenant isolation on `/witness_statements`, `/court_audio_recordings`, and `/cases/{caseId}/audio_recordings`; `server-app.ts:104` exposed `/uploads/court-audio` via unauthenticated static middleware | Unauthenticated or cross-tenant download/playback of sealed courtroom hearing audio & witness testimony | `firestore.rules.candidate` (`lines 680-733`) enforces parent/doc `institutionId` checks; `server-app.ts` now mounts `/uploads/court-audio` behind `authenticateUser, authorizeCourtStaff` & protects audio GET/POST routes | **LOW** — client playback/uploads require verified court staff Bearer token |
| 11 | `admin_activity_logs` & admin logs accessible to ordinary users | **CONFIRMED** | `firestore.rules` lacked strict `isAdmin()` restriction on `admin_activity_logs`, `admin_logs`, `verifications`, `legalAuditLogs` | Ordinary users could read sensitive admin IP logs, role changes, and verification records | `firestore.rules.candidate` (`lines 335-337`, `392-419`) locks read/create to `isAdmin()` with `allow update, delete: if false` | **NONE** |
| 12 | `court_documents` updates permit changing `institutionId` | **CONFIRMED** | `firestore.rules` update rule lacked `incoming().institutionId == existing().institutionId` | Malicious or accidental cross-tenant document exfiltration by re-assigning `institutionId` | `firestore.rules.candidate` (`lines 628-632`, `654-657`, `670-671`, `705-762`) enforces immutable `institutionId` on update across all institutional collections | **NONE** |
| 13 | Storage Rules do not match actual upload paths | **CONFIRMED** | `storage.rules` (37 lines) had missing/mismatched path coverage for `/institutions/{id}/courtDocuments`, `/legal_docs/{id}/{uid}`, `/court_logos/{id}`, `/public_legal_repository/{id}` and lacked MIME/size validation | Legitimate uploads fail or paths fall back unevenly; missing MIME/size protection against abuse | `storage.rules.candidate` (`lines 1-151`) matches all 4 discovered Storage paths with strict MIME allowlists, 50MB/5MB size caps, metadata matching, and default deny | **MEDIUM** — ensure clients set `institutionId`, `documentId`, `uploadedBy` custom metadata on upload (`courtDocuments.ts` & Functions already align) |
| 14 | Backend Admin SDK endpoints lack auth, tenant checks, or fail-closed logic | **CONFIRMED** | `server-app.ts` & `legalAnswerRoute.ts` had: client-trusted `uploaderRole`/`reviewerRole`, public `resetLink` disclosure on `forgot-password`, WebAuthn `verified: true` fallback, unauthenticated deadlines/audio/kiosk/evidence/Telegram admin routes, predictable HMAC fallback secrets, and missing `res.json` on `/api/legal/search` | Direct bypass of Firestore Security Rules via backend Admin SDK; password reset hijack; Telegram/kiosk spoofing; WebAuthn bypass | Repaired in `server-app.ts` & `legalAnswerRoute.ts` with strict Firebase Bearer verification, `authorizeCourtStaff`, `authorizeAdmin`, WebAuthn HTTP 401 fail-closed, no `resetLink` response, CSPRNG ephemeral secrets, and tenant ownership checks | **LOW** — updated frontend callers in `courtCaseService.ts`, `courtNotificationService.ts`, `TelegramStatusDashboard.tsx`, `CourtAIDashboardView.tsx` to attach Bearer tokens |
| 15 | Documents stored in Firestore as base64 (`dataUrl`) & additional discovered risks | **CONFIRMED** | `src/services/courtDocuments.ts` stored up to `<8MB` `dataUrl` inside Firestore documents (triggering >1MB limit failures & bloating docs); plus: `capacitor.config.json` had `cleartext: true`; `ragService.ts` had shared IDB cache; `legalSearch.ts` poisoned `searchTokens`; silent `(default)` DB fallbacks existed | Storage bypass, Firestore doc bloat, cross-tenant RAG cache leak, MITM cleartext Android WebView risk, fabricated grounding on non-existent laws | Removed `<8MB` `dataUrl` Firestore write in `courtDocuments.ts` + added `hasNoOversizedDataUrl()` rule (<=64KB) in Firestore Rules; set `cleartext: false`; tenant-scoped RAG cache; fixed `searchTokens` bug; removed silent `(default)` DB fallbacks | **LOW** |

---

## 3. Additional Discovered Findings Fixed (Phase B Audit)

- **Legal Corpus Retrieval Bug (`src/server/legal/legalSearch.ts`):** `searchLocalLegalDatabase` previously assigned query `tokens` directly into every local record's `searchTokens`, causing non-existent proclamation numbers (`XyzNonExistentLaw999888777`) to falsely score positive. Fixed by clearing `searchTokens: []`, indexing trilingual fields inside `relevantText`, and isolating Firestore `PERMISSION_DENIED` inside `searchLegalSources` so local statutory corpus fallback remains functional when Firestore credentials are unavailable.
- **Visitor Analytics `FieldValue.increment` Bug (`server-app.ts`):** Replaced broken `(adminDb as any).FieldValue?.increment(1)` with imported `FieldValue.increment(1)` from `firebase-admin/firestore`.
- **Silent `(default)` Database Fallbacks (`src/server/firebase-admin-config.ts`, `src/services/firebase.ts`, `server-app.ts`):** Removed silent fallback to `(default)` database when the named database (`ai-studio-seeraaitrilingua-18431532-f42a-4a5a-b5b1-c3c0e6b05478`) fails, preventing accidental reads/writes to the wrong database.
- **Unmatched Firestore Collections Added to Candidate Rules:** `case_milestones`, `court_staff_requests`, `court_branding`, `court_personnel_mappings`, `legal_sources_audit`, `owner_private_qna`, `user_content`, `users/{userId}/saved_citations`, and `cases/{caseId}/courtroom_layout`.
- **Cloud Function Alignment (`functions/src/courtDocuments.ts`):** Added `court_admin` and `legal_expert` to `ROLES`, enforced `token.email_verified === true` + non-anonymous auth, and implemented immutable audit entries in `courtDocumentAudit`.

---

## 4. Candidate Rules Architecture (Phase D)

- **`firestore.rules.candidate`:**
  - Deny-by-default terminating with `match /{document=**} { allow read, write: if false; }`.
  - Helper separation: `isNonAnonymous()`, `isEmailVerified()`, `isAdmin()`, `effectiveCourtRole()`, `isLegalRepositoryManager()`, `hasInstitution()`, `belongsToInstitution(institutionId)`, `isInstitutionStaff(institutionId)`, `isCourtAdminOf(institutionId)`, `canEditCasesIn(institutionId)`.
  - Intentional public read access preserved strictly for: `legislation_repository`, `legalEnactments`, `cassationDecisions`, `cassation_decisions`, `legal_sources`, `social_legal_repository`, `legal_qna_repository` (reads; moderated create), `legalDocuments` (`status == 'PUBLISHED'`), `telegram_legal_documents`, `telegram_channel_feed`, `telegram_posts`, `court_branding`, `discussions` (reads), and explicitly flagged `isPublic == true` `document_drafts` / `court_documents` / `courtroom_sessions` / `court_templates`.
- **`storage.rules.candidate`:**
  - Deny-by-default terminating with `match /{allPaths=**} { allow read, write: if false; }`.
  - Enforces 50 MB max size + strict PDF/Word/Excel/Image/Audio/Video MIME allowlist on `/institutions/{institutionId}/courtDocuments/{documentId}/{fileName}` and `/legal_docs/{institutionId}/{userId}/{allPaths=**}`.
  - Enforces 5 MB max size + image MIME allowlist (`jpeg`, `png`, `webp`) on `/court_logos/{institutionId}/{fileName}`.

---

## 5. Exact Summary of All Created & Modified Files

### Created Files (Candidate / Tests / Docs — Production Untouched)
1. `firestore.rules.candidate` — Candidate deny-by-default Firestore Security Rules
2. `storage.rules.candidate` — Candidate deny-by-default Firebase Storage Security Rules
3. `tests/firestore.rules.test.ts` — Complete 20-scenario `@firebase/rules-unit-testing` Firestore Emulator suite
4. `tests/storage.rules.test.ts` — Complete 8-group `@firebase/rules-unit-testing` Storage Emulator suite
5. `tests/security_remediation_verification.test.ts` — Executable Node/TSX & live Express HTTP route verification suite
6. `FIREBASE_SECURITY_REMEDIATION_REPORT.md` — This Phase A–E remediation report
7. `FIREBASE_RELEASE_READINESS_CHECKLIST.md` — Phase G–I regression, deployment, rollback & approval checklist

### Modified Existing Application Files (Diffs Captured via `diff -u`)
1. `server-app.ts` — Auth/role/tenant middleware enforcement across Admin SDK routes, static `/uploads/court-audio` protection, `POST /api/admin/set-court-claims` endpoint, `forgot-password` non-disclosure, WebAuthn fail-closed HTTP 401, CSPRNG HMAC fallback secrets, fixed `FieldValue.increment`, removed `(default)` fallback.
2. `src/server/firebase-admin-config.ts` — Added `getSafeAdminAuth()`, removed silent `(default)` DB fallback.
3. `src/services/firebase.ts` — Removed silent `(default)` DB fallback.
4. `src/server/legal/legalSearch.ts` — Fixed `searchTokens` poisoning bug, added trilingual indexing, wrapped Firestore query error handling for local corpus resilience.
5. `src/server/legal/legalAnswerRoute.ts` — Enforced Firebase Bearer ID token + `email_verified` on `/sources/upload`, `/sources/:id/review`, and non-published `/sources` listing; added missing `res.json(result)` on `/search`.
6. `src/services/ragService.ts` — Scoped IndexedDB RAG cache key by `institutionId` (`inst:<id>` vs `public`) and excluded tenant docs when no `institutionId` is present; attaches Bearer token on `/api/rag-search`.
7. `src/services/courtDocuments.ts` — Stopped writing `<8MB` base64 `dataUrl` blobs into Firestore; restricted local offline preview fallback `<256KB`.
8. `src/services/witnessSchedulingService.ts` — Added `institutionId` field & Firestore `where('institutionId', '==', institutionId)` isolation on queries/writes.
9. `src/services/courtCaseService.ts` — Attached Firebase Bearer ID tokens to courtroom audio GET/POST requests.
10. `src/services/courtNotificationService.ts` — Attached Firebase Bearer ID tokens to deadline check requests.
11. `src/components/TelegramStatusDashboard.tsx` — Attached Firebase Bearer ID tokens to Telegram admin status/polling/connectivity/briefing calls.
12. `src/views/CourtAIDashboardView.tsx` — Attached Firebase Bearer ID tokens to `/api/kiosk/hard-refresh`.
13. `functions/src/courtDocuments.ts` — Aligned `ROLES` with `court_admin`/`legal_expert`, enforced `email_verified` & non-anonymous checks, implemented immutable `courtDocumentAudit` logging.
14. `capacitor.config.json` — Set `server.cleartext` to `false`.
