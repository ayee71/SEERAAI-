import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize the app once at the entry point
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      projectId: 'leafy-rush-xvd6f'
    });

const DATABASE_ID =
  'ai-studio-seeraaitrilingua-18431532-f42a-4a5a-b5b1-c3c0e6b05478';

// Global exports if needed
export const db = getFirestore(app, DATABASE_ID);
export const bucket = getStorage(app).bucket();

// Export all court document functions from the new module
export * from './courtDocuments';

// Note: If there were other functions here previously, they should remain.
// Based on current inspection, the file was only containing court document logic.
