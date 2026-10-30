import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  Lock, 
  UserCheck, 
  Image as ImageIcon, 
  Landmark, 
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { 
  CourtInstitution, 
  updateCourtBrandingAndSuperAdmin 
} from '../services/courtInstitutionService';

interface CourtTenantBrandingModalProps {
  currentLang?: Language;
  isOpen?: boolean;
  onClose: () => void;
  institution: CourtInstitution;
  onUpdated?: (updated: CourtInstitution) => void;
}

export const CourtTenantBrandingModal: React.FC<CourtTenantBrandingModalProps> = ({
  currentLang = 'om',
  isOpen = true,
  onClose,
  institution,
  onUpdated
}) => {
  const t = translations[currentLang] || translations.om;
  if (!isOpen) return null;

  const [customCourtName, setCustomCourtName] = useState(institution.customCourtName || institution.name);
  const [logoUrl, setLogoUrl] = useState(institution.logoUrl || '');
  const [superAdminName, setSuperAdminName] = useState(institution.superAdminName || institution.adminName);
  const [superAdminEmail, setSuperAdminEmail] = useState(institution.superAdminEmail || institution.adminEmail);
  const [superAdminPhone, setSuperAdminPhone] = useState(institution.superAdminPhone || institution.adminPhone || '');
  const [accessCode, setAccessCode] = useState(institution.accessCode || 'COURT-2026');
  const [courtTelegramLink, setCourtTelegramLink] = useState(institution.courtTelegramLink || 'https://t.me/OromiaCourtBot');
  const [courtEmailAddress, setCourtEmailAddress] = useState(institution.courtEmailAddress || institution.adminEmail || 'info@court.oromia.gov.et');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();

    const res = updateCourtBrandingAndSuperAdmin(institution.id, {
      customCourtName,
      logoUrl,
      superAdminName,
      superAdminEmail,
      superAdminPhone,
      accessCode,
      courtTelegramLink,
      courtEmailAddress
    });

    if (res.success && res.institution) {
      setSuccessMsg(
        currentLang === 'om'
          ? 'Maqaa, Loogoo fi Super Admin Mana Murtii milkaa\'inaan haaromfameera!'
          : 'Court branding & Super Admin settings saved successfully!'
      );

      if (onUpdated) onUpdated(res.institution);

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xl font-bold shrink-0">
              🏛️
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif-legal">
                {currentLang === 'om' ? 'Sirna Bifa & Loogoo Mana Murtii (Court Branding & Super Admin)' : 'Court Custom Branding & Super Admin Portal'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {institution.name} • ID: {institution.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Privacy Guarantee Note */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 text-emerald-200 space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>EEGUMSA ICCITII SEERAA & DATA ISOLATION GUARANTEE</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Manni murtii kireeffate ykn deeggarsaan tajaajila kana fayyadamu super admin mataa isaa ni qabaata. Abbaan appichaa metadata mana murtichaa (Maqaa, Loogoo, Super Admin) qofa kan arguu danda'u yoo ta'u, <strong>dhimmoota seeraa, galmee falmii fi jecha ragaa mana murtichaa kamiyyuu arguu irraa dhorkamaa dha (Cryptographically Isolated)</strong>.
            </p>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4">
            {/* Court Name Customization */}
            <div>
              <label className="block text-slate-300 font-bold text-xs mb-1">
                Maqaa Mana Murtii (Custom Court Institution Name) *
              </label>
              <input
                type="text"
                value={customCourtName}
                onChange={e => setCustomCourtName(e.target.value)}
                placeholder="fkn. Mana Murtii Ol'aanaa Godina Shawaa Bahaa (Adaamaa)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {/* Court Logo & Emblem Selection */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="block text-amber-300 font-bold text-xs">
                Loogoo Mana Murtii (Court Official Logo / Emblem)
              </label>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-amber-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Court Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Landmark className="w-8 h-8 text-amber-400" />
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    placeholder="URL loogoo ykn Image Link..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />

                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Suuraa Loogoo Fe'i (Upload Image File)</span>
                    <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Dedicated Super Admin Delegation */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>SUPER ADMIN MANA MURTII (DEDICATED COURT SUPER ADMIN)</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Maqaa Guutuu Super Admin *</label>
                  <input
                    type="text"
                    value={superAdminName}
                    onChange={e => setSuperAdminName(e.target.value)}
                    placeholder="fkn. Obbo Tolaa Dheeressaa"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Email Official Super Admin *</label>
                  <input
                    type="email"
                    value={superAdminEmail}
                    onChange={e => setSuperAdminEmail(e.target.value)}
                    placeholder="fkn. superadmin@adama.court.gov.et"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Lakkoofsa Bilbilaa</label>
                  <input
                    type="text"
                    value={superAdminPhone}
                    onChange={e => setSuperAdminPhone(e.target.value)}
                    placeholder="fkn. +251911223344"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Koodii Seensaa (Access Passcode) *</label>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={e => setAccessCode(e.target.value)}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Official Court Communication Channels (Telegram & Email for Order Dispatch) */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                <span>📱 📧</span>
                <span>Karaalee Ergaa & Ajaja Mana Murtii (Official Telegram & Email Channels)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ofisariin seeraa ajaja dhaddacha irraa kenname qaama ajajameef (Himatamaa, Poolisii, Baankii) akka erguuf linkii Telegram fi Email manni murtii uumetti fayyadama.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Linkii / Bot Telegram Mana Murtii</label>
                  <input
                    type="text"
                    value={courtTelegramLink}
                    onChange={e => setCourtTelegramLink(e.target.value)}
                    placeholder="fkn. https://t.me/OromiaCourtBot ykn @CourtChannel"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Email Official Kutaa Ofiisara Seeraa</label>
                  <input
                    type="email"
                    value={courtEmailAddress}
                    onChange={e => setCourtEmailAddress(e.target.value)}
                    placeholder="fkn. legal.dispatch@oromia.gov.et"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Branding & Super Admin Mana Murtii Mirkaneessi</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CourtTenantBrandingModal;
