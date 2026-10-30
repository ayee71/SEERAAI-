import { LegalEnactment, OROMIA_AND_FEDERAL_LEGISLATION_DB, Jurisdiction, LegislationType, LegalCategory } from '../data/legislationDatabase';
import { db, auth } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { isOwnerAccount } from './ownerAuth';

const LOCAL_REPOSITORY_KEY = 'seera_legislation_repository_v1';
const LAST_SYNC_KEY = 'seera_legislation_last_sync';
const AUTO_SYNC_SETTING_KEY = 'seera_auto_sync_enabled';

export interface SyncStats {
  totalCount: number;
  oromiaCount: number;
  federalCount: number;
  proclamationsCount: number;
  regulationsCount: number;
  directivesCount: number;
  cassationCount: number;
  lastSyncTime: string;
  isSyncing: boolean;
  autoSyncEnabled: boolean;
}

let cachedRepository: LegalEnactment[] | null = null;

/**
 * Retrieves cached repository from local storage or returns baseline initial dataset
 */
export function getLocalLegislationRepository(): LegalEnactment[] {
  if (typeof window === 'undefined') return OROMIA_AND_FEDERAL_LEGISLATION_DB;
  if (cachedRepository) return cachedRepository;

  try {
    const raw = localStorage.getItem(LOCAL_REPOSITORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Ensure all built-in baseline enactments (including SDFHH) are merged
        const existingIds = new Set(parsed.map((item: LegalEnactment) => item.id));
        let changed = false;
        for (const baseline of OROMIA_AND_FEDERAL_LEGISLATION_DB) {
          if (!existingIds.has(baseline.id)) {
            parsed.push(baseline);
            changed = true;
          }
        }
        if (changed) {
          saveLocalRepository(parsed);
        }
        cachedRepository = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load local legislation cache', e);
  }

  // Fallback to baseline database and save to local storage
  cachedRepository = OROMIA_AND_FEDERAL_LEGISLATION_DB;
  saveLocalRepository(OROMIA_AND_FEDERAL_LEGISLATION_DB);
  return OROMIA_AND_FEDERAL_LEGISLATION_DB;
}

/**
 * Saves repository array to local storage
 */
export function saveLocalRepository(items: LegalEnactment[]): void {
  if (typeof window === 'undefined') return;
  try {
    cachedRepository = items;
    localStorage.setItem(LOCAL_REPOSITORY_KEY, JSON.stringify(items));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (e) {
    console.error('Error saving local legislation repository', e);
  }
}

/**
 * Gets live statistics of stored legislation
 */
export function getLegislationSyncStats(): SyncStats {
  const items = getLocalLegislationRepository();
  const lastSyncTime = (typeof window !== 'undefined' && localStorage.getItem(LAST_SYNC_KEY)) || new Date().toISOString();
  const autoSyncEnabled = typeof window !== 'undefined' ? localStorage.getItem(AUTO_SYNC_SETTING_KEY) !== 'false' : true;

  return {
    totalCount: items.length,
    oromiaCount: items.filter(i => i.jurisdiction === 'oromia').length,
    federalCount: items.filter(i => i.jurisdiction === 'federal').length,
    proclamationsCount: items.filter(i => i.type === 'proclamation').length,
    regulationsCount: items.filter(i => i.type === 'regulation').length,
    directivesCount: items.filter(i => i.type === 'directive').length,
    cassationCount: items.filter(i => i.type === 'cassation_decision').length,
    lastSyncTime,
    isSyncing: false,
    autoSyncEnabled,
  };
}

/**
 * Toggles auto-sync setting
 */
export function toggleAutoSync(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTO_SYNC_SETTING_KEY, enabled ? 'true' : 'false');
  }
}

/**
 * Seeds the Firestore repository with baseline legislation from the local database
 * Use this to ensure newly added laws in code are stored in the cloud.
 */
export async function seedBaselineLegislation(
  onProgress?: (msg: string, percent: number) => void
): Promise<{ success: boolean; seededCount: number }> {
  if (!db) return { success: false, seededCount: 0 };
  
  // Only owners are allowed to seed baseline legislation to the global cloud repository
  if (!isOwnerAccount(auth.currentUser?.email)) {
    return { success: true, seededCount: 0 };
  }
  
  try {
    if (onProgress) onProgress('Baseline Labsiilee gara Cloud Firestoretti fe\'aa jira...', 10);
    
    let count = 0;
    const total = OROMIA_AND_FEDERAL_LEGISLATION_DB.length;
    
    for (const item of OROMIA_AND_FEDERAL_LEGISLATION_DB) {
      const docRef = doc(db, 'legislation_repository', item.id);
      await setDoc(docRef, item, { merge: true });
      count++;
      
      if (onProgress && count % 5 === 0) {
        onProgress(`Kuusaa Seeraa Cloud irratti ol-fe'amaa jira (${count}/${total})...`, Math.floor((count / total) * 90));
      }
    }

    if (onProgress) onProgress('Baseline Guutuun Cloud irratti kuufameera!', 100);
    return { success: true, seededCount: count };
  } catch (error) {
    console.error('Error seeding baseline legislation', error);
    return { success: false, seededCount: 0 };
  }
}

