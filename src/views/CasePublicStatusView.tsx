import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Gavel, 
  User, 
  ArrowLeft, 
  RefreshCw, 
  FileText,
  AlertCircle,
  Building
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { getCaseByIdFromFirestore, FirestoreCaseDocket } from '../services/courtCaseService';
import { getCaseStatusColorConfig, calculateCaseStatus } from '../utils/caseStatus';
import { RestrictedAccessView } from '../components/RestrictedAccessView';

interface CasePublicStatusViewProps {
  currentLang: Language;
  caseId: string;
  onBack?: () => void;
}

export const CasePublicStatusView: React.FC<CasePublicStatusViewProps> = ({
  currentLang,
  caseId,
  onBack
}) => {
  const t = translations[currentLang];
  const [caseData, setCaseData] = useState<FirestoreCaseDocket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCase = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCaseByIdFromFirestore(caseId);
        if (data) {
          setCaseData(data);
        } else {
          setError(currentLang === 'om' ? 'Galmeen kun hin argamne.' : 'Case not found.');
        }
      } catch (err) {
        setError(currentLang === 'om' ? 'Dogoggorri uumameera.' : 'Failed to load case status.');
      } finally {
        setLoading(false);
      }
    };

    if (caseId) {
      fetchCase();
    }
  }, [caseId, currentLang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-mono text-xs animate-pulse">Fetching Secure Case Status...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">{error || 'Access Restricted'}</h2>
          <p className="text-sm text-slate-400">The case record you are looking for is either private or does not exist.</p>
          <button 
            onClick={() => window.location.assign('/?tab=home')}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getCaseStatusColorConfig(calculateCaseStatus(caseData));

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Client Header */}
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <button 
          onClick={() => onBack ? onBack() : window.location.assign('/?tab=home')}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest">Secure Client Portal</span>
        </div>
      </div>

      {/* Case Overview Card */}
      <div className="max-w-3xl mx-auto bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="bg-slate-800/50 p-6 sm:p-8 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase font-mono">
                Official Case Docket
              </span>
              <span className="text-xs text-slate-500 font-mono">#{caseData.caseNumber}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-serif-legal">
              {caseData.claimSubject.split('(')[0].trim()}
            </h1>
            <p className="text-sm text-slate-400 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-amber-500/60" />
              <span>Mana Murtii Sadarkaa Sadeenuu</span>
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
             <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 ${statusConfig.pillClass}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${statusConfig.dotClass}`} />
                <span className="text-sm font-bold">{statusConfig.label}</span>
             </div>
             <span className="text-[10px] text-slate-500 font-mono">Last updated: {new Date(caseData.updatedAt || '').toLocaleDateString()}</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Party Details */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-2">
               <User className="w-4 h-4" />
               <span>Parties Involved</span>
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Claimant (Himataa)</div>
                <div className="text-sm font-bold text-white">{caseData.claimantName}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Respondent (Himatamaa)</div>
                <div className="text-sm font-bold text-white">{caseData.respondentName}</div>
              </div>
            </div>
          </div>

          {/* Schedule & Judge */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-2">
               <Calendar className="w-4 h-4" />
               <span>Court Schedule</span>
            </h3>
            <div className="p-6 rounded-3xl bg-amber-500/5 border-2 border-amber-500/20 space-y-6 text-center">
              <div className="space-y-1">
                <div className="text-[10px] text-amber-500/70 uppercase font-bold font-mono">Upcoming Hearing Date</div>
                <div className="text-3xl font-black text-amber-400 font-mono tracking-tighter">
                  {caseData.nextHearingDate || 'TBD'}
                </div>
                <div className="text-xs text-amber-200/50 flex items-center justify-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{caseData.hearingTime || '09:00 AM'}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-amber-500/10 flex items-center justify-between text-left">
                <div className="space-y-0.5">
                  <div className="text-[9px] text-slate-500 uppercase font-bold font-mono">Assigned Judge</div>
                  <div className="text-xs font-bold text-slate-200">{caseData.assignedJudge}</div>
                </div>
                <Gavel className="w-8 h-8 text-amber-500/20" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Notice */}
        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
             <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Requirement Notice</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please ensure you are present at the court bench 30 minutes before the scheduled time with all original evidence documents.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="max-w-3xl mx-auto text-center space-y-4 pt-12 opacity-50">
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-500 font-bold">S</div>
          <span className="text-sm font-serif-legal text-slate-300">SeeraAI Legal Intelligence</span>
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          Powered by Ethiopian Justice Digitization Initiative
        </p>
      </div>
    </div>
  );
};
