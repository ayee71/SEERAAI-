/**
 * SEERAAI PRO — Candidate Firebase Storage Security Rules Verification Suite (Phase 8B.6.8)
 * Target Ruleset: storage.rules.phase8b5.4.integrated.candidate
 * Target Project: demo-seeraai-test (isolated emulator only)
 *
 * Verifies:
 *  - 50 MB boundary (below 50 MB, exact 50 MB, above 50 MB)
 *  - Metadata & MIME validation (institutionId, documentId, uploadedBy)
 *  - Anonymous Guest vs Unverified vs Verified User vs Court Staff isolation
 *  - Unauthorized overwrite/delete protections, court logos, court audio, personal & public repos
 *
 * Run with:
 *   firebase emulators:exec --config firebase.emulator.test.json --project demo-seeraai-test --only storage "npx tsx tests/storage.rules.test.ts"
 */
import fs from 'node:fs';
import path from 'node:path';

interface StorageTestResult {
  id: number;
  name: string;
  passed: boolean;
  detail?: string;
}

const FIFTY_MB = 50 * 1024 * 1024;

async function runStorageRulesSuite(): Promise<void> {
  let testingModule: any;
  try {
    testingModule = await import('@firebase/rules-unit-testing' as string);
  } catch {
    console.error(
      'BLOCKED: @firebase/rules-unit-testing is not installed and Java JRE / Firebase Storage Emulator is required.'
    );
    console.error(
      'Next step: Install Java JRE + devDependency @firebase/rules-unit-testing, then execute:\n  firebase emulators:exec --config firebase.emulator.test.json --project demo-seeraai-test --only storage "npx tsx tests/storage.rules.test.ts"'
    );
    process.exit(2);
  }

  const { initializeTestEnvironment, assertFails, assertSucceeds } = testingModule;
  const rulesPath = path.resolve(process.cwd(), 'storage.rules.phase8b5.4.integrated.candidate');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId: 'demo-seeraai-test',
    storage: {
      rules,
      host: '127.0.0.1',
      port: 9199,
    },
  });

  const INST_A = 'inst_oromia_a';
  const INST_B = 'inst_federal_b';
  const samplePdf = Buffer.from('%PDF-1.4\n%SEERAAI test');
  const samplePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const sampleAudio = Buffer.from('ID3_TEST_AUDIO');

  await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
    const st = ctx.storage();
    await st.ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`).put(samplePdf, {
      contentType: 'application/pdf',
      customMetadata: { institutionId: INST_A, documentId: 'doc_a1', uploadedBy: 'judge_a1' },
    });
    await st.ref(`institutions/${INST_B}/courtDocuments/doc_b1/sealed.pdf`).put(samplePdf, {
      contentType: 'application/pdf',
      customMetadata: { institutionId: INST_B, documentId: 'doc_b1', uploadedBy: 'judge_b1' },
    });
    await st.ref(`court_logos/${INST_A}/logo.png`).put(samplePng, { contentType: 'image/png' });
    await st.ref(`court_audio/${INST_A}/hearing_1.mp3`).put(sampleAudio, { contentType: 'audio/mpeg' });
    await st.ref('public_legal_repository/proc_1156/law.pdf').put(samplePdf, { contentType: 'application/pdf' });
  });

  const unauthStorage = () => testEnv.unauthenticatedContext().storage();
  const anonStorage = () => testEnv.authenticatedContext('anon_1', { firebase: { sign_in_provider: 'anonymous' } }).storage();
  const phoneStorage = () => testEnv.authenticatedContext('phone_1', { phone_number: '+251911000000', email_verified: true, firebase: { sign_in_provider: 'phone' } }).storage();
  const unverifiedStorage = () => testEnv.authenticatedContext('unver_1', { email: 'unver@example.org', email_verified: false, courtRole: 'judge', institutionId: INST_A, firebase: { sign_in_provider: 'password' } }).storage();
  const verifiedNoRoleStorage = () => testEnv.authenticatedContext('user_1', { email: 'user1@example.org', email_verified: true, firebase: { sign_in_provider: 'password' } }).storage();
  const judgeAStorage = () => testEnv.authenticatedContext('judge_a1', { email: 'judge.a1@court.gov.et', email_verified: true, courtRole: 'judge', institutionId: INST_A, firebase: { sign_in_provider: 'password' } }).storage();
  const courtAdminAStorage = () => testEnv.authenticatedContext('cadmin_a1', { email: 'admin.a1@court.gov.et', email_verified: true, courtRole: 'court_admin', institutionId: INST_A, firebase: { sign_in_provider: 'password' } }).storage();
  const auditorAStorage = () => testEnv.authenticatedContext('aud_a1', { email: 'aud.a1@court.gov.et', email_verified: true, courtRole: 'auditor', institutionId: INST_A, firebase: { sign_in_provider: 'password' } }).storage();
  const legalContentMgrStorage = () => testEnv.authenticatedContext('lcm_1', { email: 'lcm@seeraai.et', email_verified: true, legalContentManager: true, firebase: { sign_in_provider: 'password' } }).storage();
  const missingFirebaseMapStorage = () => testEnv.authenticatedContext('missing_fb_1', { email: 'nofb@example.org', email_verified: true, firebase: undefined as any }).storage();

  const results: StorageTestResult[] = [];
  const check = async (id: number, name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ id, name, passed: true });
      console.log(`PASS [${id}]: ${name}`);
    } catch (err: any) {
      results.push({ id, name, passed: false, detail: err?.message || String(err) });
      console.error(`FAIL [${id}]: ${name} -> ${err?.message || err}`);
    }
  };

  try {
    await check(1, 'Unauthenticated, anonymous Guest, phone, and unverified users denied reading/writing private & court Storage paths', async () => {
      await assertFails(unauthStorage().ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`).getDownloadURL());
      await assertFails(anonStorage().ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`).getDownloadURL());
      await assertFails(anonStorage().ref('legal_docs/personal_anon_1/anon_1/note.pdf').put(samplePdf, { contentType: 'application/pdf' }));
      await assertFails(phoneStorage().ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`).getDownloadURL());
      await assertFails(phoneStorage().ref('legal_docs/personal_phone_1/phone_1/note.pdf').put(samplePdf, { contentType: 'application/pdf' }));
      await assertFails(unverifiedStorage().ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`).getDownloadURL());
      await assertFails(unverifiedStorage().ref('legal_docs/personal_unver_1/unver_1/note.pdf').put(samplePdf, { contentType: 'application/pdf' }));
    });

    await check(2, 'Verified user without institutional role denied reading or writing institutional court documents', async () => {
      await assertFails(verifiedNoRoleStorage().ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`).getDownloadURL());
      await assertFails(
        verifiedNoRoleStorage()
          .ref(`institutions/${INST_A}/courtDocuments/doc_unauth/doc.pdf`)
          .put(samplePdf, {
            contentType: 'application/pdf',
            customMetadata: { institutionId: INST_A, documentId: 'doc_unauth', uploadedBy: 'user_1' },
          })
      );
    });

    await check(3, 'Authorized Institution A judge reads Institution A docs, denied Institution B docs & writes', async () => {
      await assertSucceeds(judgeAStorage().ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`).getDownloadURL());
      await assertFails(judgeAStorage().ref(`institutions/${INST_B}/courtDocuments/doc_b1/sealed.pdf`).getDownloadURL());
      await assertFails(
        judgeAStorage()
          .ref(`institutions/${INST_B}/courtDocuments/doc_b_cross/cross.pdf`)
          .put(samplePdf, {
            contentType: 'application/pdf',
            customMetadata: { institutionId: INST_B, documentId: 'doc_b_cross', uploadedBy: 'judge_a1' },
          })
      );
    });

    await check(4, '50 MB boundary: just below 50 MB (50MB-1) and exact 50 MB accepted; just above 50 MB (50MB+1) rejected', async () => {
      {
        const justBelow50MB = Buffer.alloc(FIFTY_MB - 1, 0x25);
        await assertSucceeds(
          judgeAStorage()
            .ref(`institutions/${INST_A}/courtDocuments/doc_below50/below.pdf`)
            .put(justBelow50MB, {
              contentType: 'application/pdf',
              customMetadata: { institutionId: INST_A, documentId: 'doc_below50', uploadedBy: 'judge_a1' },
            })
        );
      }

      {
        const exact50MB = Buffer.alloc(FIFTY_MB, 0x25);
        await assertSucceeds(
          judgeAStorage()
            .ref(`institutions/${INST_A}/courtDocuments/doc_exact50/exact.pdf`)
            .put(exact50MB, {
              contentType: 'application/pdf',
              customMetadata: { institutionId: INST_A, documentId: 'doc_exact50', uploadedBy: 'judge_a1' },
            })
        );
      }

      {
        const justAbove50MB = Buffer.alloc(FIFTY_MB + 1, 0x25);
        await assertFails(
          judgeAStorage()
            .ref(`institutions/${INST_A}/courtDocuments/doc_above50/above.pdf`)
            .put(justAbove50MB, {
              contentType: 'application/pdf',
              customMetadata: { institutionId: INST_A, documentId: 'doc_above50', uploadedBy: 'judge_a1' },
            })
        );
      }
    });

    await check(5, 'Metadata validation: reject missing institutionId, wrong documentId, and wrong uploadedBy UID', async () => {
      await assertFails(
        judgeAStorage()
          .ref(`institutions/${INST_A}/courtDocuments/doc_meta1/missing_inst.pdf`)
          .put(samplePdf, {
            contentType: 'application/pdf',
            customMetadata: { documentId: 'doc_meta1', uploadedBy: 'judge_a1' },
          })
      );
      await assertFails(
        judgeAStorage()
          .ref(`institutions/${INST_A}/courtDocuments/doc_meta2/wrong_doc.pdf`)
          .put(samplePdf, {
            contentType: 'application/pdf',
            customMetadata: { institutionId: INST_A, documentId: 'other_doc_id', uploadedBy: 'judge_a1' },
          })
      );
      await assertFails(
        judgeAStorage()
          .ref(`institutions/${INST_A}/courtDocuments/doc_meta3/wrong_uid.pdf`)
          .put(samplePdf, {
            contentType: 'application/pdf',
            customMetadata: { institutionId: INST_A, documentId: 'doc_meta3', uploadedBy: 'other_user_uid' },
          })
      );
    });

    await check(6, 'Reject disallowed MIME types (text/html, application/x-msdownload) & auditor writes', async () => {
      await assertFails(
        judgeAStorage()
          .ref(`institutions/${INST_A}/courtDocuments/doc_bad_html/payload.html`)
          .put(Buffer.from('<script>alert(1)</script>'), {
            contentType: 'text/html',
            customMetadata: { institutionId: INST_A, documentId: 'doc_bad_html', uploadedBy: 'judge_a1' },
          })
      );
      await assertFails(
        judgeAStorage()
          .ref(`institutions/${INST_A}/courtDocuments/doc_bad_exe/malware.exe`)
          .put(Buffer.from('MZ'), {
            contentType: 'application/x-msdownload',
            customMetadata: { institutionId: INST_A, documentId: 'doc_bad_exe', uploadedBy: 'judge_a1' },
          })
      );
      await assertFails(
        auditorAStorage()
          .ref(`institutions/${INST_A}/courtDocuments/doc_aud_write/tamper.pdf`)
          .put(samplePdf, {
            contentType: 'application/pdf',
            customMetadata: { institutionId: INST_A, documentId: 'doc_aud_write', uploadedBy: 'aud_a1' },
          })
      );
    });

    await check(7, 'Unauthorized overwrite & delete denied; court_admin delete allowed for own institution', async () => {
      await assertFails(auditorAStorage().ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`).delete());
      await assertFails(judgeAStorage().ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`).delete());
      await assertFails(courtAdminAStorage().ref(`institutions/${INST_B}/courtDocuments/doc_b1/sealed.pdf`).delete());
      await assertFails(
        auditorAStorage()
          .ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`)
          .put(samplePdf, {
            contentType: 'application/pdf',
            customMetadata: { institutionId: INST_A, documentId: 'doc_a1', uploadedBy: 'aud_a1' },
          })
      );
      await assertSucceeds(courtAdminAStorage().ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`).delete());
    });

    await check(8, 'Personal /legal_docs/personal_{uid}/{uid} scoped strictly to verified owner; cross-user denied', async () => {
      await assertSucceeds(
        verifiedNoRoleStorage()
          .ref('legal_docs/personal_user_1/user_1/brief.pdf')
          .put(samplePdf, { contentType: 'application/pdf' })
      );
      await assertFails(
        verifiedNoRoleStorage()
          .ref('legal_docs/personal_judge_a1/judge_a1/secret.pdf')
          .put(samplePdf, { contentType: 'application/pdf' })
      );
    });

    await check(9, 'Court logos allow public read, restrict upload to verified institution court_admin (<=5MB)', async () => {
      await assertSucceeds(anonStorage().ref(`court_logos/${INST_A}/logo.png`).getDownloadURL());
      await assertSucceeds(courtAdminAStorage().ref(`court_logos/${INST_A}/seal.png`).put(samplePng, { contentType: 'image/png' }));
      await assertFails(judgeAStorage().ref(`court_logos/${INST_A}/seal2.png`).put(samplePng, { contentType: 'image/png' }));
      await assertFails(courtAdminAStorage().ref(`court_logos/${INST_B}/hijack.png`).put(samplePng, { contentType: 'image/png' }));
    });

    await check(10, 'Court audio allows court staff, denies Guest/ordinary; public legal repo readable by Guest, writable by managers; default deny', async () => {
      await assertSucceeds(judgeAStorage().ref(`court_audio/${INST_A}/hearing_1.mp3`).getDownloadURL());
      await assertFails(anonStorage().ref(`court_audio/${INST_A}/hearing_1.mp3`).getDownloadURL());
      await assertFails(verifiedNoRoleStorage().ref(`court_audio/${INST_A}/hearing_1.mp3`).getDownloadURL());

      await assertSucceeds(anonStorage().ref('public_legal_repository/proc_1156/law.pdf').getDownloadURL());
      await assertFails(anonStorage().ref('public_legal_repository/proc_1156/fake.pdf').put(samplePdf, { contentType: 'application/pdf' }));
      await assertFails(verifiedNoRoleStorage().ref('public_legal_repository/proc_1156/fake.pdf').put(samplePdf, { contentType: 'application/pdf' }));
      await assertFails(judgeAStorage().ref('arbitrary_unprotected/secret.pdf').put(samplePdf, { contentType: 'application/pdf' }));
    });

    await check(11, 'Missing optional custom claims & missing firebase provider fail closed safely; legalContentManager allowed on public_legal_repository', async () => {
      await assertSucceeds(
        legalContentMgrStorage()
          .ref('public_legal_repository/proc_lcm_1/enactment.pdf')
          .put(samplePdf, { contentType: 'application/pdf' })
      );
      await assertFails(
        missingFirebaseMapStorage()
          .ref('legal_docs/personal_missing_fb_1/missing_fb_1/note.pdf')
          .put(samplePdf, { contentType: 'application/pdf' })
      );
      await assertFails(
        missingFirebaseMapStorage()
          .ref(`institutions/${INST_A}/courtDocuments/doc_a1/order.pdf`)
          .getDownloadURL()
      );
    });
  } finally {
    await testEnv.cleanup();
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\nStorage Rules Emulator Suite: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

runStorageRulesSuite().catch((err) => {
  console.error('Storage rules suite error:', err);
  process.exit(1);
});
