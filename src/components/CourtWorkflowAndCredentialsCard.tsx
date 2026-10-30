import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Key, 
  Copy, 
  Check, 
  ShieldCheck, 
  FileText, 
  Workflow, 
  Scale, 
  Gavel, 
  ArrowRight,
  Sparkles,
  Lock,
  UserCheck
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { setActiveCourtSession } from '../services/courtInstitutionService';

interface CourtWorkflowAndCredentialsCardProps {
  currentLang?: Language;
  onNavigateToCourtWork?: () => void;
}

export const CourtWorkflowAndCredentialsCard: React.FC<CourtWorkflowAndCredentialsCardProps> = ({
  currentLang = 'om',
  onNavigateToCourtWork
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tiers' | 'workflow' | 'credentials'>('credentials');

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const instantLogin = (username: string, passcode: string, role: string, courtName: string) => {
    setActiveCourtSession({
      type: 'judge_or_staff',
      institutionId: 'inst_oromia_supreme',
      courtName: courtName,
      courtLevel: 'supreme_court',
      user: {
        id: `user_${Date.now()}`,
        fullName: `${role} (Demo Instant)`,
        emailOrUsername: username,
        role: role as any,
        bench: 'Dhaddacha Waliigalaa',
      },
      sessionStartedAt: new Date().toISOString()
    });
    alert(`Milkaa'inaan Akka "${role}" seenteetta! Username: ${username}`);
    if (onNavigateToCourtWork) onNavigateToCourtWork();
  };

  const courtTiers = [
    {
      level: '1ffaa',
      nameOm: '1. Mana Murtii Aanaa (District / First Instance Court)',
      nameAm: '1. የመጀመሪያ ደረጃ ፍርድ ቤት (District Court)',
      desc: 'Galmeen haaraan jalqaba irratti kan banamu, kaffaltiin taaksii fi dambii lakk. 08 kan qulqullaa\'u fi ragaan dhugaa jalqabaa kan qoratamu.',
      jurisdiction: 'Aangoo dhimma jalqabaatti ilaaluu (Initial Trial Jurisdiction)'
    },
    {
      level: '2ffaa',
      nameOm: '2. Mana Murtii Olaanaa Godinaa / Magaalaa (High Court)',
      nameAm: '2. ከፍተኛ ፍርድ ቤት (High Court)',
      desc: 'Murtiiwwan mana murtii aanaa irraa ol\'iyyaannoon dhiyaatan kan ilaalu fi dhimmoota gurguddoo daldala, lafaafi yakkaa kan qoratu.',
      jurisdiction: 'Aangoo Ol-iyyataa fi Dhimma Gurguddoo'
    },
    {
      level: '3ffaa',
      nameOm: '3. Mana Murtii Waliigalaa Oromiyaa (Oromia Supreme Court)',
      nameAm: '3. የኦሮሚያ ጠቅላይ ፍርድ ቤት (Oromia Supreme Court)',
      desc: 'Manneen murtii ol\'aanaa irraa murtii kennaman irratti ol\'iyyaannoo fudhachuun qoratu, qajeeltoota seeraa diriirsuu fi dhimmoota olaanoo hordofu.',
      jurisdiction: 'Aangoo Ol-iyyataa Waliigalaa Naannichaa'
    },
    {
      level: '4ffaa',
      nameOm: '4. Dhaddacha Ijibbaataa Mana Murtii Waliigalaa (Cassation Bench)',
      nameAm: '4. የጠቅላይ ፍርድ ቤት ሰበር ችሎት (Cassation Bench)',
      desc: 'Dogoggora bu\'uura seeraa (Fundamental errors of law) qorachuun murtii dhumaa kan kennu fi manneen murtii hundaaf dirqamaan hojiirra oolu.',
      jurisdiction: 'Aangoo Ijibbaataa Seeraa (Binding Precedent Authority)'
    }
  ];

  const workflowRoles = [
    {
      stage: '1. Ofisara Seeraa (Intake Desk / Registrar)',
      roleKey: 'registrar',
      titleOm: 'Ofisara Seeraa - Galmee Banuu & Kaffaltii Mirkaneessuu',
      username: 'hawwii.clerk@court.oromia.et',
      passcode: 'CLERK-2026',
      email: 'hawwii.clerk@court.oromia.et',
      desc: 'Galmee haaraa banuu, sanadoota dhiyaatan qulqulleessuu, Dambii Lakk. 08 irratti hundaa\'uun kaffaltii taaksii mirkaneessuu, fi kallattiidhaan gara Qindeessaa Dhaddachaatti dabarsuu.'
    },
    {
      stage: '2. Qindeessaa Dhaddachaa (Court Coordinator / KTAS)',
      roleKey: 'assistant_judge',
      titleOm: 'Qindeessaa Galmee - Ramaddii Bench & Collaborative Judge Assignment',
      username: 'coordination.head@court.oromia.et',
      passcode: 'COORD-2026',
      email: 'coordination.head@court.oromia.et',
      desc: 'Galmee ofiisara seeraarraa dhufe fudhachuun dursa-duubaa fi gosa dhimmaa ilaaluudhaan abbaa seeraa tokko ykn abbootii seeraa hedduu (Collaborative Bench) ramaduu.'
    },
    {
      stage: '3. Abbaa Seeraa (Assigned Judge / Bench Hearing)',
      roleKey: 'judge',
      titleOm: 'Abbaa Seeraa - Qorannoo Seeraa, Beellama & Murtii Kennaa',
      username: 'caalaa.judge@court.oromia.et',
      passcode: 'JUDGE-2026',
      email: 'caalaa.judge@court.oromia.et',
      desc: 'Galmee ramadameef banee sakatta\'uu, kora dhaddachaa gaggeessuu, ragaalee dhagahuu, seera hiikuun murtii qopheessuu fi mallatteessuu.'
    },
    {
      stage: '4. Abbaa Dhimma / Oliyyannoo (Appellant / Pro-Se Litigant)',
      roleKey: 'legal_expert',
      titleOm: 'Oliyyannoo - Iyyata Mormii fi Ol-iyyata Dhiyeeffata',
      username: 'appellant.client@oromia.et',
      passcode: 'APPEAL-2026',
      email: 'appellant.client@oromia.et',
      desc: 'Murtii kenneetti yoo hin quuphane, ragaa fi xalayaa ol\'iyyaannoo dhiyeessuun akkaataa seeraatiin hanga dhaddacha ijibbaataatti hordofuu.'
    }
  ];

  return (
    <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Scale className="w-48 h-48 text-amber-400" />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>SEERAAI - Oromia Judicial System Hub (Sadarkaa 4n & Credential Hub)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('credentials')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'credentials' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Username & Passcode</span>
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'workflow' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Workflow (Adeemsa)</span>
            </button>
            <button
              onClick={() => setActiveTab('tiers')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tiers' 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Manneen Murtii (4 Tiers)</span>
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-serif-legal font-bold text-white leading-tight">
            {activeTab === 'credentials'
              ? '🔑 Sample Credentials & Login Portal (Hojjettoota Mana Murtii)'
              : activeTab === 'workflow'
              ? '⚙️ Adeemsa Hojii Manneen Murtii (Workflow & Chain of Custody)'
              : '🏛️ Sadarkaalee Manneen Murtii Naannoo Oromiyaa (4 Tiers)'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            {activeTab === 'credentials'
              ? 'Ofisara Seeraa, Qindeessaa Dhaddachaa, Abbaa Seeraa fi Abbaa Dhimmaaf (Oliyyannoo) koodii seeninsaa fi imeelii qophaa\'an fayyadamuun kallattiin dhaddachatti seenaa.'
              : activeTab === 'workflow'
              ? 'Galmeen ofisara seeraarraa ka\'ee hanga qindeessaatti, achirraas gara abbaa seeraatti akkamitti akka dabarfamu fi notification qindeessitootaaf akka kennamu agarsiisa.'
              : 'Mana Murtii Aanaa, Mana Murtii Olaanaa, Mana Murtii Waliigalaa Oromiyaa fi Dhaddacha Ijibbaataa hunda hammateera.'}
          </p>
        </div>

        {/* TAB 1: CREDENTIALS PORTAL */}
        {activeTab === 'credentials' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {workflowRoles.map((item, idx) => {
              const cardKey = `cred_${idx}`;
              const isCopied = copiedKey === cardKey;

              return (
                <div 
                  key={item.roleKey}
                  className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 space-y-3 transition-all shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30">
                        {item.stage}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{item.roleKey}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {item.titleOm}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Username / Email:</span>
                      <span className="text-amber-300 font-bold select-all">{item.username}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Passcode / Secret:</span>
                      <span className="text-emerald-400 font-bold select-all bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">{item.passcode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => copyToClipboard(`Username: ${item.username}\nPasscode: ${item.passcode}`, cardKey)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{isCopied ? 'Galmeeffameera!' : 'Copy Credentials'}</span>
                    </button>

                    <button
                      onClick={() => instantLogin(item.username, item.passcode, item.roleKey, 'Mana Murtii Waliigalaa Oromiyaa')}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <span>⚡</span>
                      <span>Instant Seenuu</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: WORKFLOW & CHAIN OF CUSTODY */}
        {activeTab === 'workflow' && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm border border-amber-500/30">1</div>
                <h4 className="text-xs font-bold text-white">Intake Desk (Ofisara Seeraa)</h4>
                <p className="text-[11px] text-slate-300">Galmeen haaraan banama, kaffaltiin taaksii Dambii Lakk. 08 mirkanaa'ee gara qindeessaatti dabarsama.</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-sm border border-cyan-500/30">2</div>
                <h4 className="text-xs font-bold text-white">Qindeessaa Galmee (KTAS)</h4>
                <p className="text-[11px] text-slate-300">Galmee dhufe qorachuun abbaa seeraa tokko ykn abbootii seeraa hedduu (Collaborative Bench) ramada.</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm border border-purple-500/30">3</div>
                <h4 className="text-xs font-bold text-white">Abbaa Seeraa (Assigned Judge)</h4>
                <p className="text-[11px] text-slate-300">Galmee baneessee beellama qabata, kora dhaddachaa gaggeessee murtii qopheessee mallatteessa.</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">4</div>
                <h4 className="text-xs font-bold text-white">Oliyyannoo & Ijibbaata</h4>
                <p className="text-[11px] text-slate-300">Murtii kenneetti mormii yoo qabaate abbaan dhimmaa ol'iyyaannoo mana murtii ol'aanaatti ykn ijibbaataatti dhiheessa.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-between">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-amber-300">To'annoo fi Gahumsa Adeemsichaa (System Control & Transparency)</h5>
                <p className="text-[11px] text-slate-300">Galmeen tokko yeroo qaama tokkoo gara qaama biraatti dabarfamu sirni SeeraAI sadarkaa irra jiru hubachiisa (Notification) qindeessitootaa fi abbootii seeraaf ni kenna.</p>
              </div>
              <button
                onClick={onNavigateToCourtWork}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Gara Dhaddachaa (CourtWork)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: COURT TIERS (4 TIERS) */}
        {activeTab === 'tiers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {courtTiers.map((tier) => (
              <div key={tier.level} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/30">
                    Sadarkaa {tier.level}
                  </span>
                  <span className="text-[11px] text-amber-400 font-medium">{tier.jurisdiction}</span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  {tier.nameOm}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {tier.desc}
                </p>
                <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  {tier.nameAm}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
