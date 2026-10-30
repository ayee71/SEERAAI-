import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { getStoredOwnerKey } from '../services/referralTracking';
import { isOwnerAccount } from '../services/ownerAuth';
import { isCourtAccessAuthorized } from '../services/courtInstitutionService';

interface BottomNavbarProps {
  currentLang: Language;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavbar: React.FC<BottomNavbarProps> = ({
  currentLang,
  activeTab,
  onTabChange,
}) => {
  const t = translations[currentLang];
  const { user, profile } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [hasPremiumLicense, setHasPremiumLicense] = React.useState<boolean>(() => {
    return localStorage.getItem('seera_is_premium') === 'true';
  });

  const [isCourtAuth, setIsCourtAuth] = React.useState<boolean>(isCourtAccessAuthorized());

  React.useEffect(() => {
    const handleCourtAuthUpdate = () => {
      setIsCourtAuth(isCourtAccessAuthorized());
    };
    window.addEventListener('seera_court_session_changed', handleCourtAuthUpdate);
    return () => window.removeEventListener('seera_court_session_changed', handleCourtAuthUpdate);
  }, []);

  const isOwner = isOwnerAccount(
    user?.email || (profile as any)?.email,
    profile?.visitorName || profile?.appUsername,
    getStoredOwnerKey()
  );

  const isPremium = isOwner || profile?.role === 'premium' || (profile as any)?.subscriptionTier === 'premium' || (profile as any)?.isPremium === true || hasPremiumLicense;

  const mainTabs = isOwner
    ? [
        { id: 'home', label: t.nav.home, emoji: '🏠' },
        { id: 'adminDashboard', label: 'Admin', emoji: '🛡️' },
        { id: 'explainLaw', label: t.nav.explainLaw, emoji: '⚖️' },
        { id: 'analyticsFeedback', label: t.nav.analyticsFeedback || 'Hordoffii', emoji: '📊' },
      ]
    : [
        { id: 'home', label: t.nav.home, emoji: '🏠' },
        { id: 'explainLaw', label: t.nav.explainLaw, emoji: '⚖️' },
        { id: 'docAnalysis', label: t.nav.docAnalysis, emoji: '📄' },
        { id: 'citationFinder', label: currentLang === 'om' ? 'Wabii Seeraa' : currentLang === 'am' ? 'የሕግ ድንጋጌዎች' : 'Citation Finder', emoji: '🔍' },
      ];

  const baseSections = [
    { id: 'home', label: t.nav.home, emoji: '🏠', desc: 'Maallaqa fuula duraa fi seensa' },
    { id: 'library', label: currentLang === 'om' ? 'Kuusaa Sanadootaa' : 'Document Library', emoji: '📂', desc: 'Access legal documents' },
    { id: 'courtWork', label: currentLang === 'om' ? '📁 Fooldara Mana Murtii' : '📁 Court Folder', emoji: isCourtAuth ? '🏛️' : '🔒', desc: 'Judge/Court staff work' },
    { id: 'templates', label: t.nav.templates, emoji: '📝', desc: 'Sanadoota qophaa\'anii' },
    { id: 'citation', label: currentLang === 'om' ? 'Wabii Seeraa' : 'Citation Finder', emoji: '🔍', desc: 'AI citation search' },
    { id: 'create', label: t.nav.create, emoji: '✍️', desc: 'Drafting legal docs' },
    { id: 'explainLaw', label: t.nav.explainLaw, emoji: '⚖️', desc: 'Legal explanation' },
    { id: 'documentAnalysis', label: t.nav.docAnalysis, emoji: '📄', desc: 'Analyze docs' },
    { id: 'translate', label: t.nav.translate, emoji: '🌐', desc: 'Legal translation' },
    { id: 'socialMedia', label: t.nav.social, emoji: '📱', desc: 'Social posts' },
    { id: 'glossary', label: t.nav.glossary, emoji: '📖', desc: 'Legal terminology' },
    { id: 'comparison', label: t.nav.compareLaw, emoji: '⚖️', desc: 'Analysis' },
    { id: 'integration', label: t.nav.integration, emoji: '⚡', desc: 'AI Architecture' },
    { id: 'meeting', label: currentLang === 'om' ? 'Walgahii & Marii' : 'Meeting & Conference', emoji: '📹', desc: 'Video conference' },
    { id: 'myContent', label: t.nav.myContent, emoji: '📁', desc: 'Sanadoota koo kuufaman' },
  ];

  const allSections = isOwner
    ? [
        ...baseSections,
        { id: 'adminDashboard', label: 'Admin Dashboard', emoji: '🛡️', desc: 'To\'annoo mirkaneessa fayyadamtootaa, analytics & config' },
        { id: 'analyticsFeedback', label: t.nav.analyticsFeedback || 'Hordoffii & Yaada', emoji: '📊', desc: 'Baayyina namootaa, live activity & inbox' },
        { id: 'settings', label: t.nav.settings, emoji: '⚙️', desc: 'Qindeessaa fi chaappaa biiroo' },
      ]
    : [
        ...baseSections,
        { id: 'settings', label: t.nav.settings, emoji: '⚙️', desc: 'Qindeessaa fi chaappaa biiroo' },
      ];

  const handleSelectTab = (id: string) => {
    onTabChange(id);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Bottom Docked Navigation Bar for Handheld Devices */}
      <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#002347] border-t border-[#D4AF37] shadow-2xl pb-safe">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {mainTabs.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`flex flex-col items-center justify-center h-full min-h-[44px] px-1 transition-all ${
                  isActive
                    ? 'text-[#FFD700] font-bold'
                    : 'text-[#E0E0E0] hover:text-[#FFD700]'
                }`}
                title={item.label}
              >
                <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-[#FFD700]/20' : ''}`}>
                  <span className="text-lg">{item.emoji}</span>
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-full font-medium">
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}

          {/* More / All Sections Trigger */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] px-1 transition-all ${
              isMenuOpen || !mainTabs.some(t => t.id === activeTab)
                ? 'text-[#FFD700] font-bold'
                : 'text-[#E0E0E0] hover:text-[#FFD700]'
            }`}
            title="Sections & Menu"
          >
            <div className="p-1 rounded-xl bg-[#FFD700]/10 border border-[#D4AF37]/30">
              <span className="text-lg">📂</span>
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-full font-medium">
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* All Sections Bottom Sheet Modal */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 flex flex-col justify-end animate-fadeIn">
          <div 
            className="absolute inset-0" 
            onClick={() => setIsMenuOpen(false)} 
            aria-hidden="true"
          />
          <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl animate-slideUp pb-12">
            {/* Handle bar */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100 font-serif-legal">
                  Qajeelcha Seeraa fi Baafata (All Sections)
                </h3>
                <p className="text-xs text-slate-400">
                  Kutaa barbaaddan cuqaasuun 1-thumb press tiin argadhaa.
                </p>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white min-h-[44px] min-w-[44px]"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              {allSections.map((sec) => {
                const isActive = activeTab === sec.id;
                const firestoreRole = profile?.role || profile?.legalRole;
                const hasStrictPersonnelRole = isOwner || firestoreRole === 'court_personnel' || firestoreRole === 'admin' || firestoreRole === 'judge';
                const isCourtBenchItem = sec.id === 'courtWork';
                const isLocked = isCourtBenchItem && !isCourtAuth && !hasStrictPersonnelRole;

                return (
                  <button
                    key={sec.id}
                    onClick={() => handleSelectTab(sec.id)}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all min-h-[52px] ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md font-bold'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative ${isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-amber-400 border border-slate-800'}`}>
                      <span className="text-xl">{sec.emoji}</span>
                      {isLocked && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                          🔒
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate flex items-center justify-between">
                        <span>{sec.label}</span>
                        {isLocked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                            🔒 Hojjetaa Qofa
                          </span>
                        )}
                        {isCourtBenchItem && (isCourtAuth || hasStrictPersonnelRole) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                            ✓ Authorized
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{sec.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
