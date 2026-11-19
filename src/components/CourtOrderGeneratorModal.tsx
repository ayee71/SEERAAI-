import React, { useState } from 'react';
import { X, FileText, Download, Printer, Shield, CheckCircle2, Gavel, Calendar } from 'lucide-react';
import { Language } from '../i18n/translations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { applyCourtWatermarkToPDF } from '../services/watermarkService';
import { formatEthiopianDate } from '../utils/ethiopianCalendar';

interface CourtOrderGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  activeCaseNumber: string;
  courtLevel: 'firstInstance' | 'highCourt' | 'cassation';
}

export const CourtOrderGeneratorModal: React.FC<CourtOrderGeneratorModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  activeCaseNumber,
  courtLevel
}) => {
  const [plaintiffName, setPlaintiffName] = useState('Abbaa Alangaa Federaalaa (Federal Prosecutor)');
  const [defendantName, setDefendantName] = useState('Gemechu Tadesse');
  const [presidingJudge, setPresidingJudge] = useState('Hon. Judge Tadesse Bekele (Presiding)');
  const [orderType, setOrderType] = useState<'bail_ruling' | 'production_of_evidence' | 'adjournment' | 'injunction' | 'final_judgment'>('bail_ruling');
  const [hearingOutcome, setHearingOutcome] = useState('Gareen lamaan ragaa dhiyeessuuf beellamni qabameera. Iyyataan ragaa namaa isaanii akka dhiyeessan ajajameera.');
  const [statuteCitation, setStatuteCitation] = useState('Seera Adeemsa Falmii Yakkaa Keeyyata 59 & 64 / SDFHH Art. 131');
  const [nextHearingDate, setNextHearingDate] = useState('15/04/2016 E.C.');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerateOrderPDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const todayEth = formatEthiopianDate(new Date(), currentLang === 'am' ? 'am' : currentLang === 'om' ? 'om' : 'en');

      // 1. Header
      doc.setFontSize(14);
      doc.setTextColor(20, 30, 60);
      doc.text('FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA', 105, 18, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(180, 120, 20); // Gold accent
      doc.text('FEDERAL / OROMIA SUPREME COURT JUDICIAL BENCH', 105, 25, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.setDrawColor(180, 120, 20);
      doc.line(14, 29, 196, 29);

      // 2. Case Details Box
      doc.setFontSize(10);
      doc.setTextColor(50);
      doc.text(`Docket Number (Lakk. Galmee): ${activeCaseNumber}`, 14, 38);
      doc.text(`Court Level: ${courtLevel.toUpperCase()}`, 14, 44);
      doc.text(`Presiding Bench: ${presidingJudge}`, 14, 50);
      doc.text(`Hearing Date (E.C.): ${todayEth}`, 120, 38);

      // 3. Parties
      autoTable(doc, {
        startY: 56,
        head: [['Plaintiff / Prosecutor (Himataa)', 'Defendant / Respondent (Himatamaa)']],
        body: [[plaintiffName, defendantName]],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [245, 158, 11] },
        styles: { fontSize: 9 }
      });

      // 4. Order Title & Body
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(14);
      doc.setTextColor(20, 30, 60);
      doc.text(`COURT ORDER / VERDICT: ${orderType.replace('_', ' ').toUpperCase()}`, 14, finalY);

      doc.setFontSize(10);
      doc.setTextColor(60);
      const splitOutcome = doc.splitTextToSize(hearingOutcome, 180);
      doc.text(splitOutcome, 14, finalY + 8);

      // 5. Statutory Citations
      const citationY = finalY + 30;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 120, 20);
      doc.text('APPLICABLE STATUTORY CITATIONS:', 14, citationY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.text(statuteCitation, 14, citationY + 6);

      // 6. Next Hearing / Action
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 30, 60);
      doc.text(`NEXT SCHEDULED HEARING: ${nextHearingDate}`, 14, citationY + 18);

      // 7. Signature Block
      const sigY = citationY + 35;
      doc.text('Presiding Judge Signature:', 14, sigY);
      doc.line(14, sigY + 12, 80, sigY + 12);
      doc.text('____________________________', 14, sigY + 15);

      doc.text('Court Registrar Seal:', 130, sigY);
      doc.text('[ DIGITAL COURT SEAL QR ]', 130, sigY + 10);

      applyCourtWatermarkToPDF(doc);
      doc.save(`Court_Order_${activeCaseNumber.replace(/\//g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate Court Order PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-slate-900 border-2 border-amber-500/40 shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 text-2xl font-black">
              ⚖️
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                {currentLang === 'om' ? 'Qopheessaa Ajaja Mana Murtii (Court Order Generator)' : 'Template-Based Court Order Generator'}
              </h3>
              <p className="text-xs font-bold text-amber-400">
                Extract Case Details & Statutory Citations into Legally Formatted PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Docket / Case Number</label>
              <input
                type="text"
                value={activeCaseNumber}
                readOnly
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-amber-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="bail_ruling">Bail Ruling / Murtee Wabii</option>
                <option value="production_of_evidence">Production of Evidence Order</option>
                <option value="adjournment">Adjournment Order / Beellama Jijjiiruu</option>
                <option value="injunction">Injunction / Interim Stay Order</option>
                <option value="final_judgment">Final Judgment Decree / Murtii Dhumaa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Plaintiff / Prosecutor</label>
              <input
                type="text"
                value={plaintiffName}
                onChange={(e) => setPlaintiffName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Defendant / Respondent</label>
              <input
                type="text"
                value={defendantName}
                onChange={(e) => setDefendantName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Presiding Judge</label>
            <input
              type="text"
              value={presidingJudge}
              onChange={(e) => setPresidingJudge(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Hearing Outcome & Order Summary</label>
            <textarea
              value={hearingOutcome}
              onChange={(e) => setHearingOutcome(e.target.value)}
              className="w-full h-24 bg-slate-950 border border-slate-700 rounded-2xl p-4 text-xs font-medium text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Statutory Citations</label>
              <input
                type="text"
                value={statuteCitation}
                onChange={(e) => setStatuteCitation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Next Hearing Date</label>
              <input
                type="text"
                value={nextHearingDate}
                onChange={(e) => setNextHearingDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleGenerateOrderPDF}
              disabled={isGenerating}
              className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl uppercase text-xs transition-all shadow-xl shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>{isGenerating ? 'Generating PDF...' : 'Download Signed Court Order (PDF)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs uppercase cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
