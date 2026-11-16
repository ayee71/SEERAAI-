import React, { useState, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { generateSHA256 } from '../utils/crypto';
import { Gavel, Scale, ShieldCheck } from 'lucide-react';

interface PrintViewProps {
  title: string;
  content: string;
  institutionName?: string;
  refNumber?: string;
  currentLang: Language;
  onClose: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({
  title,
  content,
  institutionName = 'Mana Murtii Waliigalaa Oromiyaa / የኦሮሚያ ጠቅላይ ፍርድ ቤት / Oromia Supreme Court',
  refNumber = `ETH-LAW/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
  currentLang,
  onClose
}) => {
  const [docHash, setDocHash] = useState<string>('');
  const [timestamp] = useState<string>(new Date().toLocaleString());

  useEffect(() => {
    const calculateHash = async () => {
      const hash = await generateSHA256(content + title + timestamp);
      setDocHash(hash);
    };
    calculateHash();
  }, [content, title, timestamp]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto print:static print:bg-white print:p-0">
      {/* UI Controls (Hidden on Print) */}
      <div className="sticky top-0 bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 print:hidden shadow-xl">
        <div className="flex items-center gap-3">
          <Scale className="w-6 h-6 text-amber-500" />
          <h2 className="text-lg font-bold">Document Print Preview & Verification</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <span>Print Document</span>
          </button>
        </div>
      </div>

      {/* Print Content Area */}
      <div className="max-w-[210mm] mx-auto bg-white p-[20mm] print:p-0 print:m-0 shadow-2xl my-8 print:shadow-none min-h-[297mm] font-serif flex flex-col">
        {/* Court Letterhead */}
        <div className="border-b-4 border-slate-900 pb-4 mb-8 text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-slate-900 flex items-center justify-center">
              <Gavel className="w-12 h-12 text-slate-900" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            MOOTUMMAA NAANNOO OROMIYAA<br />
            MANA MURTII WALIIGALAA<br />
            <span className="text-xl font-bold">የኦሮሚያ ጠቅላይ ፍርድ ቤት</span><br />
            <span className="text-lg font-bold">OROMIA SUPREME COURT</span>
          </h1>
          <div className="text-[10px] text-slate-600 flex justify-center gap-4 border-t border-slate-200 pt-2 mt-2">
            <span>Finfinnee, Ethiopia</span>
            <span>Tel: +251 11 123 4567</span>
            <span>Email: info@court.oromia.et</span>
          </div>
        </div>

        {/* Metadata Table */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-8 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Ref No:</span>
              <span className="font-mono">{refNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Institution:</span>
              <span>{institutionName}</span>
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="font-bold text-slate-700">Date:</span>
              <span>{new Date().toLocaleDateString('en-GB')}</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="font-bold text-slate-700">Ethiopian Date:</span>
              <span>Fulbaana 23, 2017 B.A.</span>
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-black text-slate-900 underline decoration-2 underline-offset-8 uppercase tracking-widest">
            {title}
          </h2>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 text-[11pt] leading-[1.8] text-slate-900 text-justify whitespace-pre-wrap font-serif">
          {content}
        </div>

        {/* Signature Section */}
        <div className="mt-16 grid grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="border-t border-slate-400 pt-2">
              <p className="text-xs font-bold">Judicial Officer / Registrar</p>
              <div className="h-16"></div>
              <p className="text-[10px] text-slate-500">Seal & Signature</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="border-t border-slate-400 pt-2">
              <p className="text-xs font-bold">Clerk / Record Keeper</p>
              <div className="h-16"></div>
              <p className="text-[10px] text-slate-500">Seal & Signature</p>
            </div>
          </div>
        </div>

        {/* Verification Footer */}
        <div className="mt-12 pt-4 border-t-2 border-slate-200 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[9px] text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Authoritative System Verification Token</span>
            </div>
            <div className="font-mono">Audit Timestamp: {timestamp}</div>
          </div>
          <div className="p-2 bg-slate-50 border border-slate-100 rounded flex flex-col gap-1">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">SHA-256 Auth Hash</span>
            <span className="text-[10px] font-mono text-slate-600 break-all">{docHash || 'Calculating authoritative signature...'}</span>
          </div>
          <div className="flex justify-between items-center text-[9px] text-slate-400 italic">
            <span>© {new Date().getFullYear()} SeeraAI - Trilingual Judicial Intelligence Platform</span>
            <div className="print-page-number"></div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .print-page-number::after {
            content: "Page " counter(page);
          }
          @page {
            size: A4;
            margin: 20mm;
          }
          header, footer, nav, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
