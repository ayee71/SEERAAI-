import { initializeApp as initAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

export const getFirestoreDatabaseId = (): string => {
  if (process.env.VITE_FIREBASE_DATABASE_ID) {
    return process.env.VITE_FIREBASE_DATABASE_ID;
  }
  if (process.env.FIREBASE_DATABASE_ID) {
    return process.env.FIREBASE_DATABASE_ID;
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.firestoreDatabaseId) return cfg.firestoreDatabaseId;
    }
  } catch {
    // Ignore error
  }
  return '(default)';
};

const ADMIN_APP_NAME = 'SEERAAI_ADMIN';

export const initializeFirebaseAdmin = () => {
  const apps = getAdminApps();
  const existingApp = apps.find(a => a.name === ADMIN_APP_NAME);
  
  if (!existingApp) {
    try {
      let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT;
      if (!projectId) {
        try {
          const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
          if (fs.existsSync(configPath)) {
            const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            projectId = cfg.projectId;
          }
        } catch (e) {
          // Fallback
        }
      }
      initAdminApp({
        projectId: projectId || 'leafy-rush-xvd6f',
      }, ADMIN_APP_NAME);
    } catch (err) {
      console.warn('[Firebase Admin] Initialization warning:', err);
    }
  }
};

export const getSafeAdminAuth = () => {
  initializeFirebaseAdmin();
  const apps = getAdminApps();
  const app = apps.find(a => a.name === ADMIN_APP_NAME) || (apps.length > 0 ? apps[0] : null);
  return app ? getAdminAuth(app) : getAdminAuth();
};

export const getSafeAdminFirestore = () => {
  initializeFirebaseAdmin();
  const apps = getAdminApps();
  const app = apps.find(a => a.name === ADMIN_APP_NAME) || (apps.length > 0 ? apps[0] : null);
  
  if (!app) return null;
  
  const dbId = getFirestoreDatabaseId();
  try {
    if (dbId && dbId !== '(default)') {
      try {
        return getAdminFirestore(app, dbId);
      } catch (namedErr: any) {
        console.warn(`[Firebase Admin] Named database ID '${dbId}' failed, falling back to default database.`);
        return getAdminFirestore(app);
      }
    }
    return getAdminFirestore(app);
  } catch (err: any) {
    console.warn(`[Firebase Admin] Firestore initialization fallback warning:`, err?.message || err);
    return null;
  }
};

export { getAdminAuth, getAdminApps };
