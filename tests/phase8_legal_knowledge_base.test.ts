import assert from 'node:assert/strict';
import {
  calculateSha256,
  isAuthorizedLegalEditor,
  stageLegalSource,
  reviewLegalSource,
  listWorkflowLegalSources,
} from '../src/server/legal/legalSourceWorkflowService';
import { answerLegalQuestion } from '../src/server/legal/legalAnswerService';
import { searchLegalSources } from '../src/server/legal/legalSearch';

let passed = 0;
async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (err: any) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('--- STARTING PHASE 8 LEGAL KNOWLEDGE BASE & RETRIEVAL SUITE ---');

  // Test 1: Role Authorization
  await runTest('1. Role Authorization: Only authorized roles or owner email can stage/review sources', () => {
    assert.equal(isAuthorizedLegalEditor('admin'), true);
    assert.equal(isAuthorizedLegalEditor('judge'), true);
    assert.equal(isAuthorizedLegalEditor('legal_expert'), true);
    assert.equal(isAuthorizedLegalEditor('court_admin'), true);
    assert.equal(isAuthorizedLegalEditor(undefined, 'ayeledha@gmail.com'), true);
    assert.equal(isAuthorizedLegalEditor('advocate'), false);
    assert.equal(isAuthorizedLegalEditor('student'), false);
    assert.equal(isAuthorizedLegalEditor('public'), false);
    assert.equal(isAuthorizedLegalEditor(undefined, 'stranger@example.com'), false);
  });

  // Test 2: SHA-256 Checksum Calculation
  await runTest('2. Checksum: calculateSha256 produces deterministic 64-char hex digest', () => {
    const hash1 = calculateSha256('Heera Mootummaa Federaalaa 1995');
    const hash2 = calculateSha256('Heera Mootummaa Federaalaa 1995');
    const hash3 = calculateSha256('Labsii Hojjataa 1156/2011');
    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
    assert.equal(hash1.length, 64);
  });

  // Test 3: Unauthorized Upload Rejection
  await runTest('3. Security Gate: Unauthorized user upload is rejected with UNAUTHORIZED error', async () => {
    await assert.rejects(
      async () => {
        await stageLegalSource(null, {
          title: 'Unauthorized Proclamation',
          sourceType: 'proclamation',
          jurisdiction: 'federal',
          issuingInstitution: 'Random Body',
          legalIssueSummary: 'Unauthorized draft',
          holdingOrRule: 'None',
          fileName: 'draft.txt',
          fileMimeType: 'text/plain',
          uploaderUid: 'rogue_user',
          uploaderRole: 'public',
        });
      },
      /UNAUTHORIZED/
    );
  });

  // Test 4: Legal Source Staging & Checksum Duplicate Detection
  let stagedSourceId = '';
  const testFileBase64 = Buffer.from('Qabiyyee seeraa mirkanaa\'e kwt 12').toString('base64');
  await runTest('4. Staging & Checksum: Authorized upload stages source and prevents duplicates', async () => {
    const uploadRes = await stageLegalSource(null, {
      title: 'Labsii Bulchiinsa Magaalaa Lakk. 999/2016',
      sourceType: 'proclamation',
      jurisdiction: 'oromia',
      issuingInstitution: 'Caffee Oromiyaa',
      proclamationNumber: '999/2016',
      articleNumbers: ['12', '14'],
      legalIssueSummary: 'Dhimma bulchiinsa daangaa fi lafa magaalaa',
      holdingOrRule: 'Lafli magaalaa bifa kireetiin qofa kennama',
      relevantText: '[Kwt. 12] Lafli magaalaa caalbaasii ifa taheen qofa kennama.',
      fileName: 'labsii_999.txt',
      fileMimeType: 'text/plain',
      fileBase64: testFileBase64,
      uploaderUid: 'editor_user_01',
      uploaderRole: 'legal_expert',
    });

    assert.equal(uploadRes.ok, true);
    assert.equal(uploadRes.status, 'NEEDS_REVIEW');
    stagedSourceId = uploadRes.sourceId;
    assert.ok(stagedSourceId.startsWith('src_'));

    // Attempt duplicate upload with same content
    const duplicateRes = await stageLegalSource(null, {
      title: 'Labsii Bulchiinsa Magaalaa Copy',
      sourceType: 'proclamation',
      jurisdiction: 'oromia',
      issuingInstitution: 'Caffee Oromiyaa',
      legalIssueSummary: 'Duplicate attempt',
      holdingOrRule: 'Same rule',
      fileName: 'labsii_999_copy.txt',
      fileMimeType: 'text/plain',
      fileBase64: testFileBase64,
      uploaderUid: 'editor_user_02',
      uploaderRole: 'admin',
    });

    assert.equal(duplicateRes.ok, false);
    assert.equal(duplicateRes.duplicate, true);
    assert.equal(duplicateRes.sourceId, stagedSourceId);
  });

  // Test 5: Two-Person Review Constraint
  await runTest('5. Two-Person Review: Uploader cannot approve their own submission', async () => {
    await assert.rejects(
      async () => {
        await reviewLegalSource(null, {
          sourceId: stagedSourceId,
          action: 'APPROVE',
          reviewerUid: 'editor_user_01', // Same as uploader!
          reviewerRole: 'admin',
          reviewNotes: 'Self-approval attempt',
          enforceTwoPersonReview: true,
        });
      },
      /TWO_PERSON_REVIEW_VIOLATION/
    );
  });

  // Test 6: Workflow State Machine Transitions
  await runTest('6. State Machine: Separate reviewer approves and publishes source', async () => {
    // 1. Separate reviewer approves
    const approveRes = await reviewLegalSource(null, {
      sourceId: stagedSourceId,
      action: 'APPROVE',
      reviewerUid: 'judge_reviewer_02',
      reviewerRole: 'judge',
      reviewNotes: 'Verified against authentic Oromia Gazette copy.',
      enforceTwoPersonReview: true,
    });
    assert.equal(approveRes.ok, true);
    assert.equal(approveRes.status, 'APPROVED');

    // 2. Publish to knowledge base
    const publishRes = await reviewLegalSource(null, {
      sourceId: stagedSourceId,
      action: 'PUBLISH',
      reviewerUid: 'admin_publisher_03',
      reviewerRole: 'admin',
      reviewNotes: 'Published to official AI knowledge base.',
    });
    assert.equal(publishRes.ok, true);
    assert.equal(publishRes.status, 'PUBLISHED');

    // 3. Verify in list
    const sources = await listWorkflowLegalSources(null, { status: 'PUBLISHED' });
    const found = sources.find((s) => s.id === stagedSourceId);
    assert.ok(found);
    assert.equal(found?.status, 'VERIFIED');
    assert.equal(found?.sourceAuthenticityConfirmed, true);
  });

  // Test 7: Retrieval Engine & Grounded Legal Q&A
  await runTest('7. Retrieval Engine: Proclamation and Cassation searches retrieve verified citations', async () => {
    // Mock Firestore null -> uses verified local database
    const searchRes = await searchLegalSources(null as any, {
      query: 'labsii 1156',
      jurisdiction: 'federal',
      maxResults: 5,
    });
    assert.equal(searchRes.ok, true);
    assert.ok(searchRes.results.length > 0);
    const top = searchRes.results[0];
    assert.ok(top.title.includes('1156') || top.proclamationNumber?.includes('1156'));
    assert.equal(top.status, 'VERIFIED');
  });

  // Test 8: Strict Anti-Fabrication Gate ("Maddi seeraa gahaa hin jiru")
  await runTest('8. Anti-Fabrication: Query with non-existent law returns explicit limitation', async () => {
    // Querying for completely fabricated law number that does not exist
    const nonExistentRes = await answerLegalQuestion(
      null as any,
      {
        question: 'Labsii Lakk 99999999/2099 kwt 8888 maal jedha?',
        language: 'om',
        jurisdiction: 'federal',
      },
      'req_anti_fab_test'
    );

    assert.equal(nonExistentRes.ok, true);
    assert.equal(nonExistentRes.verification, 'INSUFFICIENT_SOURCES');
    assert.equal(nonExistentRes.citations.length, 0);
    assert.ok(nonExistentRes.answer.includes('Maddi seeraa gahaa hin jiru'));
  });

  // Test 9: Trilingual Legal Q&A Response
  await runTest('9. Multilingual Equivalence: Answer engine respects selected language', async () => {
    const amharicRes = await answerLegalQuestion(
      null as any,
      {
        question: 'የቅጥር ውል ማቋረጥ እና ካሳ ክፍያ',
        language: 'am',
        jurisdiction: 'federal',
      },
      'req_am_test'
    );
    assert.equal(amharicRes.ok, true);
    assert.equal(amharicRes.language, 'am');
    assert.ok(amharicRes.citations.length > 0);

    const englishRes = await answerLegalQuestion(
      null as any,
      {
        question: 'Termination of employment contract and severance pay',
        language: 'en',
        jurisdiction: 'federal',
      },
      'req_en_test'
    );
    assert.equal(englishRes.ok, true);
    assert.equal(englishRes.language, 'en');
    assert.ok(englishRes.citations.length > 0);
  });

  console.log(`\nALL EXECUTED PHASE 8 TESTS PASSED: ${passed}/9`);
}

main().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
