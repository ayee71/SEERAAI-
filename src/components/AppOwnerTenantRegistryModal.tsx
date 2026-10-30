import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  Landmark, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Layers, 
  Search,
  Filter,
  Sparkles,
  Users
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { 
  getAppOwnerTenantRegistry, 
  CourtInstitution 
} from '../services/courtInstitutionService';

interface AppOwnerTenantRegistryModalProps {
  currentLang?: Language;
  isOpen?: boolean;
  onClose: () => void;
  onManageBranding?: (instId: string) => void;
}

export const AppOwnerTenantRegistryModal: React.FC<AppOwnerTenantRegistryModalProps> = ({
  currentLang = 'om',
  isOpen = true,
  onClose,
  onManageBranding
}) => {
  const t = translations[currentLang] || translations.om;
  const registryList = getAppOwnerTenantRegistry();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredTenants = registryList.filter(t => 
    t.courtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.superAdminName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xl font-bold shrink-0">
              👑
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-serif-legal">
                {currentLang === 'om' ? 'Kutaa Abbaa Appii - Galmee Manneen Murtii & Super Admin (Tenant Registry)' : 'App Owner Court Tenant & Super Admin Registry'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Multi-Tenant Court Leasing Overview • Total Courts: {registryList.length}
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Privacy Guarantee Banner */}
          <div className="p-4 rounded-2xl bg-emerald-950/30 border-2 border-emerald-500/40 text-emerald-200 space-y-1.5 shadow-md">
            <div className="font-bold text-emerald-300 flex items-center gap-2 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>GUARANTEE EEGUAMSA ICCITII MANNEEN MURTII (JUDICIAL PRIVACY SHIELD)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Akka Abbaa Appiitti (Platform Owner), manneen murtii appii kana fayyadaman hundi <strong>Super Admin mataa isaanii</strong> kan qaban ta'uun isaanii fi metadata isaanii (Maqaa, Loogoo, Super Admin Contact) asirratti siif mul'ata. <strong>Haa ta'u malee, galmee falmii, dhimma seeraa iccitii, fi jecha ragaa dhaddacha manneen murtii sanaa kamiyyuu arguu irraa sarara seeraa fi teeknoolojiitiin dhorkamta.</strong>
            </p>
          </div>

          {/* Search Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Mana murtii, Super Admin, ykn Godina barbaadi..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <span className="text-[11px] text-amber-400 font-mono font-bold bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 shrink-0">
              {filteredTenants.length} Institutions
            </span>
          </div>

          {/* Tenants Registry List Table */}
          <div className="space-y-3">
            {filteredTenants.map(tenant => (
              <div
                key={tenant.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all space-y-3 shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center overflow-hidden shrink-0">
                      {tenant.logoUrl ? (
                        <img src={tenant.logoUrl} alt="Court Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Landmark className="w-5 h-5 text-amber-400" />
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-white text-sm font-serif-legal">
                        {tenant.courtName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {tenant.region} • {tenant.courtLevel.toUpperCase()} • ID: {tenant.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      🛡️ Privacy Shield Active
                    </span>

                    {onManageBranding && (
                      <button
                        type="button"
                        onClick={() => onManageBranding(tenant.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
                      >
                        🎨 Branding & Super Admin Edit
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Super Admin Mana Murtii:</span>
                    <div className="font-bold text-amber-300">{tenant.superAdminName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{tenant.superAdminEmail}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Hooggansa & Staff:</span>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>{tenant.activeStaffCount} Hojjettoota Galmaa'an</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Daangaa Argamaa Abbaa Appii:</span>
                    <div className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Metadata Only (Cases Locked)</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppOwnerTenantRegistryModal;
