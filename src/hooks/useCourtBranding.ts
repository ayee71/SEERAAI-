import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getActiveCourtSession } from '../services/courtInstitutionService';

export interface CourtBranding {
  logoUrl?: string;
  brandColor?: string;
  primaryHeaderColor?: string;
}

export const useCourtBranding = () => {
  const [branding, setBranding] = useState<CourtBranding>({});
  const session = getActiveCourtSession();

  useEffect(() => {
    const instId = session?.institutionId;
    if (!instId) return;

    const unsub = onSnapshot(doc(db, 'court_institutions', instId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBranding({
          logoUrl: data.logoUrl,
          brandColor: data.brandColor || '#3b82f6',
          primaryHeaderColor: data.primaryHeaderColor || '#1e293b'
        });
      }
    });

    return () => unsub();
  }, [session?.institutionId]);

  return branding;
};
