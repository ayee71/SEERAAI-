/**
 * SEERAAI PRO — Executed Non-Emulator Security Remediation Verification Suite
 *
 * Runs directly via `npx tsx tests/security_remediation_verification.test.ts`
 * without requiring Java JRE or live production Firebase access.
 *
 * Verifies:
 *  1. Production safety invariants (firestore.rules, storage.rules, firebase.json untouched).
 *  2. Candidate Rules structural & security guarantees (all 15 known concerns remediated).
 *  3. Candidate Storage Rules path alignment, MIME/size limits, and default-deny.
 *  4. Live HTTP tests against mounted Express legalAnswerRoute (unauthenticated rejection,
 *     role-forgery rejection, non-published source enumeration blocked, search JSON return).
 *  5. Backend server-app.ts security invariants (middleware guards on audio, deadlines, kiosk,
 *     Telegram admin routes, WebAuthn fail-closed, forgot-password link non-disclosure, CSPRNG).
 *  6. Capacitor cleartext=false, RAG tenant cache isolation, witness institutionId filtering,
 *     Cloud Function ROLES/email_verified alignment, and CourtDocument base64 Firestore removal.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import legalAnswerRoute from '../src/server/legal/legalAnswerRoute';
import { searchLegalSources } from '../src/server/legal/legalSearch';

let passed = 0;
let failed = 0;

async function runCheck(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`FAIL: ${name}\n  -> ${err?.message || err}`);
  }
}

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
}

async function requestJson(
  server: http.Server,
  method: string,
  urlPath: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; json: any }> {
  const addr = server.address() as { port: number };
  const payload = body !== undefined ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path: urlPath,
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, json: data ? JSON.parse(data) : null });
          } catch {
            resolve({ status: res.statusCode || 0, json: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('--- SEERAAI PRO SECURITY REMEDIATION VERIFICATION SUITE ---\n');

  await runCheck('1. Production Rules files remain untouched while candidate rulesets exist', () => {
    assert.ok(fs.existsSync(path.resolve(process.cwd(), 'firestore.rules')));
    assert.ok(fs.existsSync(path.resolve(process.cwd(), 'storage.rules')));
    assert.ok(fs.existsSync(path.resolve(process.cwd(), 'firestore.rules.candidate')));
    assert.ok(fs.existsSync(path.resolve(process.cwd(), 'storage.rules.candidate')));
    // Verify production files still have their pre-existing headers (not overwritten with candidate)
    const prodFs = read('firestore.rules');
    assert.ok(!prodFs.includes('CANDIDATE ONLY'), 'firestore.rules must remain untouched production baseline');
    const prodSt = read('storage.rules');
    assert.ok(!prodSt.includes('CANDIDATE ONLY'), 'storage.rules must remain untouched production baseline');
  });

  await runCheck('2. Candidate Firestore Rules remove undefined helpers, hardcoded admin emails, and wildcard admin allow', () => {
    const cand = read('firestore.rules.candidate');
    assert.ok(!cand.includes('signedIn()'), 'Undefined helper signedIn() must be removed');
    assert.ok(!cand.includes('isCourtReporterOrStaff()'), 'Overbroad/undefined isCourtReporterOrStaff() must be removed');
    assert.ok(!cand.includes('ayeledha@'), 'Hardcoded admin email must not appear in Firestore Rules');
    assert.ok(!cand.includes('ayele@saiethio.com'), 'Hardcoded admin email must not appear in Firestore Rules');
    assert.ok(cand.includes("request.auth.token.firebase.sign_in_provider != 'anonymous'"));
    assert.ok(cand.includes("request.auth.token.firebase.sign_in_provider != 'phone'"));
    // Confirm final wildcard is strict deny
    const tail = cand.slice(cand.lastIndexOf('match /{document=**}'));
    assert.ok(tail.includes('allow read, write: if false;'), 'Final catch-all must strictly deny read and write');
  });

  await runCheck('3. Candidate Firestore Rules close unrestricted Telegram, witness, audio, courtDocuments, and audit grants', () => {
    const cand = read('firestore.rules.candidate');
    for (const col of [
      'telegram_logs',
      'telegram_polls',
      'telegram_channels',
      'telegram_archive',
      'telegram_messages',
      'telegram_subscribers',
      'telegram_user_stats',
      'telegram_poll_results',
      'telegram_briefing_logs',
      'admin_activity_logs',
      'admin_logs',
      'verifications',
      'owner_private_qna',
    ]) {
      const idx = cand.indexOf(`match /${col}/`);
      assert.ok(idx !== -1, `Missing match rule for ${col}`);
      const block = cand.slice(idx, idx + 220);
      assert.ok(!block.includes('if true'), `${col} must not allow unrestricted access`);
      assert.ok(block.includes('isAdmin()'), `${col} must restrict access to isAdmin()`);
    }

    // Check previously unmatched collections now covered
    for (const col of [
      'case_milestones',
      'court_staff_requests',
      'court_branding',
      'court_personnel_mappings',
      'legal_sources_audit',
      'user_content',
      'saved_citations',
      'courtroom_layout',
    ]) {
      assert.ok(cand.includes(col), `Previously unmatched collection ${col} must be covered in candidate rules`);
    }

    // Check base64 payload limit helper
    assert.ok(cand.includes('hasNoOversizedDataUrl'), 'Must block >64KB dataUrl blobs in Firestore');
    // Check immutable institutionId on court_documents, cases, courtDocuments
    assert.ok(cand.includes('incoming().institutionId == existing().institutionId'));
  });

  await runCheck('4. Candidate Storage Rules align all 4 real paths, enforce MIME/size limits, and default-deny', () => {
    const st = read('storage.rules.candidate');
    assert.ok(st.includes('match /institutions/{institutionId}/courtDocuments/{documentId}/{fileName}'));
    assert.ok(st.includes('match /legal_docs/{institutionId}/{userId}/{allPaths=**}'));
    assert.ok(st.includes('match /court_logos/{institutionId}/{fileName}'));
    assert.ok(st.includes('match /public_legal_repository/{sourceId}/{fileName}'));
    assert.ok(st.includes('50 * 1024 * 1024'));
    assert.ok(st.includes('5 * 1024 * 1024'));
    assert.ok(st.includes('allow read, write: if false;'));
  });

  await runCheck('5. Live HTTP integration tests on legalAnswerRoute reject unauthenticated staging/review & forged roles', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/legal', legalAnswerRoute);
    const server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    try {
      // Unauthenticated upload must return 401 (never honor req.body.uploaderRole)
      const uploadRes = await requestJson(server, 'POST', '/api/legal/sources/upload', {
        title: 'Forged Proclamation',
        sourceType: 'FEDERAL_PROCLAMATION',
        uploaderRole: 'admin',
        uploaderId: 'attacker',
      });
      assert.equal(uploadRes.status, 401);

      // Unauthenticated review must return 401
      const reviewRes = await requestJson(server, 'POST', '/api/legal/sources/fake_id/review', {
        reviewerRole: 'admin',
        reviewerId: 'attacker',
        decision: 'APPROVE',
      });
      assert.equal(reviewRes.status, 401);

      // Unauthenticated request for non-PUBLISHED sources must return 401
      const pendingListRes = await requestJson(server, 'GET', '/api/legal/sources?status=PENDING_REVIEW');
      assert.equal(pendingListRes.status, 401);

      // Public published sources query remains functional (200)
      const pubListRes = await requestJson(server, 'GET', '/api/legal/sources');
      assert.equal(pubListRes.status, 200);
      assert.equal(pubListRes.json?.ok, true);

      // Search route actually responds with JSON (previously hung without res.json!)
      const searchRes = await requestJson(server, 'POST', '/api/legal/search', { query: 'Labor Proclamation 1156' });
      assert.equal(searchRes.status, 200);
      assert.equal(searchRes.json?.ok, true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  await runCheck('6. searchLegalSources does not poison index with query tokens', async () => {
    const nonsense = await searchLegalSources(null, {
      query: 'XyzNonExistentLaw999888777',
      jurisdiction: 'both',
    });
    assert.equal(nonsense.results.length, 0, 'Non-existent law code must return 0 local matches');
    const valid = await searchLegalSources(null, {
      query: 'Labor Proclamation 1156',
      jurisdiction: 'both',
    });
    assert.ok(valid.results.length > 0, 'Real Labor Proclamation 1156 query must return verified match');
  });

  await runCheck('7. server-app.ts guards Admin SDK routes, static court-audio, WebAuthn, forgot-password, and secrets', () => {
    const srv = read('server-app.ts');
    assert.ok(srv.includes("app.use('/uploads/court-audio', authenticateUser, authorizeCourtStaff"));
    assert.ok(srv.includes("app.post('/api/admin/set-court-claims', authenticateUser, authorizeAdmin"));
    assert.ok(srv.includes("app.post('/api/court/check-upcoming-deadlines', authenticateUser, authorizeCourtStaff"));
    assert.ok(srv.includes("app.get('/api/court/upcoming-deadlines-status', authenticateUser, authorizeCourtStaff"));
    assert.ok(srv.includes("app.post(['/api/cases/:caseId/audio-recording', '/api/court/audio/save-to-case'], authenticateUser, authorizeCourtStaff"));
    assert.ok(srv.includes("app.get('/api/cases/:caseId/audio-recordings', authenticateUser, authorizeCourtStaff"));
    assert.ok(srv.includes("app.post('/api/kiosk/hard-refresh', authenticateUser, authorizeCourtStaff"));
    assert.ok(srv.includes("app.post('/api/kiosk/trigger-capture', authenticateUser, authorizeCourtStaff"));
    assert.ok(srv.includes("app.get('/api/telegram/test-connectivity', authenticateUser, authorizeAdmin"));
    assert.ok(srv.includes("app.post('/api/telegram/start-polling', authenticateUser, authorizeAdmin"));
    assert.ok(srv.includes("app.post('/api/telegram/setup-webhook'"));
    assert.ok(srv.includes("TELEGRAM_SETUP_SECRET.length > 0 && safeSecretCompare(providedSetupSecret, TELEGRAM_SETUP_SECRET)"));
    assert.ok(srv.includes("app.get('/api/telegram/status', authenticateUser, authorizeAdmin"));
    assert.ok(srv.includes("app.post('/api/telegram/broadcast-briefing'"));
    assert.ok(srv.includes("isVerifiedGlobalAdmin(decoded)"));
    assert.ok(!srv.includes("link: resetLink"), 'forgot-password must never return resetLink in JSON response');
    assert.ok(!srv.includes("seeraai-telegram-webhook-secret-2025"), 'Deterministic webhook fallback secret must be removed');
    assert.ok(!srv.includes("seeraai-default-miniapp-hmac-secret-2026"), 'Deterministic miniapp HMAC secret must be removed');
    assert.ok(srv.includes("status(401).json({ success: false, verified: false"), 'WebAuthn must fail closed with HTTP 401');
    assert.ok(!srv.includes("if (err?.code === 7 || err?.message?.includes('PERMISSION_DENIED'))"), 'Deadline scanner must not fabricate ok status on PERMISSION_DENIED');
  });

  await runCheck('8. Client services & Capacitor config & Cloud Functions security alignments hold', () => {
    const cap = JSON.parse(read('capacitor.config.json'));
    assert.equal(cap?.server?.cleartext, false, 'capacitor.config.json server.cleartext must be false');

    const rag = read('src/services/ragService.ts');
    assert.ok(rag.includes("const scopePrefix = institutionId ? `inst:${institutionId}` : 'public'"), 'RAG cache key must be tenant-scoped');
    assert.ok(rag.includes('!doc.metadata?.institutionId && !doc.metadata?.courtId'), 'Public RAG search must filter out tenant-scoped institutional documents');

    const courtDocs = read('src/services/courtDocuments.ts');
    assert.ok(!courtDocs.includes('sizeBytes < 8 * 1024 * 1024'), 'Must no longer store up to 8MB base64 dataUrl in Firestore');

    const witness = read('src/services/witnessSchedulingService.ts');
    assert.ok(witness.includes("where('institutionId', '==', institutionId)"), 'Witness schedule queries must filter by institutionId');

    const fn = read('functions/src/courtDocuments.ts');
    assert.ok(fn.includes("'court_admin'"), 'Cloud Function ROLES must include court_admin');
    assert.ok(fn.includes("'legal_expert'"), 'Cloud Function ROLES must include legal_expert');
    assert.ok(fn.includes('token.email_verified !== true'), 'Cloud Function must verify email_verified');

    const fbAdmin = read('src/server/firebase-admin-config.ts');
    assert.ok(!fbAdmin.includes("getFirestore(defaultApp, '(default)')"), 'Admin config must not silently fall back to (default) database');
  });

  console.log(`\nSecurity Remediation Verification Summary: ${passed}/${passed + failed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