/**
 * Performs full real-time cloud synchronization for Caffee Oromiyaa, FDRE Parliament, & Cassation Decisions
 */
export async function performFullLegislationSync(
  onProgress?: (msg: string, percent: number) => void
): Promise<{ success: boolean; newItemsCount: number; updatedStats: SyncStats }> {
  try {
    if (onProgress) onProgress('Qorannoo fi Wal-simsiisa Labsiilee Caffee Oromiyaa fi Federaalaa...', 15);
    await new Promise(r => setTimeout(r, 400));

    // Optional: Auto-seed new baseline items to cloud during sync
    await seedBaselineLegislation((msg, pct) => {
      if (onProgress) onProgress(`[Cloud Seeding] ${msg}`, Math.floor(pct * 0.3));
    });

    let currentItems = getLocalLegislationRepository();
    let newItemsAdded = 0;

    // Check if Firestore is available for remote fetch
    if (db) {
      try {
        if (onProgress) onProgress('Odeeffannoo Haaraa Server Firebase Firestore irraa fe\'aa jira...', 40);
        const ref = collection(db, 'legislation_repository');
        const snapshot = await getDocs(ref);
        
        if (!snapshot.empty) {
          const remoteItems: LegalEnactment[] = [];
          snapshot.forEach(docSnap => {
            remoteItems.push(docSnap.data() as LegalEnactment);
          });

          // Merge remote items with local
          const map = new Map<string, LegalEnactment>();
          currentItems.forEach(item => map.set(item.id, item));
          
          remoteItems.forEach(item => {
            if (!map.has(item.id)) newItemsAdded++;
            map.set(item.id, item);
          });

          currentItems = Array.from(map.values());
        }
      } catch (err) {
        console.log('Firestore sync notice (using baseline & cached database):', err);
      }
    }

    if (onProgress) onProgress('Dambiilee, Qajeelfamoota, fi Murtiilee Dhaddacha Ijibbaataa Barsiisuu & Indexing...', 75);
    await new Promise(r => setTimeout(r, 400));

    // Save updated repository to local storage
    saveLocalRepository(currentItems);

    if (onProgress) onProgress('Wal-simsiisi Mirkanaa\'eera! Kuusaan Seeraa Guutuutti Haaroomeera.', 100);
    await new Promise(r => setTimeout(r, 200));

    return {
      success: true,
      newItemsCount: newItemsAdded,
      updatedStats: getLegislationSyncStats(),
    };
  } catch (error) {
    console.error('Failed to sync legislation repository', error);
    return {
      success: false,
      newItemsCount: 0,
      updatedStats: getLegislationSyncStats(),
    };
  }
}

/**
 * Searches and filters the comprehensive legislation database
 */
export function searchLegislationRepository(
  query: string = '',
  jurisdictionFilter: Jurisdiction | 'all' = 'all',
  typeFilter: LegislationType | 'all' = 'all',
  categoryFilter: LegalCategory | 'all' = 'all'
): LegalEnactment[] {
  const items = getLocalLegislationRepository();
  const q = query.trim().toLowerCase();

  return items.filter((item) => {
    // Jurisdiction filter
    if (jurisdictionFilter !== 'all' && item.jurisdiction !== jurisdictionFilter) {
      return false;
    }

    // Type filter (proclamation, regulation, directive, cassation_decision)
    if (typeFilter !== 'all' && item.type !== typeFilter) {
      return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }

    // Search term query match
    if (q) {
      const matchNumber = item.number.toLowerCase().includes(q);
      const matchTitleOm = item.title.om.toLowerCase().includes(q);
      const matchTitleAm = item.title.am.toLowerCase().includes(q);
      const matchTitleEn = item.title.en.toLowerCase().includes(q);
      const matchSummaryOm = item.summary.om.toLowerCase().includes(q);
      const matchSummaryAm = item.summary.am.toLowerCase().includes(q);
      const matchSummaryEn = item.summary.en.toLowerCase().includes(q);
      const matchTags = item.tags.some(t => t.toLowerCase().includes(q));

      // New: Search within full text articles if present
      const matchArticles = item.fullTextArticles?.some(art => 
        art.articleNumber.toLowerCase().includes(q) ||
        (art.title && art.title.toLowerCase().includes(q)) ||
        art.content.om.toLowerCase().includes(q) ||
        art.content.am.toLowerCase().includes(q) ||
        art.content.en.toLowerCase().includes(q)
      );

      return (
        matchNumber ||
        matchTitleOm ||
        matchTitleAm ||
        matchTitleEn ||
        matchSummaryOm ||
        matchSummaryAm ||
        matchSummaryEn ||
        matchTags ||
        matchArticles
      );
    }

    return true;
  });
}
