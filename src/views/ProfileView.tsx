import React, { useState, useEffect } from 'react';
import { User, Shield, Award, BookOpen, FileText, Clock, Sparkles, Check, Edit3, Briefcase, GraduationCap, Scale, Star, Download, Trash2, LogOut, Smartphone, Globe, Camera } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';
import { getSavedDocumentsAsync, SavedLegalDocument } from '../services/storage';
import { getUserCredits, subscribeToTelebirrTransactions, TelebirrAnalyticsSummary, PaymentTransaction } from '../services/paymentService';
import { LegalAnalyticsChart } from '../components/LegalAnalyticsChart';
import { getDeviceInfo } from '../utils/device';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ProfileViewProps {
  currentLang: Language;
  onNavigateTab?: (tab: string) => void;
}

export type LegalRole = 'advocate' | 'judge' | 'prosecutor' | 'advisor' | 'student' | 'researcher';

export const ProfileView: React.FC<ProfileViewProps> = ({ currentLang, onNavigateTab }) => {
  const t = translations[currentLang];
  const { user, profile, updateProfile, logout } = useAuth();

  const currentSessionId = sessionStorage.getItem('seera_session_id') || '';
  const otherSessionsCount = profile?.activeSessions
    ? Object.keys(profile.activeSessions).filter((id) => id !== currentSessionId).length
    : 0;

  const handleLogOutOtherSessions = async () => {
    if (!profile || !profile.activeSessions) return;
    const currentSession = profile.activeSessions[currentSessionId];
    const newActiveSessions = currentSession ? { [currentSessionId]: currentSession } : {};
    try {
      await updateProfile({ activeSessions: newActiveSessions });
    } catch (err) {
      console.error('Failed to revoke other sessions:', err);
    }
  };

  const handleLogOutSingleSession = async (sidToRevoke: string) => {
    if (!profile || !profile.activeSessions) return;
    const updated = { ...profile.activeSessions };
    delete updated[sidToRevoke];
    try {
      await updateProfile({ activeSessions: updated });
    } catch (err) {
      console.error('Failed to revoke single session:', err);
    }
  };
  
  const [role, setRole] = useState<LegalRole>(() => {
    try {
      return (localStorage.getItem('seera_user_role') as LegalRole) || 'advocate';
    } catch {
      return 'advocate';
    }
  });

  const [savedDocs, setSavedDocs] = useState<SavedLegalDocument[]>([]);
  const [credits, setCredits] = useState<number>(5);
  const [savedDraft, setSavedDraft] = useState<string>('');
  const [savedContext, setSavedContext] = useState<string>('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.visitorName || 'Ayele Be Dha');
  const [institution, setInstitution] = useState(profile?.licenseOrInstitution || 'Federal Supreme Court Cassation Bar');
  
  const [facebookLink, setFacebookLink] = useState(
    profile?.facebookLink || localStorage.getItem('seera_profile_facebook') || ''
  );
  const [telegramLink, setTelegramLink] = useState(
    profile?.telegramLink || localStorage.getItem('seera_profile_telegram') || ''
  );
  const [linkedinLink, setLinkedinLink] = useState(
    profile?.linkedinLink || localStorage.getItem('seera_profile_linkedin') || ''
  );

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Legal Experience & Specialization States
  const [yearsExperience, setYearsExperience] = useState<string>(() => {
    return (profile as any)?.yearsExperience || localStorage.getItem('seera_profile_experience') || '10+ Years';
  });

  const [bioSummary, setBioSummary] = useState<string>(() => {
    return (profile as any)?.bioSummary || localStorage.getItem('seera_profile_bio') || 'Specialized in Federal & Oromia Supreme Court Cassation Precedents, Contract Drafting, Labor Dispute Resolution, and Real Estate Usufruct Litigation.';
  });

  const [specializations, setSpecializations] = useState<string[]>(() => {
    try {
      const stored = (profile as any)?.specializations || localStorage.getItem('seera_profile_specializations');
      if (stored) {
        return typeof stored === 'string' ? JSON.parse(stored) : stored;
      }
      return ['civil', 'criminal', 'contract', 'labor', 'property'];
    } catch {
      return ['civil', 'criminal', 'contract', 'labor', 'property'];
    }
  });

  const [notificationSettings, setNotificationSettings] = useState<{
    emailAlerts: boolean;
    telegramAlerts: boolean;
    smsAlerts: boolean;
    caseUpdates: boolean;
    sessionInvites: boolean;
    filingReminders: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }>(() => {
    try {
      const stored = (profile as any)?.notificationSettings || localStorage.getItem('seera_notification_settings');
      if (stored) {
        return typeof stored === 'string' ? JSON.parse(stored) : stored;
      }
    } catch {}
    return {
      emailAlerts: true,
      telegramAlerts: true,
      smsAlerts: false,
      caseUpdates: true,
      sessionInvites: true,
      filingReminders: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };
  });

  const [notifSavedToast, setNotifSavedToast] = useState<string | null>(null);

  const handleSaveNotificationSettings = async () => {
    try {
      localStorage.setItem('seera_notification_settings', JSON.stringify(notificationSettings));
      if (user) {
        await updateProfile({ notificationSettings } as any);
      }
      setNotifSavedToast(
        currentLang === 'om'
          ? 'Qindaa’inni beeksisaa milkaa’inaan kuufameera!'
          : currentLang === 'am'
          ? 'የማስታወቂያ ቅንብሮች በተሳካ ሁኔታ ተቀምጠዋል!'
          : 'Notification settings saved successfully!'
      );
      setTimeout(() => setNotifSavedToast(null), 3000);
    } catch (err) {
      console.error('Failed to save notification settings:', err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(currentLang === 'om' ? 'Fayiliin kiloo baay\'ee qaba (max 5MB)' : 'የፎቶው መጠን በጣም ትልቅ ነው (ከ 5MB ማነስ አለበት)');
      return;
    }

    setPhotoUploading(true);
    setPhotoError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64Data = canvas.toDataURL('image/jpeg', 0.85);
          
          try {
            if (user) {
              await updateProfile({ photoUrl: base64Data });
            }
          } catch (err) {
            console.error('Failed to save profile photo to Firestore:', err);
            setPhotoError(currentLang === 'om' ? 'Kuusuun hin dandahamne' : 'ፎቶውን ማስቀመጥ አልተሳካም።');
          }
        }
        setPhotoUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setPhotoError('Failed to read file');
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    getSavedDocumentsAsync().then(setSavedDocs);
    if (user?.uid) {
      getUserCredits(user.uid).then(setCredits);
    }
    try {
      const draft = localStorage.getItem('seera_ai_draft_prompt') || '';
      const ctx = localStorage.getItem('seera_ai_draft_context') || '';
      setSavedDraft(draft);
      setSavedContext(ctx);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (profile) {
      if (profile.visitorName) setDisplayName(profile.visitorName);
      if (profile.licenseOrInstitution) setInstitution(profile.licenseOrInstitution);
      if (profile.facebookLink) setFacebookLink(profile.facebookLink);
      if (profile.telegramLink) setTelegramLink(profile.telegramLink);
      if (profile.linkedinLink) setLinkedinLink(profile.linkedinLink);
      if (profile.legalRole) setRole(profile.legalRole as LegalRole);
      if ((profile as any).yearsExperience) setYearsExperience((profile as any).yearsExperience);
      if ((profile as any).bioSummary) setBioSummary((profile as any).bioSummary);
      if ((profile as any).specializations) {
        setSpecializations(
          typeof (profile as any).specializations === 'string'
            ? JSON.parse((profile as any).specializations)
            : (profile as any).specializations
        );
      }
      if ((profile as any).notificationSettings) {
        const notif = (profile as any).notificationSettings;
        setNotificationSettings(
          typeof notif === 'string' ? JSON.parse(notif) : notif
        );
      }
    }
  }, [profile]);

  const handleRoleChange = (newRole: LegalRole) => {
    setRole(newRole);
    try {
      localStorage.setItem('seera_user_role', newRole);
    } catch {}
    if (user) {
      updateProfile({ legalRole: newRole });
    }
  };

  const handleToggleSpecialization = (key: string) => {
    setSpecializations(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSaveProfileEdits = async () => {
    try {
      await updateProfile({
        visitorName: displayName.trim(),
        licenseOrInstitution: institution.trim(),
        legalRole: role,
        facebookLink: facebookLink.trim(),
        telegramLink: telegramLink.trim(),
        linkedinLink: linkedinLink.trim(),
        yearsExperience: yearsExperience.trim(),
        bioSummary: bioSummary.trim(),
        specializations: specializations,
      } as any);
      try {
        localStorage.setItem('seera_profile_facebook', facebookLink.trim());
        localStorage.setItem('seera_profile_telegram', telegramLink.trim());
        localStorage.setItem('seera_profile_linkedin', linkedinLink.trim());
        localStorage.setItem('seera_profile_experience', yearsExperience.trim());
        localStorage.setItem('seera_profile_bio', bioSummary.trim());
        localStorage.setItem('seera_profile_specializations', JSON.stringify(specializations));
      } catch {}
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Failed to update profile edits:', err);
    }
  };

  const formatUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const getRoleBadge = (r: LegalRole) => {
    switch (r) {
      case 'advocate':
        return { label: 'Abukaattoo / Advocate', icon: Briefcase, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'judge':
        return { label: 'Abbaa Seeraa / Judge', icon: Scale, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case 'prosecutor':
        return { label: 'Abbaa Alangaa / Prosecutor', icon: Shield, color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'advisor':
        return { label: 'Gorsaa Seeraa / Legal Advisor', icon: Award, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'student':
        return { label: 'Barataa Seeraa / Law Student', icon: GraduationCap, color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
      case 'researcher':
        return { label: 'Qoraa Seeraa / Legal Researcher', icon: BookOpen, color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      default:
        return { label: 'Ogeessa Seeraa / Legal Professional', icon: Briefcase, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
  };

  const currentBadge = getRoleBadge(role);
  const RoleIcon = currentBadge.icon;
  const deviceInfo = getDeviceInfo();

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto overflow-y-auto max-h-screen">
      {/* Profile Header Banner */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Scale className="w-48 h-48 text-amber-400" />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Dynamic Avatar with Camera Capture / File Upload Overlay */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-3xl shadow-xl overflow-hidden border border-slate-700/80">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
                {photoUploading && (
                  <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              {/* Overlaid camera trigger button */}
              <label className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 hover:text-amber-300 shadow-md cursor-pointer transition-all hover:scale-110 flex items-center justify-center">
                <Camera className="w-3.5 h-3.5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />
              </label>
            </div>
            
            {photoError && (
              <div className="absolute top-20 left-0 bg-rose-500/90 text-white text-[10px] px-2.5 py-1 rounded-md border border-rose-600 shadow-md animate-bounce">
                ⚠️ {photoError}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-serif-legal font-bold text-slate-100">
                  {displayName}
                </h1>
                {profile?.appUsername && (
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300">
                    @{profile.appUsername}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${currentBadge.color}`}>
                  <RoleIcon className="w-3.5 h-3.5" />
                  <span>{currentBadge.label}</span>
                </span>
              </div>

              {/* Visual Badge System based on profile data */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(profile?.isLegalProfessional || role) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm" title="Verified Legal Professional">
                    <span>⚖️</span>
                    <span>Verified Legal Professional</span>
                  </span>
                )}

                {(profile?.isPremium || localStorage.getItem('seera_is_premium') === 'true' || credits > 10) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm" title="Premium Subscriber">
                    <span>✨</span>
                    <span>Premium Subscriber</span>
                  </span>
                )}

                {(role === 'student' || role === 'researcher' || (institution || '').toLowerCase().match(/(univ|college|academy|institute|research|barataa|student)/i)) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300 shadow-sm" title="Academic Partner">
                    <span>🎓</span>
                    <span>Academic Partner</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                <span>📧 {user?.email || 'user@seeraai.et'}</span>
                <span>•</span>
                <span>🏛️ {institution}</span>
              </p>

              {/* Professional Networking Links */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {linkedinLink ? (
                  <a
                    href={formatUrl(linkedinLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/50 text-blue-300 text-xs font-semibold hover:bg-blue-900 transition-all shadow-sm"
                  >
                    <span>💼 LinkedIn Profile</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-300 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    <span>💼 + Add LinkedIn Profile</span>
                  </button>
                )}

                {facebookLink && (
                  <a
                    href={formatUrl(facebookLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/50 text-indigo-300 text-xs font-semibold hover:bg-indigo-900 transition-all shadow-sm"
                  >
                    <span>📘 Facebook</span>
                  </a>
                )}

                {telegramLink && (
                  <a
                    href={formatUrl(telegramLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/50 text-sky-300 text-xs font-semibold hover:bg-sky-900 transition-all shadow-sm"
                  >
                    <span>✈️ Telegram</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Fooyyessi (Edit Profile)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 text-center">
              <span className="text-[10px] text-slate-400 block font-medium">Haftee Fayyadamaa (Credits):</span>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-0.5">
                {credits >= 99999 ? '∞ Unlimited' : `${credits} Queries`}
              </div>
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Kaawuntii keessaa ba'i (Log Out)"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>{currentLang === 'om' ? 'Ba\'i (Log Out)' : currentLang === 'am' ? 'ውጣ (Log Out)' : 'Log Out'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 font-serif-legal flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <span>Gulaala Profaayilii & Professional Links</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="text-slate-400 hover:text-slate-200 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Maqaa Guutuu / Full Name:
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Biiroo / Mana Murtii / Bar Association / Institution:
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Experience & Specialization Inputs */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="font-bold text-amber-400 text-xs block">
                  🎓 Muuxannoo fi Ogummaa Seeraa (Experience & Specialization):
                </span>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    ⏳ Muuxannoo Hojii (Years of Legal Experience):
                  </label>
                  <input
                    type="text"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    placeholder="e.g. 10+ Years in Cassation Bench & Advocacy"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    📜 Ibsa Gabaabaa Ogummaa (Bio & Specialization Summary):
                  </label>
                  <textarea
                    rows={2}
                    value={bioSummary}
                    onChange={(e) => setBioSummary(e.target.value)}
                    placeholder="Brief legal bio and key areas of expertise..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-amber-500 focus:outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1.5">
                    🏷️ Dameewwan Seeraa Speshaalaayizii Ta'an (Areas of Legal Expertise):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'civil', label: 'Civil Law / Hariiroo Hawaasaa' },
                      { id: 'criminal', label: 'Criminal Law / Seera Yakkaa' },
                      { id: 'contract', label: 'Contract Law / Waliigaltee' },
                      { id: 'labor', label: 'Labor Law / Hojjetaa fi Hojjachiisaa' },
                      { id: 'property', label: 'Property & Land / Lafa fi Qabeenya' },
                      { id: 'constitutional', label: 'Constitutional / Heera Mootummaa' },
                      { id: 'commercial', label: 'Commercial & Tax / Daldala fi Gibira' },
                      { id: 'family', label: 'Family Law / Seera Maatii' },
                    ].map((spec) => {
                      const isSel = specializations.includes(spec.id);
                      return (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => handleToggleSpecialization(spec.id)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isSel ? '✓ ' : '+ '}
                          {spec.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <span className="font-bold text-amber-400 text-xs block">
                  🌐 Professional Networking & Social Links:
                </span>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    💼 LinkedIn Profile URL:
                  </label>
                  <input
                    type="text"
                    value={linkedinLink}
                    onChange={(e) => setLinkedinLink(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    📘 Facebook Profile / Page URL:
                  </label>
                  <input
                    type="text"
                    value={facebookLink}
                    onChange={(e) => setFacebookLink(e.target.value)}
                    placeholder="https://facebook.com/username"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    ✈️ Telegram Profile / Channel URL:
                  </label>
                  <input
                    type="text"
                    value={telegramLink}
                    onChange={(e) => setTelegramLink(e.target.value)}
                    placeholder="https://t.me/username"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Explicit Privacy Protection & Criminal Law Notice */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 text-[11px] space-y-1.5 text-slate-300">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span>🛡️ Eegumsa Iccitii & Akeekkachiisa Seeraa (Privacy Guarantee)</span>
                </div>
                <p className="leading-relaxed">
                  • <strong>Hidhata Dataa Qofa (Data Only):</strong> Hidhanni miidiyaa hawaasaa (Facebook, Telegram, LinkedIn) mirkaneessa eenyummaa fi neetworkii seeraatiif qofa kan oolu ta'ee, mirga iccitii (privacy) keessan irratti dhiibbaa tokkoyyuu hin uumu.
                </p>
                <p className="leading-relaxed text-amber-300">
                  • <strong>Akeekkachiisa Yakkaa:</strong> Mirga iccitii (privacy) nama biroo tuquun, sarbuun, ykn odeeffannoo dhuunfaa seeraan ala fayyadamuu fi xureessuun bu'uura Labsii Yakka Kompiyuutaraa FDRE Lakk. 958/2008 fi Seera Adabaatiin <strong>YAKKA SEERAAN GAAFACHIISUDHA</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Dhiisi (Cancel)
              </button>
              <button
                type="button"
                onClick={handleSaveProfileEdits}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
              >
                💾 Ol Kaa'i (Save Profile)
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Role Selection Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span>🎯 Maamila Ogummaa Seeraa (Select Legal Profession / Role):</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { id: 'advocate', name: 'Abukaattoo', desc: 'Advocate / Attorney' },
            { id: 'judge', name: 'Abbaa Seeraa', desc: 'Judge / Bench' },
            { id: 'prosecutor', name: 'Abbaa Alangaa', desc: 'Prosecutor' },
            { id: 'advisor', name: 'Gorsaa Seeraa', desc: 'Legal Advisor' },
            { id: 'student', name: 'Barataa Seeraa', desc: 'Law Student' },
          ].map((r) => {
            const isSel = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleChange(r.id as any)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSel
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-bold">{r.name}</div>
                <div className={`text-[10px] ${isSel ? 'text-slate-900' : 'text-slate-500'}`}>{r.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience & Specialization Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om' ? 'Muuxannoo fi Ogummaa Seeraa (Experience & Specialization)' : currentLang === 'am' ? 'የሕግ ሙያ ልምድ እና ልዩ ብቃት (Experience & Specialization)' : 'Experience & Specialization'}
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om' ? 'Dameewwan seeraa gorfamaniin beekamtan fi muuxannoo sochooftan' : 'የሚሰጧቸው የሕግ አገልግሎት ዘርፎች እና የሙያ ልምድ'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Gulaali (Edit Specialization)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
          {/* Years Experience & Bio */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <span className="text-amber-400">⏳ {currentLang === 'om' ? 'Muuxannoo Hojii:' : 'የስራ ልምድ፦'}</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold">
                {yearsExperience}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-1 text-slate-300 leading-relaxed font-serif-legal">
              <span className="text-[10px] text-slate-400 font-mono block uppercase font-bold tracking-wider">
                📜 {currentLang === 'om' ? 'Ibsa Gabaabaa Ogummaa (Bio Summary):' : 'የሙያ ማጠቃለያ፦'}
              </span>
              <p className="text-xs text-slate-200">
                {bioSummary}
              </p>
            </div>
          </div>

          {/* Specialization Tags */}
          <div className="md:col-span-5 p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
            <span className="text-[10px] font-bold text-amber-400 font-mono uppercase tracking-wider block">
              🎓 {currentLang === 'om' ? 'Dameewwan Seeraa Speshaalaayizii Ta\'an:' : 'የስፔሻላይዜሽን መስኮች፦'}
            </span>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'civil', label: 'Civil Law / Hariiroo Hawaasaa' },
                { id: 'criminal', label: 'Criminal Law / Seera Yakkaa' },
                { id: 'contract', label: 'Contract Law / Waliigaltee' },
                { id: 'labor', label: 'Labor Law / Hojjetaa fi Hojjachiisaa' },
                { id: 'property', label: 'Property & Land / Lafa fi Qabeenya' },
                { id: 'constitutional', label: 'Constitutional / Heera Mootummaa' },
                { id: 'commercial', label: 'Commercial & Tax / Daldala fi Gibira' },
                { id: 'family', label: 'Family Law / Seera Maatii' },
              ].map((spec) => {
                const isSelected = specializations.includes(spec.id);
                return (
                  <span
                    key={spec.id}
                    className={`px-3 py-1 rounded-xl text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '•'}</span>
                    <span>{spec.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings & Quiet Hours Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <span className="text-xl">🔔</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om'
                  ? 'Qindaa’ina Beeksisaa & Sa’aatii Callinsaa (Notification Settings & Quiet Hours)'
                  : currentLang === 'am'
                  ? 'የማስታወቂያ ቅንብሮች እና የጸጥታ ሰዓት (Notification Settings & Quiet Hours)'
                  : 'Notification Settings & Quiet Hours'}
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om'
                  ? 'Beeksisa Email, Telegram fi SMS galmee murtii, beellama fi waamicha dhaddachaaf to\'annoo godhi.'
                  : currentLang === 'am'
                  ? 'የኢሜይል፣ ቴሌግራም እና ኤስኤምኤስ ማስታወቂያዎችን ለመዝገቦች እና ለችሎት ጥሪዎች ያስተካክሉ።'
                  : 'Manage Email, Telegram, and SMS alerts for case updates, invites, and define quiet hours.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveNotificationSettings}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>💾</span>
            <span>
              {currentLang === 'om'
                ? 'Qindaa’ina Kaa’i (Save Preferences)'
                : currentLang === 'am'
                ? 'ቅንብሮችን አስቀምጥ'
                : 'Save Preferences'}
            </span>
          </button>
        </div>

        {notifSavedToast && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-in fade-in">
            ✓ {notifSavedToast}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Notification Channels */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-amber-400 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <span>📡</span>
              <span>{currentLang === 'om' ? 'Kallattii Beeksisaa (Alert Channels):' : currentLang === 'am' ? 'የማስታወቂያ መስመሮች፦' : 'Alert Channels:'}</span>
            </h4>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-200 font-medium flex items-center gap-2">
                  <span>📧</span>
                  <span>Email Alerts</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationSettings.emailAlerts}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({ ...prev, emailAlerts: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-200 font-medium flex items-center gap-2">
                  <span>✈️</span>
                  <span>Telegram Channel/Direct</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationSettings.telegramAlerts}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({ ...prev, telegramAlerts: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-200 font-medium flex items-center gap-2">
                  <span>📱</span>
                  <span>SMS Notifications</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationSettings.smsAlerts}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({ ...prev, smsAlerts: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Event Categories */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-amber-400 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯</span>
              <span>{currentLang === 'om' ? 'Akaakuu Beeksisaa (Event Types):' : currentLang === 'am' ? 'የማስታወቂያ ዓይነቶች፦' : 'Event Types:'}</span>
            </h4>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-200 font-medium flex items-center gap-2">
                  <span>⚖️</span>
                  <span>Case & Proclamation Updates</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationSettings.caseUpdates}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({ ...prev, caseUpdates: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-200 font-medium flex items-center gap-2">
                  <span>🏛️</span>
                  <span>Session & Kiosk Invites</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationSettings.sessionInvites}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({ ...prev, sessionInvites: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-200 font-medium flex items-center gap-2">
                  <span>🔔</span>
                  <span>Beellama & Filing Reminders</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationSettings.filingReminders}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({ ...prev, filingReminders: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Quiet Hours Configuration */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-amber-400 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <span>🌙</span>
              <span>{currentLang === 'om' ? 'Sa’aatii Callinsaa (Quiet Hours):' : currentLang === 'am' ? 'የጸጥታ ሰዓት (Quiet Hours)፦' : 'Quiet Hours:'}</span>
            </h4>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-200 font-medium flex items-center gap-2">
                  <span>🔕</span>
                  <span>Enable Quiet Hours</span>
                </span>
                <input
                  type="checkbox"
                  checked={notificationSettings.quietHoursEnabled}
                  onChange={(e) =>
                    setNotificationSettings((prev) => ({ ...prev, quietHoursEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>

              {notificationSettings.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">
                      {currentLang === 'om' ? 'Jalqaaba (Start):' : 'መጀመርያ፦'}
                    </label>
                    <input
                      type="time"
                      value={notificationSettings.quietHoursStart}
                      onChange={(e) =>
                        setNotificationSettings((prev) => ({ ...prev, quietHoursStart: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">
                      {currentLang === 'om' ? 'Dhuma (End):' : 'መጨረሻ፦'}
                    </label>
                    <input
                      type="time"
                      value={notificationSettings.quietHoursEnd}
                      onChange={(e) =>
                        setNotificationSettings((prev) => ({ ...prev, quietHoursEnd: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                {currentLang === 'om'
                  ? 'Sa’aatii callinsaa keessatti beeksisonni dhufan haala callisaan kuufamanii sa’aatiin sun yeroo xumuramu ergamu.'
                  : currentLang === 'am'
                  ? 'በጸጥታ ሰዓት ውስጥ የሚመጡ ማስታወቂያዎች በጸጥታ ተቀምጠው የጸጥታው ሰዓት ሲያልቅ ይላካሉ።'
                  : 'Notifications arriving during quiet hours will be muted and queued until quiet hours end.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Login Activity & Security Session Info Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-serif-legal">
                {currentLang === 'om' ? 'Seenaa Seensa Kaawuntii & Nageenyaa (Recent Login Activity)' : currentLang === 'am' ? 'የቅርብ ጊዜ የመግቢያ እንቅስቃሴ እና ደህንነት (Recent Login Activity)' : 'Recent Login Activity & Security'}
              </h3>
              <p className="text-xs text-slate-400">
                {currentLang === 'om' ? 'Yeroo dhihoo kaawuntii kanatti akkaaniin seename fi odeeffannoo meeshaa.' : currentLang === 'am' ? 'የቅርብ ጊዜ የመግቢያ ጊዜ እና የመሳሪያ መረጃ።' : 'Device, timestamp, and Firebase Auth session details.'}
              </p>
            </div>
          </div>

          {/* Prominent Firebase Sign Out Button */}
          {/* Prominent Firebase Sign Out Button & Bulk Session Revocation */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {otherSessionsCount > 0 && (
              <button
                type="button"
                onClick={handleLogOutOtherSessions}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-red-500/30 text-red-400 font-bold text-xs shadow-md transition-all cursor-pointer"
                title="Hunda irraa ba'i"
              >
                <span>🚪 {currentLang === 'om' ? 'Meeshaalee Biroo Hunda irraa Ba\'i' : currentLang === 'am' ? 'ከሌሎች መሳሪያዎች ሁሉ ውጣ' : 'Log Out All Other Devices'} ({otherSessionsCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs shadow-lg transition-all cursor-pointer hover:shadow-rose-950/50"
              title="Kaawuntii keessaa ba'i (Sign Out from Firebase)"
            >
              <LogOut className="w-4 h-4" />
              <span>{currentLang === 'om' ? '🚪 Sign Out (Kaawuntii Ba\'i)' : currentLang === 'am' ? '🚪 Sign Out (ውጣ)' : '🚪 Sign Out'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Last Login Time */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentLang === 'om' ? 'Seensa Dhihoo (Last Login):' : currentLang === 'am' ? 'የቅርብ ጊዜ መግቢያ፦' : 'Last Login:'}</span>
            </div>
            <div className="font-mono text-slate-200 font-bold text-xs truncate">
              {user?.metadata?.lastSignInTime
                ? new Date(user.metadata.lastSignInTime).toLocaleString(currentLang === 'om' ? 'om-ET' : currentLang === 'am' ? 'am-ET' : 'en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : new Date().toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span>●</span>
              <span>Active Firebase Session</span>
            </div>
          </div>

          {/* Device & Operating System */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-[11px]">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentLang === 'om' ? 'Meeshaa (Device & OS):' : currentLang === 'am' ? 'መሳሪያ እና OS፦' : 'Device & OS:'}</span>
            </div>
            <div className="font-semibold text-slate-200 text-xs truncate">
              {deviceInfo.deviceType}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {deviceInfo.os}
            </div>
          </div>

          {/* Browser Info */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-[11px]">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>{currentLang === 'om' ? 'Koppii Barbaadaa (Browser):' : currentLang === 'am' ? 'መቃኛ (Browser)፦' : 'Browser:'}</span>
            </div>
            <div className="font-semibold text-slate-200 text-xs truncate">
              {deviceInfo.browser}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate" title={deviceInfo.fullUA}>
              {deviceInfo.fullUA.substring(0, 28)}...
            </div>
          </div>

          {/* Account Registered Date */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-[11px]">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentLang === 'om' ? 'Uumama Account (Created):' : currentLang === 'am' ? 'አካውንቱ የተፈጠረበት፦' : 'Account Created:'}</span>
            </div>
            <div className="font-mono text-slate-200 font-bold text-xs truncate">
              {user?.metadata?.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString(currentLang === 'om' ? 'om-ET' : currentLang === 'am' ? 'am-ET' : 'en-US', {
                    dateStyle: 'medium',
                  })
                : 'Registered Jurist'}
            </div>
            <div className="text-[10px] text-amber-400 font-mono">
              UID: {user?.uid ? `${user.uid.substring(0, 10)}...` : 'Verified'}
            </div>
          </div>
        </div>

        {/* Real-time Session List & Management Dashboard */}
        {profile?.activeSessions && Object.keys(profile.activeSessions).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/60 text-xs space-y-3">
            <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
              🌐 {currentLang === 'om' ? 'Meeshaalee Kaawuntiin Kee Itti Saaqamee Jiru (Active Sessions):' : currentLang === 'am' ? 'አካውንትዎ የተከፈተባቸው መሳሪያዎች (Active Sessions)፦' : 'Active Sessions Logged In:'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(profile.activeSessions).map(([sid, sess]) => {
                const isCurrent = sid === currentSessionId;
                return (
                  <div
                    key={sid}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isCurrent 
                        ? 'bg-emerald-950/20 border-emerald-500/30' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700/60'
                    }`}
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center gap-1.5 font-bold text-slate-200">
                        <span>{sess.deviceType}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/25 border border-emerald-500/40 text-emerald-300">
                            {currentLang === 'om' ? 'Meeshaa Kana' : currentLang === 'am' ? 'ይህ መሳሪያ' : 'This Device'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {sess.os} • {sess.browser}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {currentLang === 'om' ? 'Seene:' : currentLang === 'am' ? 'የገባበት፦' : 'Login:'} {new Date(sess.loginTime || sess.lastActive).toLocaleString()}
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleLogOutSingleSession(sid)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-bold text-[10px] cursor-pointer"
                        title={currentLang === 'om' ? 'Meeshaa kana irraa ba\'isi' : 'ከዚህ መሳሪያ ላይ አስወጣ'}
                      >
                        {currentLang === 'om' ? 'Ba\'isi' : currentLang === 'am' ? 'አስወጣ' : 'Revoke'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Usage History & Managed Drafts vs Saved Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Managed Drafts & Quick Stats */}
        <div className="lg:col-span-5 space-y-6">
          {/* Managed Drafts Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 font-serif-legal flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Qophii Draft Qabame (Managed Draft)</span>
              </h3>
              <span className="text-xs font-mono text-amber-400 px-2 py-0.5 rounded bg-slate-800">
                {savedDraft ? 'Active Draft' : 'No Draft'}
              </span>
            </div>

            {savedDraft ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono line-clamp-4 leading-relaxed">
                  {savedDraft}
                </div>
                {savedContext && (
                  <p className="text-[11px] text-slate-400">Context: {savedContext}</p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab('create');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer"
                  >
                    Draft Kanatti Fufi →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem('seera_ai_draft_prompt');
                        localStorage.removeItem('seera_ai_draft_context');
                        setSavedDraft('');
                        setSavedContext('');
                      } catch {}
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-medium cursor-pointer"
                  >
                    Haquu (Clear)
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Draftn kuusame hin jiru. Fuula Uumuu (Create) irraa barreeffama keessan "Draft Kaa'isi" jechuun kuusuu dandeessu.
              </p>
            )}
          </div>

          {/* Usage History & Statistics */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 font-serif-legal flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Seenaa Fayyadamaa (Usage History & Activity)</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Sanadoota Kuusaman (Saved Documents):</span>
                <span className="font-bold text-amber-400 font-mono">{savedDocs.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Qorannoo Seeraa Gaggeeffame:</span>
                <span className="font-bold text-amber-400 font-mono">24 Queries</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Haala Eeyyamaa (Account Status):</span>
                <span className="font-bold text-emerald-400">Active Jurist</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Saved Documents for this Professional */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 font-serif-legal flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Sanadoota Koo Kuusaman ({savedDocs.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateTab) onNavigateTab('mycontent');
                }}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                Hunda Ilaali →
              </button>
            </div>

            {savedDocs.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <span className="text-3xl">📁</span>
                <p className="text-xs text-slate-400">Sanadni kuusame hin jiru.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {savedDocs.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{doc.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{doc.content}</p>
                      <span className="text-[10px] text-amber-400 font-mono block">
                        {new Date(doc.createdAt).toLocaleDateString()} • {doc.taskType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recharts Citation Frequency Analytics Chart */}
          <LegalAnalyticsChart docs={savedDocs} currentLang={currentLang} />
        </div>
      </div>
    </div>
  );
};
