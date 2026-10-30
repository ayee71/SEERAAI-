import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  onSnapshot, 
  writeBatch, 
  doc, 
  where 
} from 'firebase/firestore';

export type AdminActionType = 
  | 'user_verification' 
  | 'user_revocation' 
  | 'license_upgrade' 
  | 'license_standard' 
  | 'court_approval' 
  | 'court_user_created' 
  | 'config_update' 
  | 'broadcast_update'
  | 'security_policy_change';

export interface AdminActivityLogEntry {
  id: string;
  actionType: AdminActionType;
  adminEmail: string;
  target: string;
  details: string;
  timestamp: string; // ISO string
  displayTime?: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'seera_admin_activity_logs_cache';

const DEFAULT_ACTIVITY_LOGS: AdminActivityLogEntry[] = [
  {
    id: 'log_seed_1',
    actionType: 'user_verification',
    adminEmail: 'ayeledha@gmail.com',
    target: 'Abbaa Seeraa Dr. Caalaa Tasfaayee',
    details: 'Verified judicial credential for Supreme Court of Oromia (Dhaddacha Yakkaa & Ijoo)',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    displayTime: 'Daqiiqaa 18 dura',
  },
  {
    id: 'log_seed_2',
    actionType: 'license_upgrade',
    adminEmail: 'ayeledha@gmail.com',
    target: 'Abukaattoo Tolaa Dassaaleny',
    details: 'Upgraded subscription tier to UNLIMITED Legal Scholar Plan',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    displayTime: 'Daqiiqaa 45 dura',
  },
  {
    id: 'log_seed_3',
    actionType: 'court_approval',
    adminEmail: 'ayeledha@gmail.com',
    target: 'Mana Murtii Waliigalaa Oromiyaa',
    details: 'Approved institutional court onboarding accession & provisioned Court Admin (OROMIA-COURT-2026)',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    displayTime: 'Sa\'aatii 2 dura',
  },
  {
    id: 'log_seed_4',
    actionType: 'config_update',
    adminEmail: 'ayeledha@gmail.com',
    target: 'AI Model Reasoning Engine',
    details: 'Set default platform AI architecture to Gemini 2.5 Pro with X20 Deep Thinking legal synthesis',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    displayTime: 'Sa\'aatii 6 dura',
  },
  {
    id: 'log_seed_5',
    actionType: 'broadcast_update',
    adminEmail: 'ayeledha@gmail.com',
    target: 'Live Broadcast Banner',
    details: 'Published legal update alert: Federal Supreme Court Cassation Volume 25 indexed',
    timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    displayTime: 'Sa\'aatii 12 dura',
  },
];

export function getLocalAdminActivityLogs(): AdminActivityLogEntry[] {
  if (typeof window === 'undefined') return DEFAULT_ACTIVITY_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ACTIVITY_LOGS));
      return DEFAULT_ACTIVITY_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ACTIVITY_LOGS;
  }
}

export function saveLocalAdminActivityLogs(logs: AdminActivityLogEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
    window.dispatchEvent(new CustomEvent('seera_admin_log_updated', { detail: logs }));
  } catch (e) {
    console.error('Failed to save admin activity logs', e);
  }
}

export async function logAdminAction(params: {
  actionType: AdminActionType;
  target: string;
  details: string;
  adminEmail?: string;
  metadata?: Record<string, any>;
}): Promise<AdminActivityLogEntry> {
  const currentAdmin = params.adminEmail || auth.currentUser?.email || localStorage.getItem('seera_owner_email') || 'ayeledha@gmail.com';
  
  const now = new Date();
  const newLog: AdminActivityLogEntry = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    actionType: params.actionType,
    adminEmail: currentAdmin,
    target: params.target,
    details: params.details,
    timestamp: now.toISOString(),
    displayTime: 'Yeroo ammaa (Just now)',
    metadata: params.metadata,
  };

  const currentLogs = getLocalAdminActivityLogs();
  const updated = [newLog, ...currentLogs];
  saveLocalAdminActivityLogs(updated);

  // Sync to Firestore if authenticated owner
  try {
    await addDoc(collection(db, 'admin_activity_logs'), {
      ...newLog,
      serverTimestamp: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Firestore admin activity log deferred:', e);
  }

  return newLog;
}

export async function fetchRemoteAdminActivityLogs(): Promise<AdminActivityLogEntry[]> {
  try {
    const q = query(collection(db, 'admin_activity_logs'), orderBy('timestamp', 'desc'), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const remoteLogs: AdminActivityLogEntry[] = [];
      snap.forEach((d) => {
        const data = d.data();
        remoteLogs.push({
          id: d.id,
          actionType: data.actionType || 'config_update',
          adminEmail: data.adminEmail || 'ayeledha@gmail.com',
          target: data.target || 'System',
          details: data.details || '',
          timestamp: data.timestamp || new Date().toISOString(),
          metadata: data.metadata,
        });
      });
      if (remoteLogs.length > 0) {
        saveLocalAdminActivityLogs(remoteLogs);
        return remoteLogs;
      }
    }
  } catch (e) {
    console.warn('Could not fetch remote admin logs:', e);
  }
  return getLocalAdminActivityLogs();
}

export function subscribeAdminActivityLogs(callback: (logs: AdminActivityLogEntry[]) => void): () => void {
  try {
    const q = query(collection(db, 'admin_activity_logs'), orderBy('timestamp', 'desc'), limit(60));
    return onSnapshot(q, (snapshot) => {
      const logs: AdminActivityLogEntry[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        logs.push({
          id: d.id,
          actionType: data.actionType || 'config_update',
          adminEmail: data.adminEmail || 'ayeledha@gmail.com',
          target: data.target || 'System',
          details: data.details || '',
          timestamp: data.timestamp || new Date().toISOString(),
          displayTime: data.displayTime || 'Yeroo ammaa',
          metadata: data.metadata,
        });
      });
      if (logs.length > 0) {
        saveLocalAdminActivityLogs(logs);
        callback(logs);
      } else {
        callback(getLocalAdminActivityLogs());
      }
    }, (error) => {
      console.warn('Admin activity logs live listener error:', error);
      callback(getLocalAdminActivityLogs());
    });
  } catch (e) {
    console.warn('Failed to subscribe to admin activity logs:', e);
    callback(getLocalAdminActivityLogs());
    return () => {};
  }
}

export async function archiveAdminActivityLogs(): Promise<{ success: boolean; count: number }> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const q = query(
      collection(db, 'admin_activity_logs'),
      where('timestamp', '<', thirtyDaysAgoISO)
    );
    const snap = await getDocs(q);

    if (snap.empty) return { success: true, count: 0 };

    const batch = writeBatch(db);
    let count = 0;

    snap.forEach((d) => {
      const data = d.data();
      const archivedRef = doc(collection(db, 'admin_activity_logs_archived'));
      batch.set(archivedRef, { ...data, archivedAt: serverTimestamp() });
      batch.delete(d.ref);
      count++;
    });

    await batch.commit();
    return { success: true, count };
  } catch (e) {
    console.error('Failed to archive admin logs:', e);
    return { success: false, count: 0 };
  }
}

