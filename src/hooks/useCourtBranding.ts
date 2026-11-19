import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getActiveCourtSession, getLocalInstitutions } from '../services/courtInstitutionService';

export interface CourtBranding {
  logoUrl?: string;
  brandColor?: string;
  primaryHeaderColor?: string;
}

export const useCourtBranding = () => {
  const session = getActiveCourtSession();
  const instId = session?.institutionId || 'inst_gurbicha_woreda_first';

  const [branding, setBranding] = useState<CourtBranding>(() => {
    if (typeof window === 'undefined') return {};
    const localLogo = 
      localStorage.getItem(`court_logo_${instId}`) ||
      (instId.includes('gurbicha') ? (localStorage.getItem('court_logo_inst_gurbicha_woreda_first') || localStorage.getItem('court_logo_gurbicha')) : null);
    
    const matchedInst = getLocalInstitutions().find(i => i.id === instId);
    return {
      logoUrl: localLogo || matchedInst?.logoUrl || undefined,
      brandColor: '#3b82f6',
      primaryHeaderColor: '#1e293b'
    };
  });

  // Listen to local logo update events
  useEffect(() => {
    const handleLogoUpdate = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      if (detail.institutionId === instId || detail.institutionId?.includes('gurbicha')) {
        setBranding(prev => ({
          ...prev,
          logoUrl: detail.logoUrl
        }));
      }
    };

    window.addEventListener('seera_court_logo_updated', handleLogoUpdate);
    return () => window.removeEventListener('seera_court_logo_updated', handleLogoUpdate);
  }, [instId]);

  useEffect(() => {
    if (!instId) return;

    const unsub = onSnapshot(
      doc(db, 'court_institutions', instId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.logoUrl) {
            setBranding(prev => ({
              ...prev,
              logoUrl: data.logoUrl,
              brandColor: data.brandColor || prev.brandColor || '#3b82f6',
              primaryHeaderColor: data.primaryHeaderColor || prev.primaryHeaderColor || '#1e293b'
            }));
            try {
              localStorage.setItem(`court_logo_${instId}`, data.logoUrl);
            } catch {}
          }
        }
      },
      (error) => {
        console.warn('useCourtBranding onSnapshot notice:', error);
      }
    );

    return () => unsub();
  }, [instId]);

  return branding;
};

