import { useState, useEffect } from 'react';
import { SavedLegalDocument } from '../services/storage';
import { backgroundSyncManager } from '../services/backgroundSync';

export function useDocumentSync(): {
  documents: SavedLegalDocument[];
  syncNow: () => Promise<SavedLegalDocument[]>;
} {
  const [documents, setDocuments] = useState<SavedLegalDocument[]>([]);

  useEffect(() => {
    // Subscribe to background sync manager updates
    const unsubscribe = backgroundSyncManager.subscribe((updatedDocs) => {
      setDocuments(updatedDocs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    documents,
    syncNow: () => backgroundSyncManager.syncNow(),
  };
}
