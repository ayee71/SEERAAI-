import React, { useState, useEffect } from 'react';
import { CourtDomainLauncherBar } from './CourtDomainLauncherBar';
import { DynamicCourtHeader } from './DynamicCourtHeader';
import { Language } from '../i18n/translations';
import { getActiveCourtSession, clearCourtSession } from '../services/courtInstitutionService';
import { CourtLinkDetails } from '../utils/courtLinkUtils';

interface CourtFolderGatewayProps {
  currentLang: Language;
  onNavigate: (tab: string) => void;
}

export const CourtFolderGateway: React.FC<CourtFolderGatewayProps> = ({
  currentLang,
  onNavigate
}) => {
  const [activeSession, setActiveSession] = useState(getActiveCourtSession());

  useEffect(() => {
    const handleSessionChange = () => setActiveSession(getActiveCourtSession());
    window.addEventListener('seera_court_session_changed', handleSessionChange);
    return () => window.removeEventListener('seera_court_session_changed', handleSessionChange);
  }, []);

  const handleLockFolder = () => {
    clearCourtSession();
    setActiveSession(null);
  };

  if (!activeSession) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-slate-900 rounded-3xl border border-amber-500/30">
          <h2 className="text-xl font-bold text-white mb-2 font-serif-legal">
            {currentLang === 'om' ? 'Fooldara Mana Murtii Seeni' : 'Enter Court Folder'}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {currentLang === 'om' 
              ? 'Fooldara mana murtii barbaaddan gadii filadhaa ykn lakk. linkii galchaa.' 
              : 'Select the court folder you wish to enter or enter its domain link below.'}
          </p>
          <CourtDomainLauncherBar 
            currentLang={currentLang}
            onSelectCourtFolder={(court) => {
                // Initialize session and navigate to court folder
                import('../services/courtInstitutionService').then(({ setActiveCourtSession }) => {
                  setActiveCourtSession({
                    type: 'judge_or_staff',
                    institutionId: court.institutionId || court.courtId,
                    courtName: court.courtName,
                    courtLevel: court.level,
                    user: {
                      id: 'session_init',
                      fullName: 'Court Staff',
                      emailOrUsername: 'staff@court.et',
                      role: 'registrar',
                    },
                    sessionStartedAt: new Date().toISOString(),
                  });
                  // Trigger navigation by reloading or calling the navigate callback
                  onNavigate('overview'); 
                });
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DynamicCourtHeader 
        currentLang={currentLang}
        onLockFolder={handleLockFolder}
        onOpenBrandingModal={() => onNavigate('branding_settings')}
      />
    </div>
  );
};
