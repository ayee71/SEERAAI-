import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  EyeOff, 
  Eye, 
  FileText, 
  CheckCircle2, 
  Download, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  X, 
  Copy, 
  Key, 
  Scale, 
  UserX, 
  PhoneOff, 
  CreditCard, 
  BookOpen 
} from 'lucide-react';
import { 
  ConfidentialityLevel, 
  ConfidentialitySettings, 
  getConfidentialitySettings, 
  saveConfidentialitySettings, 
  redactSensitiveLegalData, 
  getConfidentialAccessLogs, 
  clearConfidentialAccessLogs, 
  exportConfidentialAuditTrailToCsv, 
  getConfidentialityLevelInfo, 
  ConfidentialAuditEntry,
  logConfidentialAccess
} from '../services/confidentialityService';
import { Language } from '../i18n/translations';
import { useAuth } from '../context/AuthContext';

interface ConfidentialityShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  activeCaseNumber?: string;
  activeDocTitle?: string;
  onApplyRedactionToActiveView?: (redactedText: string) => void;
}

export const ConfidentialityShieldModal: React.FC<ConfidentialityShieldModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  activeCaseNumber,
  activeDocTitle,
}) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'shield' | 'classification' | 'audit' | 'statute'>('shield');
  const [settings, setSettings] = useState<ConfidentialitySettings>(getConfidentialitySettings());
  const [auditLogs, setAuditLogs] = useState<ConfidentialAuditEntry[]>(getConfidentialAccessLogs());
  const [customTermInput, setCustomTermInput] = useState('');
  const [searchAuditTerm, setSearchAuditTerm] = useState('');
  
  // Interactive testing playground
  const [testRawText, setTestRawText] = useState(
    "Dhimma Galmee MM/AD/2026/0491: Himataan Obbo Tolasaa Lammii (Bilbila: 0911223344, Waraqaa Eenyummaa ID: KB-98214) fi Himatamaan Obbo Guutuu Badhaadhaa herrega Baankii Sinqee 100029384756 irratti wal dhabaniiru. Daa'ima Daawwit Tolasaa umuriin isaa waggaa 7 ta'e irratti falmiin maatii fi custody gaggeeffamaa jira. Teessoon isaanii Ganda 04 Lakk. Manaa 112 dha."
  );
  const [testResult, setTestResult] = useState(redactSensitiveLegalData(testRawText, settings));
  const [copiedNotification, setCopiedNotification] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getConfidentialitySettings();
      setSettings(current);
      setAuditLogs(getConfidentialAccessLogs());
      setTestResult(redactSensitiveLegalData(testRawText, current));
    }
  }, [isOpen, testRawText]);

  if (!isOpen) return null;

  const handleToggleSetting = (key: keyof ConfidentialitySettings) => {
    const updatedVal = !settings[key];
    const newSettings = saveConfidentialitySettings({ [key]: updatedVal });
    setSettings(newSettings);
    setTestResult(redactSensitiveLegalData(testRawText, newSettings));

    logConfidentialAccess({
      userEmail: user?.email || 'officer@seera.court.et',
      userName: profile?.visitorName || 'Legal Officer',
      userRole: profile?.role || 'legal_officer',
      action: 'CHANGE_CLASSIFICATION',
      caseNumber: activeCaseNumber,
      documentTitle: activeDocTitle,
      classificationLevel: newSettings.defaultLevel,
      details: `Confidentiality setting ${String(key)} set to ${updatedVal}`
    });
  };

  const handleSelectLevel = (level: ConfidentialityLevel) => {
    const newSettings = saveConfidentialitySettings({ defaultLevel: level });
    setSettings(newSettings);

    logConfidentialAccess({
      userEmail: user?.email || 'officer@seera.court.et',
      userName: profile?.visitorName || 'Legal Officer',
      userRole: profile?.role || 'legal_officer',
      action: 'CHANGE_CLASSIFICATION',
      caseNumber: activeCaseNumber,
      documentTitle: activeDocTitle,
      classificationLevel: level,
      details: `Default confidentiality level set to ${level}`
    });
  };

  const handleAddCustomTerm = () => {
    if (!customTermInput.trim()) return;
    const clean = customTermInput.trim();
    if (settings.customRedactTerms.includes(clean)) return;

    const updatedTerms = [...settings.customRedactTerms, clean];
    const newSettings = saveConfidentialitySettings({ customRedactTerms: updatedTerms });
    setSettings(newSettings);
    setCustomTermInput('');
    setTestResult(redactSensitiveLegalData(testRawText, newSettings));
  };

  const handleRemoveCustomTerm = (term: string) => {
    const updatedTerms = settings.customRedactTerms.filter(t => t !== term);
    const newSettings = saveConfidentialitySettings({ customRedactTerms: updatedTerms });
    setSettings(newSettings);
    setTestResult(redactSensitiveLegalData(testRawText, newSettings));
  };

  const handleExportAuditCsv = () => {
    const csvContent = exportConfidentialAuditTrailToCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SEERA_Confidentiality_Audit_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    logConfidentialAccess({
      userEmail: user?.email || 'officer@seera.court.et',
      userName: profile?.visitorName || 'Legal Officer',
      userRole: profile?.role || 'legal_officer',
      action: 'AUDIT_LOG_EXPORT',
      caseNumber: activeCaseNumber,
      documentTitle: activeDocTitle,
      classificationLevel: settings.defaultLevel,
      details: 'Audit trail exported for compliance verification'
    });
  };

  const handleClearLogs = () => {
    if (window.confirm(
      currentLang === 'am'
        ? 'የሚስጥራዊነት መዳረሻ ኦዲት መዝገቦችን በሙሉ ማጥፋት ይፈልጋሉ?'
        : currentLang === 'en'
        ? 'Clear all confidentiality access audit records?'
        : "Galmee to'annoo seensa iccitii hunda haquu barbaaddaa?"
    )) {
      clearConfidentialAccessLogs();
      setAuditLogs([]);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (!searchAuditTerm.trim()) return true;
    const term = searchAuditTerm.toLowerCase();
    return (
      log.userEmail.toLowerCase().includes(term) ||
      log.userName.toLowerCase().includes(term) ||
      (log.caseNumber && log.caseNumber.toLowerCase().includes(term)) ||
      log.action.toLowerCase().includes(term) ||
      log.classificationLevel.toLowerCase().includes(term)
    );
  });

  const levels: ConfidentialityLevel[] = [
    'PUBLIC',
    'RESTRICTED',
    'CONFIDENTIAL_IN_CAMERA',
    'MINOR_PROTECTED',
    'ATTORNEY_CLIENT_PRIVILEGE',
    'JUDICIAL_DELIBERATION',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 text-lg shadow-inner">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-amber-100 flex items-center gap-1.5">
                  {currentLang === 'am' ? 'የሕግ ሚስጥራዊነት እና የውሂብ ጥበቃ' : currentLang === 'en' ? 'Legal Confidentiality & Privacy Shield' : 'Sirna Eegumsa Iccitii Seeraa'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${settings.isShieldActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse' : 'bg-red-500/20 text-red-300 border-red-500/50'}`}>
                  {settings.isShieldActive 
                    ? (currentLang === 'am' ? '✓ ጥበቃው ነቅቷል' : currentLang === 'en' ? '✓ SHIELD ACTIVE' : '✓ EEGUMSI HOJIRRA JIRA') 
                    : (currentLang === 'am' ? '✕ ጠፍቷል' : currentLang === 'en' ? '✕ SHIELD INACTIVE' : '✕ EEGUMSI DHAACHATE')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {currentLang === 'am'
                  ? 'በኢፌዲሪ ሕገ መንግሥት አንቀጽ 26 እና በወንጀል ሥነ ሥርዓት ሕግ አንቀጽ 176 መሠረት የተዘጋጀ'
                  : currentLang === 'en'
                  ? 'Pursuant to FDRE Constitution Art. 26 & Criminal Procedure Code Art. 176'
                  : "Bu'uura Heera RDFI Kwt. 26 fi Seera Adeemsa Falmii Yakkaa Kwt. 176 tiin"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-950/70 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('shield')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${activeTab === 'shield' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{currentLang === 'am' ? 'ራስ-ሰር ሳንሱር & መከላከያ' : currentLang === 'en' ? 'Auto-Redact & Masking' : "Dhoksaa & Eegumsa Iccitii"}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('classification')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${activeTab === 'classification' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{currentLang === 'am' ? 'የሚስጥራዊነት ደረጃ' : currentLang === 'en' ? 'Case Classification' : 'Sadarkaa Iccitii Dhimmaa'}</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${activeTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{currentLang === 'am' ? 'የመዳረሻ ኦዲት መዝገብ' : currentLang === 'en' ? 'Access Audit Trail' : "Galmee To'annoo Seensaa"}</span>
          </button>

          <button
            onClick={() => setActiveTab('statute')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${activeTab === 'statute' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{currentLang === 'am' ? 'የሕግ ድንጋጌዎች' : currentLang === 'en' ? 'Statutory Grounds' : 'Heera & Keewwata Seeraa'}</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: SHIELD & AUTO-REDACT CONTROLS */}
          {activeTab === 'shield' && (
            <div className="space-y-6">
              {/* Master Privacy Shield Toggle Card */}
              <div className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${settings.isShieldActive ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/50' : 'bg-slate-950 border-red-500/40'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${settings.isShieldActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                    {settings.isShieldActive ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {currentLang === 'am' ? 'አጠቃላይ የሕግ መረጃ ጋሻ (Global Privacy Shield)' : currentLang === 'en' ? 'Master Legal Privacy Shield' : "Eegumsa Iccitii Waliigalaa (Privacy Shield)"}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {currentLang === 'am'
                        ? 'በስክሪኑ፣ በፒዲኤፍ ኤክስፖርት እና በማጋሪያዎች ላይ ሚስጥራዊ የሰው እና የፋይናንስ መረጃዎችን በራስ-ሰር ይሸፍናል።'
                        : currentLang === 'en'
                        ? 'Instantly redacts PII, bank accounts, minors, and sensitive identifiers across screens and exports.'
                        : "Odeeffannoo dhuunfaa, bilbila, herrega baankii fi maqaa daa'immanii skiriinii fi sanadoota irratti ofumaan dhoksa."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSetting('isShieldActive')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${settings.isShieldActive ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'bg-red-500 hover:bg-red-400 text-white'}`}
                >
                  <Shield className="w-4 h-4" />
                  <span>{settings.isShieldActive ? (currentLang === 'om' ? 'Cufi (Deactivate)' : 'አጥፋ') : (currentLang === 'om' ? 'Bani (Activate Shield)' : 'አብራ')}</span>
                </button>
              </div>

              {/* Redaction Rules Toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{currentLang === 'am' ? 'የሚሸፈኑ የውሂብ ዓይነቶች' : currentLang === 'en' ? 'Active Redaction Categories' : "Gosoota Ragaa Dhokfamanii"}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Phone */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.redactPhoneNumbers}
                      onChange={() => handleToggleSetting('redactPhoneNumbers')}
                      className="mt-1 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <PhoneOff className="w-3.5 h-3.5 text-amber-400" />
                        <span>{currentLang === 'am' ? 'የስልክ ቁጥሮች (+2519..., 09...)' : currentLang === 'en' ? 'Phone Numbers (+2519..., 09...)' : 'Lakkoofsa Bilbilaa (+2519..., 09...)'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {currentLang === 'om' ? "Bilbiloota Itoophiyaa hunda gara [BILBILA DHOKFAME] tti jijjiira." : "Ethiopian mobile & landline numbers redacted."}
                      </p>
                    </div>
                  </label>

                  {/* Bank Accounts */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.redactBankAccounts}
                      onChange={() => handleToggleSetting('redactBankAccounts')}
                      className="mt-1 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        <span>{currentLang === 'am' ? 'የባንክ እና ቴሌብር ቁጥሮች (CBE, Sinqee, Awash...)' : currentLang === 'en' ? 'Bank Accounts (CBE, Sinqee, Telebirr)' : 'Herrega Baankii & Telebirr'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {currentLang === 'om' ? "Lakk. herrega baankii fi Telebirr dhoksa." : "Financial identifiers masked for confidentiality."}
                      </p>
                    </div>
                  </label>

                  {/* National ID / Kebele */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.redactNationalIds}
                      onChange={() => handleToggleSetting('redactNationalIds')}
                      className="mt-1 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        <span>{currentLang === 'am' ? 'የቀበሌ / የፋይዳ ብሔራዊ መታወቂያ' : currentLang === 'en' ? 'National / Kebele / Fayda IDs' : 'Waraqaa Eenyummaa Gandaa / Fayda'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {currentLang === 'om' ? "Labsii 1234/2021 bu'uura godhachuun eenyummaa dhuunfaa eega." : "Identity numbers protected under Proclamation 1234/2021."}
                      </p>
                    </div>
                  </label>

                  {/* Minors / Child Protection */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.redactMinorNames}
                      onChange={() => handleToggleSetting('redactMinorNames')}
                      className="mt-1 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <div className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                        <UserX className="w-3.5 h-3.5 text-purple-400" />
                        <span>{currentLang === 'am' ? 'የህፃናት መረጃ ጥበቃ (አንቀጽ 176)' : currentLang === 'en' ? 'Minor Litigants Protection (Art. 176)' : "Eegumsa Maqaa Daa'immanii (Kwt. 176)"}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {currentLang === 'om' ? "Dhimma maatii fi yakka irratti maqaa daa'imaa gara [DAA'IMA X] tti jijjiira." : "Juveniles and minors pseudonymized in line with CPC Art. 176."}
                      </p>
                    </div>
                  </label>

                  {/* Litigant Addresses */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={settings.redactLitigantPhysicalAddresses}
                      onChange={() => handleToggleSetting('redactLitigantPhysicalAddresses')}
                      className="mt-1 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {currentLang === 'am' ? 'የተከራካሪዎች ትክክለኛ የመኖሪያ አድራሻ (ቀበሌ/የቤት ቁጥር)' : currentLang === 'en' ? 'Litigant Residential Addresses & House Numbers' : 'Teessoo Qabatamaa Falmitootaa (Ganda / Lakk. Manaa)'}
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {currentLang === 'om' ? "Nageenya falmitootaa eeguuf teessoo dhuunfaa qabatamaa dhoksa." : "Protects litigants and witnesses against unwanted harassment."}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Custom Redaction Keywords */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200">
                    {currentLang === 'am' ? 'ብጁ የሚሸፈኑ ቃላት / ስሞች' : currentLang === 'en' ? 'Custom Redaction Terms (Witness/Trade Secrets)' : 'Jechoonni / Maqoota Dabalataa Dhokfamuu Qaban'}
                  </h4>
                  <span className="text-[11px] text-slate-300">{settings.customRedactTerms.length} terms</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTermInput}
                    onChange={(e) => setCustomTermInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTerm()}
                    placeholder={currentLang === 'om' ? "Fakkeenya: Maqaa Ragaa, Iccitii Daldalaa..." : "e.g. Witness Name, Trade Secret..."}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:border-amber-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTerm}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{currentLang === 'om' ? 'Dabali' : 'አክል'}</span>
                  </button>
                </div>

                {settings.customRedactTerms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {settings.customRedactTerms.map(term => (
                      <span
                        key={term}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono"
                      >
                        {term}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomTerm(term)}
                          className="text-slate-400 hover:text-red-400 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Live Redaction Sandbox */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">⚡</span>
                    <h4 className="text-xs font-bold text-slate-200">
                      {currentLang === 'am' ? 'የቀጥታ ሳንሱር ሙከራ ሰሌዳ' : currentLang === 'en' ? 'Live Confidentiality Preview Sandbox' : 'Agarsiisa Qabatamaa Haxaa\'insa Iccitii (Live Sandbox)'}
                    </h4>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    {testResult.redactionCount} {currentLang === 'om' ? 'dhokfaman' : 'items masked'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      {currentLang === 'om' ? 'Barreeffama Seeraa Duraa (Raw Text)' : 'Original Court Text'}
                    </label>
                    <textarea
                      value={testRawText}
                      onChange={(e) => setTestRawText(e.target.value)}
                      rows={4}
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono focus:border-amber-400 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>{currentLang === 'om' ? 'Bu\'aa Iccitii Eeggame (Protected Output)' : 'Redacted Output'}</span>
                      </label>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(testResult.text);
                          setCopiedNotification(true);
                          setTimeout(() => setCopiedNotification(false), 2000);
                        }}
                        className="text-[10px] text-amber-300 hover:text-amber-200 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedNotification ? '✓ Waraabameera' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="w-full h-[96px] p-2.5 rounded-lg bg-slate-900/90 border border-emerald-500/40 text-xs text-emerald-200/90 font-mono overflow-y-auto leading-relaxed select-text">
                      {testResult.text}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CASE CLASSIFICATION SELECTOR */}
          {activeTab === 'classification' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                <p className="font-semibold mb-1">
                  ⚖️ {currentLang === 'am' ? 'የሕግ ሚስጥራዊነት ደረጃ ምደባ' : currentLang === 'en' ? 'Statutory Confidentiality Classification' : 'Sadarkaa Iccitii Dhimma Seeraa Filadhaa'}
                </p>
                <p className="text-slate-300 text-[11px]">
                  {currentLang === 'om'
                    ? "Dhimmoonni maatii, daa'immanii, nageenya biyyaa fi saalaa bu'uura SAFY Kwt. 176 tiin Dhaddacha Cufaan gaggeeffamuu qabu."
                    : "Cases involving minors, matrimonial disputes, trade secrets, and state security must adhere to statutory non-disclosure."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {levels.map(lvl => {
                  const info = getConfidentialityLevelInfo(lvl, currentLang === 'am' ? 'am' : currentLang === 'en' ? 'en' : 'om');
                  const isSelected = settings.defaultLevel === lvl;

                  return (
                    <div
                      key={lvl}
                      onClick={() => handleSelectLevel(lvl)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${isSelected ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30 shadow-lg' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{info.icon}</span>
                          <span className="text-xs font-bold text-white">{info.title}</span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${info.badgeColor}`}>
                          {info.badge}
                        </span>
                        <div className="text-[10px] text-slate-300">
                          {currentLang === 'om' ? 'Bu\'uura Seeraa: ' : 'Legal Basis: '}
                          <span className="text-amber-300/90 font-mono">{info.legalBasis}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ACCESS AUDIT LOG TABLE */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentLang === 'am' ? 'የሚስጥራዊ ሰነዶች መዳረሻ እና ማውረጃ መዝገብ' : currentLang === 'en' ? 'Confidential Access & Export Audit Log' : "Galmee To'annoo Seensa & Baasii Iccitii"}</span>
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    {currentLang === 'om' ? "Eenyu yoom galmee iccitii akka bane, gara PDFtti akka jijjiire ykn maxxanse ni qabata." : "Tamper-evident log of docket opens, PDF exports, and print actions."}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleExportAuditCsv}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-500/50 text-slate-400 hover:text-red-300 text-xs transition-colors cursor-pointer"
                    title="Clear Log (Admin)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Filter */}
              <input
                type="text"
                value={searchAuditTerm}
                onChange={(e) => setSearchAuditTerm(e.target.value)}
                placeholder={currentLang === 'om' ? "Galmee, email ykn tarkaanfii barbaadi..." : "Filter audit log by case, user, or action..."}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-400 focus:border-amber-400 outline-none"
              />

              {/* Audit Table */}
              <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2">Sa'aatii (Time)</th>
                      <th className="px-3 py-2">Fayyadamaa (Officer)</th>
                      <th className="px-3 py-2">Tarkaanfii (Action)</th>
                      <th className="px-3 py-2">Lakk. Galmee (Case)</th>
                      <th className="px-3 py-2">Sadarkaa (Level)</th>
                      <th className="px-3 py-2">Hash Mirkaneessaa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-300">
                          {currentLang === 'om' ? "Galmeen to'annoo hin jiru." : "No audit entries matching filter."}
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-3 py-2 text-slate-200">
                            <div className="font-semibold text-slate-100">{log.userName}</div>
                            <div className="text-[10px] text-slate-300">{log.userEmail}</div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-300">
                            {log.caseNumber || 'N/A'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] text-slate-400">
                              {log.classificationLevel}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[10px] text-emerald-400 truncate max-w-[120px]" title={log.verificationHash}>
                            {log.verificationHash}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: STATUTORY GROUNDS */}
          {activeTab === 'statute' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span>📜</span>
                  <h4>
                    {currentLang === 'am' ? 'የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ ሕገ መንግሥት' : currentLang === 'en' ? 'FDRE Constitution - Right to Privacy' : 'Heera Mootummaa RDFI'}
                  </h4>
                </div>
                <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div className="font-bold text-amber-200">
                    {currentLang === 'am' ? 'አንቀጽ 26: የግል ሕይወት የመከበር እና የመጠበቅ መብት' : currentLang === 'en' ? 'Article 26: Right to Privacy' : 'Keewwata 26: Mirga Qulqullina Dhuunfaa fi Iccitummaa'}
                  </div>
                  <p>
                    {currentLang === 'am'
                      ? '1. ማንኛውም ሰው የግል ሕይወቱ፣ የቤተሰቡ፣ የመኖሪያ ቤቱ እንዲሁም ደብዳቤዎቹ እና በመገናኛ መሣሪያዎቹ የሚያደርጋቸው ግንኙነቶች ሚስጥራዊነታቸው የመጠበቅ መብት አለው።'
                      : currentLang === 'en'
                      ? '1. Everyone has the right to privacy of their person, home, correspondence and communications.'
                      : "1. Namni kamiyyuu qulqullinni dhuunfaa isaa, maatii isaa, manni jireenyaa isaa, xalayaan isaa fi qunnamtiin meeshaalee qunnamtiitiin godhu iccitummaan isaanii eegamuuf mirga qaba."}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span>⚖️</span>
                  <h4>
                    {currentLang === 'am' ? 'የወንጀል ሥነ ሥርዓት ሕግ' : currentLang === 'en' ? 'Criminal Procedure Code (CPC Art. 176)' : 'Seera Adeemsa Falmii Yakkaa'}
                  </h4>
                </div>
                <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <div className="font-bold text-amber-200">
                    {currentLang === 'am' ? 'አንቀጽ 176: በዝግ ችሎት የሚደረግ ክርክር (In-Camera)' : currentLang === 'en' ? 'Article 176: In-Camera Proceedings' : 'Keewwata 176: Dhaddacha Cufaan Dhaggeeffachuu'}
                  </div>
                  <p>
                    {currentLang === 'am'
                      ? 'የህዝብን ሞራል፣ ፀጥታ ወይም የህፃናትን ደህንነት ለመጠበቅ ፍርድ ቤቱ ችሎቱን በሙሉ ወይም በከፊል በዝግ እንዲታይ ማዘዝ ይችላል። የዚህ አይነት መዛግብት ምስጢራዊነት በጥብቅ ይጠበቃል።'
                      : currentLang === 'en'
                      ? 'The court may order proceedings to be conducted in-camera where public order, morality, or the protection of juveniles requires secrecy.'
                      : "Manni murtii amala uummataa, nageenya mootummaa ykn eegumsa daa'immaniitiif jecha dhaddachi cufaa akka ta'u ajajuu ni danda'a. Galmeen dhaddacha cufaa iccitummaan isaa seeraan eegamaa dha."}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 space-y-3">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <span>👶</span>
                  <h4>
                    {currentLang === 'am' ? 'የተሻሻለው የቤተሰብ ሕግ & አዋጅ ቁጥር 1234/2021' : currentLang === 'en' ? 'Revised Family Code & Personal Data Protection' : "Seera Maatii Fooyya'e & Labsii 1234/2021"}
                  </h4>
                </div>
                <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <p>
                    {currentLang === 'om'
                      ? "Dhimmoota ijoollee guddifachaa, abbummaa mirkaneessuu fi gundaa maatii keessatti maqaan daa'immanii uummataaf saaxilamuu hin qabu. Labsii 1234/2021 bu'uura godhachuun lakk. bilbilaa, eenyummaa fi baankii eeguun dirqama seeraati."
                      : "Adoption, paternity, and juvenile custody records prohibit public dissemination of minor identities, national IDs, and financial information under penalty of law."}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {settings.isShieldActive 
                ? (currentLang === 'om' ? "Eegumsa Iccitii: Qophaa'eera" : "Confidentiality Shield: Engaged") 
                : (currentLang === 'om' ? "Eegumsa Iccitii: Cufameera" : "Confidentiality Shield: Disengaged")}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            {currentLang === 'am' ? 'ተከናውኗል' : currentLang === 'en' ? 'Done' : 'Xumurameera'}
          </button>
        </div>

      </div>
    </div>
  );
};
