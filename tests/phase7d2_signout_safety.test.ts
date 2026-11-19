import assert from 'node:assert/strict';
import {
  acquireSignOutLock,
  releaseSignOutLock,
  isWriteLocked,
  trackInFlightWrite,
  drainInFlightWrites,
  isRecordServerConfirmed,
  buildLocalDataInventory,
  purgeSensitiveAppStorage,
  getIsolationLockdownState,
  clearIsolationLockdownState,
  checkAccountSwitchAllowed,
  createSignOutCoordinator,
  registerTabHeartbeat,
  getOtherActiveTabs,
  buildLocalBackupPayload,
  ISOLATION_LOCKDOWN_STORAGE_KEY,
} from '../src/services/signOutSafetyService';
import {
  OFFLINE_DB_NAME,
  safeDeleteOfflineDB,
  hasPendingOfflineDBDeletion,
  ALL_OFFLINE_DB_STORES,
} from '../src/services/indexedDb';
import {
  saveOfflineCaseDraft,
  getOfflineCaseDrafts,
  syncOfflineCaseDraftsToServer,
} from '../src/services/precedentOfflineSync';

// ---------------------------------------------------------------------------
// Minimal Deterministic Browser Storage & IndexedDB Test Harnesses
// ---------------------------------------------------------------------------

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

