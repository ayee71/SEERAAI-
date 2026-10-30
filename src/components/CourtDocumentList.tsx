import React from 'react';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  Download, 
  FileText, 
  BarChart3, 
  History, 
  QrCode,
  Archive,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { DigitalCourtSeal } from './DigitalCourtSeal';

export interface CourtDocumentRow {
  id: string;
  title: string;
  caseNumber: string;
  filingDate: string;
  type: 'Claim' | 'Evidence' | 'Decision' | 'Witness' | 'Motion';
  author: string;
  isVerified: boolean;
  paymentStatus?: 'pending' | 'verified' | 'rejected';
  sinqeeReceiptNo?: string;
  priority?: string;
  status?: string;
  assignedJudge?: string;
  hearingDate?: string;
  closedDate?: string;
  stage?: string;
}

interface CourtDocumentListProps {
  currentLang: Language;
  documents: CourtDocumentRow[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onAction: (doc: CourtDocumentRow, action: string) => void;
  filters: {
    status: string;
    sortBy: string;
    search: string;
    judge: string;
    payment: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

export const CourtDocumentList: React.FC<CourtDocumentListProps> = ({
  currentLang,
  documents,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onAction,
  filters,
  onFilterChange
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      {/* Search & Filters */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              placeholder="Galmee barbaadi..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:border-amber-500 outline-none"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
          >
            <option value="all">Hunda</option>
            <option value="Pending Assignment">Eeggataa</option>
            <option value="Hearing">Dhaddacha</option>
            <option value="Closed">Cufame</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSelectAll}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-all"
          >
            {selectedIds.length === documents.length && documents.length > 0 ? 'Dhiisi' : 'Hunda Filadhu'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-bold bg-slate-950/30">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">Galmee & Lakkoofsa</th>
              <th className="px-4 py-3">Gosa & Guyyaa</th>
              <th className="px-4 py-3">Abbaa Seeraa / Haala</th>
              <th className="px-4 py-3">Kaffaltii</th>
              <th className="px-4 py-3 text-right">Tarkaanfii</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {documents.map((doc) => (
              <tr 
                key={doc.id} 
                className={`hover:bg-slate-800/40 transition-colors ${selectedIds.includes(doc.id) ? 'bg-amber-500/5' : ''}`}
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(doc.id)}
                    onChange={() => onToggleSelect(doc.id)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="min-w-[200px]">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="truncate max-w-[200px]">{doc.title}</span>
                      {doc.isVerified && <DigitalCourtSeal officerName={doc.author || 'Court Registrar'} timestamp={doc.filingDate} />}
                    </div>
                    <div className="text-[10px] text-amber-400 font-mono mt-1">{doc.caseNumber}</div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-[10px] text-slate-300 font-bold">{doc.type}</div>
                  <div className="text-[10px] text-slate-500">{doc.filingDate}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-[10px] text-slate-300 font-medium mb-1.5">
                    {doc.assignedJudge || 'Pending'}
                  </div>
                  <WorkflowStatusBadge caseStatus={doc.status || 'Pending Review'} />
                </td>
                <td className="px-4 py-4">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    doc.paymentStatus === 'verified' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {doc.paymentStatus?.toUpperCase() || 'PENDING'}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onAction(doc, 'view')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                      title="Gabaasa Reebuu"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onAction(doc, 'download')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500 italic text-xs">
                  Galmeen argame hin jiru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
