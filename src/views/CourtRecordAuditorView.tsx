import React, { useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { generateLegalContent } from '../services/api';
import { PdfExportModal } from '../components/PdfExportModal';
import { LegalCitationHighlighter } from '../components/LegalCitationHighlighter';
import { LegalSummaryAudioPlayer } from '../components/LegalSummaryAudioPlayer';
import { auth } from '../services/firebase';
import { saveDossierAudit, getDossierAuditHistory, DossierAuditRecord } from '../services/dossierAuditService';
import { AuditVersionHistory } from '../components/AuditVersionHistory';
import { Clock, Share2 } from 'lucide-react';

interface CourtRecordAuditorViewProps {
  currentLang: Language;
  onNavigateTab?: (tab: string) => void;
}

export const CourtRecordAuditorView: React.FC<CourtRecordAuditorViewProps> = ({
  currentLang,
  onNavigateTab,
}) => {
  const t = translations[currentLang];

  // Benchmark Ethiopian Case Records (Galmee Falmii Qophaa'oo)
  const casePresets = [
    {
      id: 'res_judicata_procedural_defect',
      title: 'Galmee 1: Dhimma Qabeenyaa & Mormii Duraa (Res Judicata Defect)',
      badge: 'SDFHH Kwt 5 & 244',
      courtName: 'Mana Murtii Aanaa Adaamaa (Galmee Lakk. 04981/2016)',
      fullDossierText: `GALMEE FALMII MANA MURTII AANAA ADAAMAA
Lakk. Galmee: 04981/2016
Dhaddacha: Hariiroo Hawaasaa

IYYATA HIMATAA (PLAINT / STATEMENT OF CLAIM):
1. Himataan obboleessi isaa himatamaan mana dhaalmaa abbaa isaanii irraa dhufe seeraan ala qabatee waan jiruuf akka qoodamu gaafate.
2. Gatiin manichaa Birrii 480,000 jedhee madaale.
3. Bu'uura Seera Hariiroo Hawaasaa Keeyyata 842-850 tiin manichi akka walakkaan qoodamuuf himata bane.

DEEBII HIMATAMAA & MORMII DURAA:
1. MORMII DURAA (PRELIMINARY OBJECTION): Dhimmi manichaa kanaan dura Mana Murtii Aanaa Bishooftuutti Galmee Lakk. 12904 irratti falmiin irratti gaggeeffamee dhimmi murtii argatee waan ta'eef (Res Judicata - SDFHH Keeyyata 5), himatni kun kufaa akka ta'u mormee ragaa murtii kanaan duraa dhiyeesse.
2. DEEBII IJOO: Manichi dhaalmaa osoo hin taane, gatii mataa kootiin kan ijaarradheedha.

ADEEMSA FALMII & AJAJA ABBAA SEERAA (PROCEEDINGS & COURT MINUTES):
1. Abbaan Seeraa mormii duraa dhimma murtii argatee (Res Judicata) ilaalchisee murtii yeroo (Ruling on preliminary objection) osoo hin kennin, kallattiin gara qabxii falmii qabuutti darbe.
2. Abbaan Seeraa qabxii falmii: "Manichi dhaalmaadhaa moo ijaarsa himatamaati?" jedhee qabatee gareen lamaanuu ragaa namaa akka dhiyeessan ajaje.
3. Ragaa namaa erga dhaga'ee booda, manichi dhaalmaa ta'uun mirkanaa'eera jedhee qoodiinsi akka raawwatamu murteesse.`,
      plaintText: `IYYATA HIMATAA (PLAINT / STATEMENT OF CLAIM):
1. Himataan obboleessi isaa himatamaan mana dhaalmaa abbaa isaanii irraa dhufe seeraan ala qabatee waan jiruuf akka qoodamu gaafate.
2. Gatiin manichaa Birrii 480,000 jedhee madaale.
3. Bu'uura Seera Hariiroo Hawaasaa Keeyyata 842-850 tiin manichi akka walakkaan qoodamuuf himata bane.`,
      defenceText: `DEEBII HIMATAMAA & MORMII DURAA:
1. MORMII DURAA (PRELIMINARY OBJECTION): Dhimmi manichaa kanaan dura Mana Murtii Aanaa Bishooftuutti Galmee Lakk. 12904 irratti falmiin irratti gaggeeffamee dhimmi murtii argatee waan ta'eef (Res Judicata - SDFHH Keeyyata 5), himatni kun kufaa akka ta'u mormee ragaa murtii kanaan duraa dhiyeesse.
2. DEEBII IJOO: Manichi dhaalmaa osoo hin taane, gatii mataa kootiin kan ijaarradheedha.`,
      proceedingsText: `ADEEMSA FALMII & AJAJA ABBAA SEERAA (PROCEEDINGS & COURT MINUTES):
1. Abbaan Seeraa mormii duraa dhimma murtii argatee (Res Judicata) ilaalchisee murtii yeroo (Ruling on preliminary objection) osoo hin kennin, kallattiin gara qabxii falmii qabuutti darbe.
2. Abbaan Seeraa qabxii falmii: "Manichi dhaalmaadhaa moo ijaarsa himatamaati?" jedhee qabatee gareen lamaanuu ragaa namaa akka dhiyeessan ajaje.
3. Ragaa namaa erga dhaga'ee booda, manichi dhaalmaa ta'uun mirkanaa'eera jedhee qoodiinsi akka raawwatamu murteesse.`,
    },
    // ... (other presets as in original)
  ];

  // Mode Selection: 'file_upload' | 'structured_boxes' | 'audit_history'
  const [inputMode, setInputMode] = useState<'file_upload' | 'structured_boxes' | 'audit_history'>('file_upload');

  // Audit History State
  const [auditHistory, setAuditHistory] = useState<DossierAuditRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('application/pdf');
  const [fullDossierText, setFullDossierText] = useState(casePresets[0].fullDossierText);
  const [isDragging, setIsDragging] = useState(false);

  // 3-Column Structured Inputs
  const [courtName, setCourtName] = useState(casePresets[0].courtName);
  const [plaintText, setPlaintText] = useState(casePresets[0].plaintText);
  const [defenceText, setDefenceText] = useState(casePresets[0].defenceText);
  const [proceedingsText, setProceedingsText] = useState(casePresets[0].proceedingsText);

  // Execution & Audit State
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (inputMode === 'audit_history' && auth.currentUser) {
      loadAuditHistory();
    }
  }, [inputMode]);

  const loadAuditHistory = async () => {
    if (!auth.currentUser) return;
    setIsLoadingHistory(true);
    try {
      const history = await getDossierAuditHistory(auth.currentUser.uid);
      setAuditHistory(history);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setUploadedFile(file);
    setError(null);
    setAuditResult(null);

    const reader = new FileReader();
    if (file.type === 'text/plain') {
      reader.onload = () => {
        const text = reader.result as string;
        setFullDossierText(text);
        setFileBase64(null);
        autoSegmentDossierText(text);
      };
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const resultStr = reader.result as string;
        const base64 = resultStr.split(',')[1];
        setFileBase64(base64);
        setFileMimeType(file.type || 'application/pdf');
      };
      reader.readAsDataURL(file);
    }
  };

  const autoSegmentDossierText = (rawText: string) => {
    const lines = rawText.split('\n');
    let cName = courtName;
    let pText = '';
    let dText = '';
    let prText = '';
    let currentSection: 'header' | 'plaint' | 'defence' | 'proceedings' = 'header';

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('mana murtii') || lower.includes('court') || lower.includes('ፍርድ ቤት')) {
        if (currentSection === 'header' && !cName) cName = line.trim();
      }
      if (lower.includes('himannaa') || lower.includes('statement of claim') || lower.includes('iyyata himataa') || lower.includes('የክስ አቤቱታ')) {
        currentSection = 'plaint'; continue;
      } else if (lower.includes('deebii') || lower.includes('mormii duraa') || lower.includes('statement of defence') || lower.includes('መከላከያ መልስ')) {
        currentSection = 'defence'; continue;
      } else if (lower.includes('adeemsa') || lower.includes('qabxii falmii') || lower.includes('murtii') || lower.includes('proceedings') || lower.includes('ajaja') || lower.includes('የዳኝነት ሂደት')) {
        currentSection = 'proceedings'; continue;
      }
      if (currentSection === 'plaint') pText += line + '\n';
      else if (currentSection === 'defence') dText += line + '\n';
      else if (currentSection === 'proceedings') prText += line + '\n';
      else if (currentSection === 'header') pText += line + '\n';
    }
    if (pText.trim()) setPlaintText(pText.trim());
    if (dText.trim()) setDefenceText(dText.trim());
    if (prText.trim()) setProceedingsText(prText.trim());
    if (cName.trim()) setCourtName(cName.trim());

    setExtractionMessage(currentLang === 'om' ? '✅ Galmeen kun kutaalee sadanitti addaan baafameera!' : '✅ Document segmented!');
    setTimeout(() => setExtractionMessage(null), 4000);
  };

  const handleRunFullDossierAudit = async () => {
    if (!uploadedFile && !fullDossierText.trim()) {
      setError(currentLang === 'om' ? 'Maaloo faayila galmee falmii olkaa\'aa.' : 'Please upload file.');
      return;
    }
    setIsAuditing(true);
    setError(null);
    setAuditResult(null);

    try {
      let resultText = '';
      if (fileBase64) {
        const res = await fetch('/api/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: fileBase64,
            mimeType: fileMimeType,
            fileName: uploadedFile?.name || 'court_dossier.pdf',
            analysisType: 'court_record_audit',
            outputLanguages: [currentLang],
          }),
        });
        if (!res.ok) throw new Error('Audit failed');
        const data = await res.json();
        resultText = data.analysis || data.content;
      } else {
        const prompt = `AUDIT DOCKET:\n${fullDossierText}`;
        const res = await generateLegalContent({ prompt, taskType: 'explain_law', outputLanguages: [currentLang] });
        resultText = res.content;
      }
      setAuditResult(resultText);
      if (auth.currentUser) {
        await saveDossierAudit(auth.currentUser.uid, {
          userId: auth.currentUser.uid,
          courtName: courtName || 'Court',
          fileName: uploadedFile?.name || 'Manual',
          content: fullDossierText.substring(0, 500),
          auditResult: resultText,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleShareAuditResults = async () => {
    if (!auditResult) return;
    
    const shareData = {
      title: currentLang === 'om' ? 'Gabaasa Odiitii Galmee SeeraAI' : 'SeeraAI Court Record Audit Report',
      text: auditResult.substring(0, 300) + '...',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing audit results:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(auditResult);
        setExtractionMessage(currentLang === 'om' ? '✅ Bu\'aan odiitii clipboard irratti kooppii ta\'eera!' : '✅ Audit result copied to clipboard!');
        setTimeout(() => setExtractionMessage(null), 3000);
      } catch (err) {
        setError('Sharing not supported on this browser.');
      }
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
        <h1 className="text-2xl font-bold text-slate-100">
          {currentLang === 'om' ? "Odiitara Galmee Falmii" : 'Court Record Auditor'}
        </h1>
      </div>

      <div className="flex items-center gap-3 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
        {['file_upload', 'structured_boxes', 'audit_history'].map((mode) => (
          <button
            key={mode}
            onClick={() => setInputMode(mode as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              inputMode === mode ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {mode === 'audit_history' ? '📜 History' : mode.replace('_', ' ')}
          </button>
        ))}
      </div>


      {inputMode === 'audit_history' ? (
        <div className="space-y-6">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-slate-400 text-sm">Loading Case Audit History...</div>
            </div>
          ) : auditHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl text-slate-500">
              <Clock className="w-10 h-10 mb-4 opacity-20" />
              <div className="text-sm italic">No audit history found for this case profile.</div>
            </div>
          ) : (
            <AuditVersionHistory 
              history={auditHistory} 
              currentLang={currentLang} 
              onSelectAudit={(audit) => {
                setAuditResult(audit.auditResult);
                setInputMode('file_upload'); // Switch back to view result
              }}
            />
          )}
        </div>
      ) : inputMode === 'file_upload' ? (
        <div className="space-y-6">
           <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center cursor-pointer border-dashed" 
                onClick={() => document.getElementById('fileInput')?.click()}>
             <input id="fileInput" type="file" onChange={handleFileChange} hidden />
             <div className="text-amber-500 text-4xl mb-2">📁</div>
             <div className="text-slate-200 font-bold">{uploadedFile ? uploadedFile.name : 'Click to Upload Court File'}</div>
           </div>
           <button onClick={handleRunFullDossierAudit} disabled={isAuditing} className="w-full py-4 bg-amber-500 rounded-2xl font-bold text-slate-950">
             {isAuditing ? 'Auditing...' : 'Run Audit'}
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <textarea value={plaintText} onChange={e => setPlaintText(e.target.value)} placeholder="Plaint" className="bg-slate-900 p-4 rounded-2xl border border-slate-800 h-64 text-xs text-slate-100" />
          <textarea value={defenceText} onChange={e => setDefenceText(e.target.value)} placeholder="Defence" className="bg-slate-900 p-4 rounded-2xl border border-slate-800 h-64 text-xs text-slate-100" />
          <textarea value={proceedingsText} onChange={e => setProceedingsText(e.target.value)} placeholder="Proceedings" className="bg-slate-900 p-4 rounded-2xl border border-slate-800 h-64 text-xs text-slate-100" />
        </div>
      )}

      {auditResult && (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 animate-in fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-slate-100">
              {currentLang === 'om' ? 'Bu\'aa Odiitii Galmee' : 'Court Record Audit Result'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareAuditResults}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                title={currentLang === 'om' ? 'Qoodi (Share)' : 'Share Report'}
              >
                <Share2 className="w-4 h-4" />
                <span>{currentLang === 'om' ? 'Qoodi' : 'Share'}</span>
              </button>
              <button
                onClick={() => setShowPdfModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <span>📄</span>
                <span>{currentLang === 'om' ? 'Download as PDF' : 'Download as PDF'}</span>
              </button>
            </div>
          </div>

          {showPdfModal && (
            <PdfExportModal
              isOpen={showPdfModal}
              onClose={() => setShowPdfModal(false)}
              content={auditResult}
              title={currentLang === 'om' ? 'Odiitii Galmee Falmii' : 'Court Record Audit Report'}
              currentLang={currentLang}
              taskType="audit"
              outputLanguages={[currentLang]}
            />
          )}

          {/* Audio Review Player & Exporter */}
          <LegalSummaryAudioPlayer
            currentLang={currentLang}
            summaryText={auditResult}
            documentTitle="Odiitii Galmee Falmii"
          />

          <div className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed pt-2">
            <LegalCitationHighlighter text={auditResult} currentLang={currentLang} />
          </div>
        </div>
      )}
    </div>
  );
};