function makeInventoryReader(storesOverride?: Partial<Record<string, any[]>>, ok = true, error?: string) {
  const fullStores: Record<string, any[]> = {};
  for (const name of ALL_OFFLINE_DB_STORES) {
    fullStores[name] = storesOverride?.[name] ? [...storesOverride[name]!] : [];
  }
  return {
    readAllStores: async () => ({
      ok,
      error,
      stores: fullStores,
    }),
  };
}

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
  // Verify exact 13 object stores schema invariant
  await runTest('1. Object store inventory matches exact 13 verified SeeraAIOfflineDB stores', () => {
    assert.deepEqual([...ALL_OFFLINE_DB_STORES], [
      'documents',
      'translations',
      'edits',
      'rag_cache',
      'legislation',
      'active_case',
      'deadlines',
      'case_files',
      'templates',
      'sync_queue',
      'sync_logs',
      'institutions',
      'users',
    ]);
  });

  // Proof model test: local status/timestamp never qualifies as server-confirmed
  await runTest('2. isRecordServerConfirmed rejects local status=synced without serverConfirmedAt + serverSyncNonce', () => {
    assert.equal(
      isRecordServerConfirmed({ id: 'd1', status: 'synced', updatedAt: new Date().toISOString(), userId: 'u1' }, 'u1', 'a@b.com'),
      false
    );
    assert.equal(
      isRecordServerConfirmed(
        {
          id: 'd1',
          userId: 'u1',
          serverConfirmedAt: '2026-11-14T10:00:00Z',
          serverConfirmedUid: 'u1',
          serverSyncNonce: 'nonce_1',
        },
        'u1',
        'a@b.com'
      ),
      true
    );
    assert.equal(
      isRecordServerConfirmed(
        {
          id: 'd1',
          pendingSync: true,
          serverConfirmedAt: '2026-11-14T10:00:00Z',
          serverConfirmedUid: 'u1',
          serverSyncNonce: 'nonce_1',
        },
        'u1',
        'a@b.com'
      ),
      false
    );
  });

  // Global write lock + in-flight drain timeout fail-closed
  await runTest('3. Global write lock and drainInFlightWrites timeout fails closed', async () => {
    acquireSignOutLock('u1', 'corr_lock_1');
    assert.equal(isWriteLocked(), true);

    let resolveWrite!: () => void;
    const hanging = new Promise<void>((res) => {
      resolveWrite = res;
    });
    trackInFlightWrite('test:hangingWrite', hanging);

    const timedOutDrain = await drainInFlightWrites(30);
    assert.equal(timedOutDrain.drained, false);
    assert.equal(timedOutDrain.timedOut, true);
    assert.deepEqual(timedOutDrain.pendingLabels, ['test:hangingWrite']);

    resolveWrite();
    const settledDrain = await drainInFlightWrites(200);
    assert.equal(settledDrain.drained, true);
    assert.equal(settledDrain.timedOut, false);
    releaseSignOutLock('corr_lock_1');
    assert.equal(isWriteLocked(), false);
  });

  // Inventory classification & corrupt schema fail-safe
  await runTest('4. Corrupt localStorage JSON or failed IDB read fails closed (verified: false)', async () => {
    const ls = new MemoryStorage();
    const ss = new MemoryStorage();
    ls.setItem('seera_ai_queued_edits', '{BAD_JSON');

    const badJsonInv = await buildLocalDataInventory({
      uid: 'u1',
      email: 'u1@test.com',
      storage: ls,
      session: ss,
      idbReader: makeInventoryReader(),
    });
    assert.equal(badJsonInv.verified, false);
    assert.equal(badJsonInv.hasBlockingUnsyncedOrLocalOnly, true);
    assert.ok(badJsonInv.unverifiedReasons.length > 0);

    const lsClean = new MemoryStorage();
    const failedIdbInv = await buildLocalDataInventory({
      uid: 'u1',
      email: 'u1@test.com',
      storage: lsClean,
      session: ss,
      idbReader: makeInventoryReader(undefined, false, 'IDB snapshot failed'),
    });
    assert.equal(failedIdbInv.verified, false);
    assert.ok(failedIdbInv.unverifiedReasons.some((r) => r.includes('IDB snapshot failed')));
  });

  // Preference allowlist & Firebase persistence key safety
  await runTest('5. purgeSensitiveAppStorage preserves exact preference allowlist and Firebase SDK keys', () => {
    const ls = new MemoryStorage();
    const ss = new MemoryStorage();

    ls.setItem('firebase:authUser:apiKey:[DEFAULT]', '{"uid":"u1"}');
    ls.setItem('seera_offline_mode_enabled', 'true');
    ls.setItem('seera_warning_shown', 'true');
    ls.setItem(
      'seera_ai_user_settings',
      JSON.stringify({
        appLanguage: 'om',
        theme: 'dark',
        offlineModeEnabled: true,
        customApiKey: 'SECRET_KEY',
        email: 'judge@court.et',
        uid: 'u1',
        localCredentials: { pinHash: 'abc' },
      })
    );
    ls.setItem('seera_ai_saved_documents_u1', '[{"id":"doc1"}]');
    ls.setItem('seera_ai_queued_edits', '[{"id":"q1","docId":"doc1"}]');
    ls.setItem('seera_court_active_session', '{"institutionId":"gurbicha"}');
    ls.setItem('seera_device_auth_salt', 'test_salt_hex_123');
    ls.setItem('seera_device_salt', 'test_legacy_salt');
    ss.setItem('seera_session_id', 'sess_123');

    purgeSensitiveAppStorage({ storage: ls, session: ss, preserveAllowlist: true });

    // Firebase SDK key preserved untouched
    assert.equal(ls.getItem('firebase:authUser:apiKey:[DEFAULT]'), '{"uid":"u1"}');
    // Exact preferences preserved
    assert.equal(ls.getItem('seera_offline_mode_enabled'), 'true');
    assert.equal(ls.getItem('seera_warning_shown'), 'true');
    const cleanSettings = JSON.parse(ls.getItem('seera_ai_user_settings')!);
    assert.equal(cleanSettings.appLanguage, 'om');
    assert.equal(cleanSettings.theme, 'dark');
    assert.equal(cleanSettings.customApiKey, undefined);
    assert.equal(cleanSettings.email, undefined);
    assert.equal(cleanSettings.uid, undefined);
    assert.equal(cleanSettings.localCredentials, undefined);
    // Sensitive keys wiped
    assert.equal(ls.getItem('seera_ai_saved_documents_u1'), null);
    assert.equal(ls.getItem('seera_ai_queued_edits'), null);
    assert.equal(ls.getItem('seera_court_active_session'), null);
    assert.equal(ls.getItem('seera_device_auth_salt'), null);
    assert.equal(ls.getItem('seera_device_salt'), null);
    assert.equal(ss.length, 0);
  });

  // IndexedDB deletion lifecycle (mocked window.indexedDB)
  await runTest('6. safeDeleteOfflineDB enforces SeeraAIOfflineDB allowlist, handles onsuccess/onerror/onblocked/overlap/late settlement', async () => {
    // Reject guessed DB names even with mocked window
    const wrong1 = await safeDeleteOfflineDB('seera_offline_db');
    assert.equal(wrong1.success, false);
    assert.equal(wrong1.status, 'UNRECOGNIZED_DB');

    const wrong2 = await safeDeleteOfflineDB('seera_ai_db');
    assert.equal(wrong2.success, false);
    assert.equal(wrong2.status, 'UNRECOGNIZED_DB');

    // No indexedDB env -> fails closed
    const noEnv = await safeDeleteOfflineDB(OFFLINE_DB_NAME);
    assert.equal(noEnv.success, false);
    assert.equal(noEnv.status, 'NO_INDEXEDDB_ENV');

    // Mock window + indexedDB for lifecycle tests
    let deleteCallCount = 0;
    let currentReqHandler: ((req: any) => void) | null = null;
    (globalThis as any).window = {
      indexedDB: {
        deleteDatabase: (_name: string) => {
          deleteCallCount++;
          const req: any = {
            onsuccess: null,
            onerror: null,
            onblocked: null,
            error: null,
          };
          queueMicrotask(() => currentReqHandler?.(req));
          return req;
        },
      },
    };

    try {
      // onsuccess
      currentReqHandler = (req) => req.onsuccess?.();
      const resOk = await safeDeleteOfflineDB(OFFLINE_DB_NAME, { timeoutMs: 200 });
      assert.equal(resOk.success, true);
      assert.equal(resOk.status, 'DELETED');

      // onerror
      currentReqHandler = (req) => {
        req.error = { message: 'Disk error' };
        req.onerror?.();
      };
      const resErr = await safeDeleteOfflineDB(OFFLINE_DB_NAME, { timeoutMs: 200 });
      assert.equal(resErr.success, false);
      assert.equal(resErr.status, 'ERROR');

      // onblocked + timeout -> NOT success, overlapping prevented, late onsuccess handled
      let blockedNotified = false;
      let lateResult: any = null;
      let savedReq: any = null;
      currentReqHandler = (req) => {
        savedReq = req;
        req.onblocked?.();
      };
      const callsBefore = deleteCallCount;
      const resBlocked = await safeDeleteOfflineDB(OFFLINE_DB_NAME, {
        timeoutMs: 40,
        onBlocked: () => {
          blockedNotified = true;
        },
        onLateSettlement: (r) => {
          lateResult = r;
        },
      });
      assert.equal(blockedNotified, true);
      assert.equal(resBlocked.success, false);
      assert.equal(resBlocked.status, 'BLOCKED_TIMEOUT');
      assert.equal(hasPendingOfflineDBDeletion(OFFLINE_DB_NAME), true);

      // Overlapping call while still pending must NOT invoke a second indexedDB.deleteDatabase()
      const resOverlap = await safeDeleteOfflineDB(OFFLINE_DB_NAME, { timeoutMs: 30 });
      assert.equal(deleteCallCount, callsBefore + 1);
      assert.equal(resOverlap.success, false);
      assert.equal(resOverlap.status, 'DELETE_STILL_PENDING');

      // Trigger late onsuccess
      savedReq.onsuccess?.();
      await new Promise((r) => setTimeout(r, 10));
      assert.equal(hasPendingOfflineDBDeletion(OFFLINE_DB_NAME), false);
      assert.equal(lateResult?.success, true);
      assert.equal(lateResult?.lateSettlement, true);
    } finally {
      delete (globalThis as any).window;
    }
  });

  // Coordinator end-to-end state machine paths
  await runTest('7. Coordinator clean sign-out completes purge -> Firebase signOut -> verification -> IDLE', async () => {
    const ls = new MemoryStorage();
    const ss = new MemoryStorage();
    ls.setItem('seera_cached_email', 'judge@court.et');
    ls.setItem('seera_current_user_id', 'uid_judge');
    ls.setItem('seera_offline_mode_enabled', 'false');
    ls.setItem(
      'seera_ai_saved_documents_uid_judge',
      JSON.stringify([
        {
          id: 'doc_1',
          userId: 'uid_judge',
          serverConfirmedAt: '2026-11-14T10:00:00Z',
          serverConfirmedUid: 'uid_judge',
          serverSyncNonce: 'n_1',
        },
      ])
    );

    const events: string[] = [];
    let fbSignedOut = false;

    const coord = createSignOutCoordinator({
      storage: ls,
      getCurrentUid: () => 'uid_judge',
      getCurrentEmail: () => 'judge@court.et',
      pauseSync: () => events.push('pauseSync'),
      resumeSync: () => events.push('resumeSync'),
      drainWrites: async () => ({ drained: true, timedOut: false, pendingLabels: [] }),
      notifyServiceWorkerPause: async () => ({ ok: true }),
      notifyServiceWorkerCloseIDB: async () => ({ ok: true }),
      coordinateTabsPrepare: async () => ({ ok: true, unackedTabs: [] }),
      coordinateTabsCloseIDB: async () => ({ ok: true, unackedTabs: [] }),
      broadcastAbort: () => events.push('broadcastAbort'),
      broadcastTerminated: () => events.push('broadcastTerminated'),
      broadcastLockdown: () => events.push('broadcastLockdown'),
      syncQueuedEdits: async () => ({ syncedCount: 0, remainingPendingCount: 0, errors: [] }),
      syncCourtData: async () => ({ syncedCount: 0, errors: 0 }),
      buildInventory: () => buildLocalDataInventory({ uid: 'uid_judge', email: 'judge@court.et', storage: ls, session: ss, idbReader: makeInventoryReader() }),
      closeLocalIDBConnections: () => 1,
      deleteOfflineDB: async () => {
        events.push('deleteOfflineDB');
        return { success: true, status: 'DELETED' };
      },
      purgeAppStorage: () => {
        events.push('purgeAppStorage');
        return purgeSensitiveAppStorage({ storage: ls, session: ss, preserveAllowlist: true });
      },
      firebaseSignOut: async () => {
        events.push('firebaseSignOut');
        fbSignedOut = true;
      },
      verifyFirebaseSignedOut: () => fbSignedOut,
      clearClientAuthState: () => events.push('clearClientAuthState'),
    });

    const prep = await coord.beginSignOut();
    assert.equal(prep.phase, 'AWAITING_USER_DECISION');
    assert.equal(prep.inventory?.hasBlockingUnsyncedOrLocalOnly, false);

    const done = await coord.confirmAndExecuteSignOut();
    assert.equal(done.phase, 'IDLE');
    assert.deepEqual(events, [
      'pauseSync',
      'pauseSync',
      'deleteOfflineDB',
      'purgeAppStorage',
      'firebaseSignOut',
      'broadcastTerminated',
      'clearClientAuthState',
    ]);
    assert.equal(isWriteLocked(), false);
    assert.equal(ls.getItem('seera_offline_mode_enabled'), 'false');
    assert.equal(ls.getItem('seera_ai_saved_documents_uid_judge'), null);
  });

  await runTest('8. Coordinator protects pending/local-only data & unique local institutional drafts until second consent or Stay Signed In', async () => {
    const ls = new MemoryStorage();
    const ss = new MemoryStorage();
    ls.setItem('seera_offline_court_case_drafts', JSON.stringify([{ id: 'case_draft_1', title: 'Civil Case Draft', status: 'pending_sync' }]));
    ls.setItem('seera_ai_draft_prompt_uid_1', 'Unsaved legal prompt');

    let paused = false;
    let deleted = false;
    const coord = createSignOutCoordinator({
      storage: ls,
      getCurrentUid: () => 'uid_1',
      getCurrentEmail: () => 'adv@court.et',
      pauseSync: () => {
        paused = true;
      },
      resumeSync: () => {
        paused = false;
      },
      drainWrites: async () => ({ drained: true, timedOut: false, pendingLabels: [] }),
      notifyServiceWorkerPause: async () => ({ ok: true }),
      notifyServiceWorkerCloseIDB: async () => ({ ok: true }),
      coordinateTabsPrepare: async () => ({ ok: true, unackedTabs: [] }),
      coordinateTabsCloseIDB: async () => ({ ok: true, unackedTabs: [] }),
      broadcastAbort: () => {},
      broadcastTerminated: () => {},
      broadcastLockdown: () => {},
      syncQueuedEdits: async () => ({ syncedCount: 0, remainingPendingCount: 0, errors: [] }),
      syncCourtData: async () => ({ syncedCount: 0, errors: 0 }),
      buildInventory: () => buildLocalDataInventory({ uid: 'uid_1', email: 'adv@court.et', storage: ls, session: ss, idbReader: makeInventoryReader() }),
      closeLocalIDBConnections: () => 0,
      deleteOfflineDB: async () => {
        deleted = true;
        return { success: true, status: 'DELETED' };
      },
      purgeAppStorage: () => purgeSensitiveAppStorage({ storage: ls, session: ss }),
      firebaseSignOut: async () => {},
      verifyFirebaseSignedOut: () => true,
      clearClientAuthState: () => {},
    });

    const prep = await coord.beginSignOut();
    assert.equal(prep.phase, 'AWAITING_USER_DECISION');
    assert.equal(prep.inventory?.counts.institutionalUniqueLocalOnly, 1);
    assert.equal(prep.inventory?.hasUniqueLocalInstitutionalData, true);
    assert.equal(prep.inventory?.counts.localOnly, 2);

    // Backup payload is honest: encrypted: false
    const backup = JSON.parse(buildLocalBackupPayload(prep.inventory!, 'uid_1', 'adv@court.et'));
    assert.equal(backup.encrypted, false);
    assert.equal(backup.items.length, 2);

    // Attempt confirm without discardConfirmed -> stays in AWAITING_USER_DECISION, does not delete
    const blocked = await coord.confirmAndExecuteSignOut({ discardConfirmed: false });
    assert.equal(blocked.phase, 'AWAITING_USER_DECISION');
    assert.equal(deleted, false);

    // Stay Signed In -> resumes sync, releases lock, preserves data
    const stayed = await coord.cancelStaySignedIn();
    assert.equal(stayed.phase, 'IDLE');
    assert.equal(paused, false);
    assert.equal(isWriteLocked(), false);
    assert.ok(ls.getItem('seera_offline_court_case_drafts'));
  });

  await runTest('9. Missing tab ACK & IDB blocked & Firebase signOut rejection enter ISOLATION_LOCKDOWN and block account switch', async () => {
    const ls = new MemoryStorage();
    const ss = new MemoryStorage();
    ls.setItem('seera_cached_email', 'userA@court.et');
    ls.setItem('seera_current_user_id', 'uid_A');
    ls.setItem('seera_ai_saved_documents_uid_A', JSON.stringify([{ id: 'docA', title: 'Private' }]));

    // Case A: Missing ACK during CLOSE_IDB_CONNECTIONS
    const coordTabFail = createSignOutCoordinator({
      storage: ls,
      getCurrentUid: () => 'uid_A',
      getCurrentEmail: () => 'userA@court.et',
      pauseSync: () => {},
      resumeSync: () => {},
      drainWrites: async () => ({ drained: true, timedOut: false, pendingLabels: [] }),
      notifyServiceWorkerPause: async () => ({ ok: true }),
      notifyServiceWorkerCloseIDB: async () => ({ ok: true }),
      coordinateTabsPrepare: async () => ({ ok: true, unackedTabs: [] }),
      coordinateTabsCloseIDB: async () => ({ ok: false, unackedTabs: ['tab_2'] }),
      broadcastAbort: () => {},
      broadcastTerminated: () => {},
      broadcastLockdown: () => {},
      syncQueuedEdits: async () => ({ syncedCount: 0, remainingPendingCount: 0, errors: [] }),
      syncCourtData: async () => ({ syncedCount: 0, errors: 0 }),
      buildInventory: () => buildLocalDataInventory({ uid: 'uid_A', email: 'userA@court.et', storage: ls, session: ss, idbReader: makeInventoryReader() }),
      closeLocalIDBConnections: () => 0,
      deleteOfflineDB: async () => ({ success: true, status: 'DELETED' }),
      purgeAppStorage: () => ({ removedKeys: [] }),
      firebaseSignOut: async () => {},
      verifyFirebaseSignedOut: () => true,
      clearClientAuthState: () => {},
    });

    await coordTabFail.beginSignOut();
    const tabLockState = await coordTabFail.confirmAndExecuteSignOut({ discardConfirmed: true });
    assert.equal(tabLockState.phase, 'ISOLATION_LOCKDOWN');
    assert.deepEqual(tabLockState.unackedTabs, ['tab_2']);
    assert.equal(getIsolationLockdownState(ls)?.active, true);
    // Cancel must not dismiss lockdown
    await coordTabFail.cancelStaySignedIn();
    assert.equal(getIsolationLockdownState(ls)?.active, true);
    // Second user login blocked
    const switchBlocked = checkAccountSwitchAllowed({ nextUid: 'uid_B', nextEmail: 'userB@court.et', storage: ls });
    assert.equal(switchBlocked.allowed, false);

    // Case B: Firebase signOut fails AFTER IDB delete & app purge, then retryIsolationRecovery succeeds
    clearIsolationLockdownState(ls);
    let fbReject = true;
    const coordFbFail = createSignOutCoordinator({
      storage: ls,
      getCurrentUid: () => 'uid_A',
      getCurrentEmail: () => 'userA@court.et',
      pauseSync: () => {},
      resumeSync: () => {},
      drainWrites: async () => ({ drained: true, timedOut: false, pendingLabels: [] }),
      notifyServiceWorkerPause: async () => ({ ok: true }),
      notifyServiceWorkerCloseIDB: async () => ({ ok: true }),
      coordinateTabsPrepare: async () => ({ ok: true, unackedTabs: [] }),
      coordinateTabsCloseIDB: async () => ({ ok: true, unackedTabs: [] }),
      broadcastAbort: () => {},
      broadcastTerminated: () => {},
      broadcastLockdown: () => {},
      syncQueuedEdits: async () => ({ syncedCount: 0, remainingPendingCount: 0, errors: [] }),
      syncCourtData: async () => ({ syncedCount: 0, errors: 0 }),
      buildInventory: () => buildLocalDataInventory({ uid: 'uid_A', email: 'userA@court.et', storage: ls, session: ss, idbReader: makeInventoryReader() }),
      closeLocalIDBConnections: () => 0,
      deleteOfflineDB: async () => ({ success: true, status: 'DELETED' }),
      purgeAppStorage: () => purgeSensitiveAppStorage({ storage: ls, session: ss }),
      firebaseSignOut: async () => {
        if (fbReject) throw new Error('Network unavailable during revoke');
      },
      verifyFirebaseSignedOut: () => !fbReject,
      clearClientAuthState: () => {},
    });

    await coordFbFail.beginSignOut();
    const fbFailState = await coordFbFail.confirmAndExecuteSignOut({ discardConfirmed: true });
    assert.equal(fbFailState.phase, 'ISOLATION_LOCKDOWN');
    assert.equal(fbFailState.lockdownState?.failedStep, 'FIREBASE_SIGNOUT');
    assert.equal(getIsolationLockdownState(ls)?.active, true);

    fbReject = false;
    const recovered = await coordFbFail.retryIsolationRecovery();
    assert.equal(recovered.phase, 'IDLE');
    assert.equal(getIsolationLockdownState(ls), null);
    releaseSignOutLock();
  });

  await runTest('10. Cross-tab active registry & different-UID mismatch triggers lockdown', async () => {
    const ls = new MemoryStorage();
    registerTabHeartbeat('tab_self', 'uid_A', ls);
    registerTabHeartbeat('tab_other', 'uid_B', ls);
    const others = getOtherActiveTabs('tab_self', null, ls);
    assert.deepEqual(others, ['tab_other']);

    const coordMismatch = createSignOutCoordinator({
      storage: ls,
      getCurrentUid: () => 'uid_A',
      getCurrentEmail: () => 'a@court.et',
      pauseSync: () => {},
      resumeSync: () => {},
      drainWrites: async () => ({ drained: true, timedOut: false, pendingLabels: [] }),
      notifyServiceWorkerPause: async () => ({ ok: true }),
      notifyServiceWorkerCloseIDB: async () => ({ ok: true }),
      coordinateTabsPrepare: async () => ({ ok: false, unackedTabs: [], uidMismatch: true }),
      coordinateTabsCloseIDB: async () => ({ ok: true, unackedTabs: [] }),
      broadcastAbort: () => {},
      broadcastTerminated: () => {},
      broadcastLockdown: () => {},
      syncQueuedEdits: async () => ({ syncedCount: 0, remainingPendingCount: 0, errors: [] }),
      syncCourtData: async () => ({ syncedCount: 0, errors: 0 }),
      buildInventory: () => buildLocalDataInventory({ uid: 'uid_A', email: 'a@court.et', storage: ls, idbReader: makeInventoryReader() }),
      closeLocalIDBConnections: () => 0,
      deleteOfflineDB: async () => ({ success: true, status: 'DELETED' }),
      purgeAppStorage: () => ({ removedKeys: [] }),
      firebaseSignOut: async () => {},
      verifyFirebaseSignedOut: () => true,
      clearClientAuthState: () => {},
    });

    const res = await coordMismatch.beginSignOut();
    assert.equal(res.phase, 'ISOLATION_LOCKDOWN');
    assert.equal(res.lockdownState?.reason, 'CROSS_TAB_UID_MISMATCH');
    releaseSignOutLock();
  });

  await runTest('11. checkAccountSwitchAllowed blocks User B if User A plaintext docs remain even without prior lockdown key', () => {
    const ls = new MemoryStorage();
    ls.setItem('seera_cached_email', 'usera@court.et');
    ls.setItem('seera_current_user_id', 'uid_A');
    ls.setItem('seera_ai_saved_documents_uid_A', JSON.stringify([{ id: 'doc1', title: 'Confidential Judgment' }]));

    const res = checkAccountSwitchAllowed({ nextUid: 'uid_B', nextEmail: 'userb@court.et', storage: ls });
    assert.equal(res.allowed, false);
    assert.equal(res.lockdownState?.reason, 'PREVIOUS_ACCOUNT_PLAINTEXT_PRESENT');
    assert.ok(ls.getItem(ISOLATION_LOCKDOWN_STORAGE_KEY));
  });

  await runTest('12. precedentOfflineSync.syncOfflineCaseDraftsToServer never fakes synced status', async () => {
    const ls = new MemoryStorage();
    (globalThis as any).window = {
      localStorage: ls,
      dispatchEvent: () => {},
    };
    (globalThis as any).localStorage = ls;

    try {
      const saved = await saveOfflineCaseDraft({
        caseNumber: 'C-101',
        title: 'Offline Court Draft',
        courtName: 'Aanaa Gurbicha',
        content: 'Detailed court submission content',
        notes: 'Notes',
      });
      assert.equal(saved.status, 'pending_sync');

      const syncRes = await syncOfflineCaseDraftsToServer();
      assert.equal(syncRes.success, false);
      assert.equal(syncRes.syncedCount, 0);
      assert.equal(syncRes.pendingCount, 1);

      const drafts = getOfflineCaseDrafts();
      assert.equal(drafts.length, 1);
      assert.equal(drafts[0].status, 'pending_sync');
    } finally {
      delete (globalThis as any).window;
      delete (globalThis as any).localStorage;
    }
  });

  console.log(`\nALL EXECUTED NODE UNIT TESTS PASSED: ${passed}/12`);
}

main();
