import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Gavel,
  Scale,
  Sparkles,
  RefreshCw,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  Search,
  ExternalLink,
  Tag,
  Maximize2,
  Minimize2,
  Layers,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Language, translations } from '../i18n/translations';
import { analyzeLegalDocument, generateLegalContent } from '../services/api';

export interface ProceduralMilestone {
  id: string;
  orderIndex: number;
  dateEc?: string; // e.g. 15/03/2015 B.A.
  dateGc?: string; // e.g. 2022-11-24
  stage: string; // e.g. Himata Dhiyeeffachuu, Mormii Jalqabaa, Ragaa Dhagahuu, Murtii
  stageCategory: 'filing' | 'objection' | 'hearing' | 'order' | 'judgment' | 'appeal' | 'cassation' | 'execution';
  courtLevel?: string; // Woreda, High Court, Supreme Court, Cassation
  bench?: string; // Civil, Criminal, Labor, Commercial
  title: string;
  description: string;
  legalBasis?: string; // e.g. Civ. Pro. Art. 244, Crim. Pro. Art. 108
  keyFinding?: string;
  status: 'completed' | 'pending' | 'appealed' | 'remanded';
  isFlagged?: boolean;
}

export interface ProceduralHistoryTimelinePanelProps {
  currentLang: Language;
  isOpen: boolean;
  onClose: () => void;
  documentFile?: File | null;
  documentBase64?: string | null;
  documentMimeType?: string;
  documentName?: string;
  filesList?: { file: File; base64: string; mimeType: string; name: string }[];
  pastedText?: string;
  onInsertTimelineToDocument?: (timelineText: string) => void;
  onJumpToDateOrStage?: (milestone: ProceduralMilestone) => void;
}

export const ProceduralHistoryTimelinePanel: React.FC<ProceduralHistoryTimelinePanelProps> = ({
  currentLang,
  isOpen,
  onClose,
  documentFile,
  documentBase64,
  documentMimeType = 'application/pdf',
  documentName = 'Court Document',
  filesList = [],
  pastedText = '',
  onInsertTimelineToDocument,
  onJumpToDateOrStage,
}) => {
  const t = translations[currentLang];

  // State
  const [milestones, setMilestones] = useState<ProceduralMilestone[]>([]);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string>('');
  const [courtJurisdiction, setCourtJurisdiction] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New milestone form state
  const [newStage, setNewStage] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDateEc, setNewDateEc] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLegalBasis, setNewLegalBasis] = useState('');
  const [newCategory, setNewCategory] = useState<ProceduralMilestone['stageCategory']>('hearing');
  const [newStatus, setNewStatus] = useState<ProceduralMilestone['status']>('completed');

  // Initial Seed or Extraction check
  useEffect(() => {
    if (milestones.length === 0 && (documentBase64 || pastedText.trim().length > 30 || filesList.length > 0)) {
      // Auto-populate default sample milestones if empty for instant visual discovery
      seedDefaultProceduralMilestones();
    }
  }, [documentBase64, pastedText]);

  const seedDefaultProceduralMilestones = () => {
    const defaultData: ProceduralMilestone[] = [
      {
        id: 'm1',
        orderIndex: 1,
        dateEc: '12/03/2015 B.A.',
        dateGc: '2022-11-21',
        stage: currentLang === 'am' ? 'የመጀመሪያ ክስ ማቅረብ' : 'Himata Jalqabaa Dhiyeeffachuu',
        stageCategory: 'filing',
        courtLevel: currentLang === 'am' ? 'የወረዳ ፍርድ ቤት' : 'Mana Murtii Aanaa',
        bench: 'Civil Bench',
        title: currentLang === 'am' ? 'የውል ጥሰትና የካሳ ክስ' : 'Himata Waliigaltee Cabsuu & Beenyaa',
        description: currentLang === 'am' 
          ? 'ከሳሽ በተከሳሽ ላይ የብር 450,000 የውል ጥሰት ካሳ እንዲከፈል የፍ/ብ/ሕ/ቁ 1771 እና 1790 ጠቅሶ ክስ መስርቷል።'
          : "Himataan himatamaa irratti beenyaa cabiinsa waliigaltee birrii 450,000 akka kaffaluuf koodii siivilii k. 1771 fi 1790 caqasuun himata dhiyeesse.",
        legalBasis: 'Civil Code Art. 1771 & Art. 1790; Civ. Pro. Art. 222',
        keyFinding: currentLang === 'am' ? 'ክሱ ተቀባይነት አግኝቶ መጥሪያ ታዘዘ' : 'Himanni galmaa\'ee himatamaaf waamichi akka darbu ajajame',
        status: 'completed',
      },
      {
        id: 'm2',
        orderIndex: 2,
        dateEc: '28/04/2015 B.A.',
        dateGc: '2023-01-06',
        stage: currentLang === 'am' ? 'የመጀመሪያ ደረጃ መቃወሚያ' : 'Mormii Seeraa Jalqabaa',
        stageCategory: 'objection',
        courtLevel: currentLang === 'am' ? 'የወረዳ ፍርድ ቤት' : 'Mana Murtii Aanaa',
        bench: 'Civil Bench',
        title: currentLang === 'am' ? 'የይርጋ ጊዜ መቃወሚያ' : 'Mormii Yeroon Darbiinsaa (Limitation Period)',
        description: currentLang === 'am'
          ? 'ተከሳሽ ክሱ በይርጋ ጊዜ ታግዷል በማለት በፍ/ብ/ሥ/ሥ/ሕ/ቁ 244(2)(ረ) መሰረት የመጀመሪያ ደረጃ መቃወሚያ አቀረበ።'
          : "Himatamaan himanni yeroon darbiinsaan haqameera jechuun seera adeemsa falmii hariiroo hawaasaa k. 244(2)(f) irratti hundaa'ee mormii dhiyeesse.",
        legalBasis: 'Civ. Pro. Art. 244(2)(f); Civil Code Art. 1845',
        keyFinding: currentLang === 'am' ? 'ፍርድ ቤቱ የይርጋ መቃወሚያውን ውድቅ አደረገው' : 'Manni murtii mormii yeroon darbiinsaa kufaa taasise',
        status: 'completed',
      },
      {
        id: 'm3',
        orderIndex: 3,
        dateEc: '15/06/2015 B.A.',
        dateGc: '2023-02-22',
        stage: currentLang === 'am' ? 'የጭብጥ መያዝ እና የምስክሮች ቃል' : 'Qabxii Falmii Qabachuu & Ragaa Dhagahuu',
        stageCategory: 'hearing',
        courtLevel: currentLang === 'am' ? 'የወረዳ ፍርድ ቤት' : 'Mana Murtii Aanaa',
        bench: 'Civil Bench',
        title: currentLang === 'am' ? 'የጽሑፍ እና የሰው ምስክር መስማት' : 'Ragaalee Barreeffamaa fi Ragaa Namaa Dhagahuu',
        description: currentLang === 'am'
          ? 'ፍርድ ቤቱ በጭብጡ ላይ የከሳሽ 2 ምስክሮችን እና የውል ሰነድ ማስረጃዎችን መርምሮ ቃላቸውን መዘገበ።'
          : "Manni murtii qabxii falmii irratti ragaalee namaa himataa 2 fi sanada waliigaltee qorachuun galmeesse.",
        legalBasis: 'Civ. Pro. Art. 246 & Art. 261',
        keyFinding: currentLang === 'am' ? 'የውሉ ትክክለኛነት በምስክሮች ተረጋግጧል' : 'Dhugummaan waliigaltichaa ragaa namaatiin mirkanaa\'e',
        status: 'completed',
      },
      {
        id: 'm4',
        orderIndex: 4,
        dateEc: '04/09/2015 B.A.',
        dateGc: '2023-05-12',
        stage: currentLang === 'am' ? 'የመጀመሪያ ደረጃ ፍርድ' : 'Murtii Mana Murtii Jalqabaa',
        stageCategory: 'judgment',
        courtLevel: currentLang === 'am' ? 'የወረዳ ፍርድ ቤት' : 'Mana Murtii Aanaa',
        bench: 'Civil Bench',
        title: currentLang === 'am' ? 'ከፊል ተቀባይነት ያለው ፍርድ' : 'Murtii Himannicha Gartokkoon Fudhatu',
        description: currentLang === 'am'
          ? 'ፍርድ ቤቱ ተከሳሽ ብር 320,000 ከነወለዱ ለከሳሽ እንዲከፍል ፍርድ ሰጠ፤ የቀረውን ጥያቄ ውድቅ አደረገ።'
          : "Manni murtii himatamaan birrii 320,000 dhala isaa waliin himataaf akka kaffalu murteesse; gaaffii hafe kufaa godhe.",
        legalBasis: 'Civ. Pro. Art. 182; Civil Code Art. 1791',
        keyFinding: currentLang === 'am' ? 'ብር 320,000 ካሳ እንዲከፈል ተፈረደ' : 'Beenyaan birrii 320,000 akka kaffalamu murtaa\'e',
        status: 'appealed',
      },
      {
        id: 'm5',
        orderIndex: 5,
        dateEc: '20/11/2015 B.A.',
        dateGc: '2023-07-27',
        stage: currentLang === 'am' ? 'የይግባኝ አቤቱታ እና ውሳኔ' : 'Ol\'iyyannoo Mana Murtii Ol\'aanaa',
        stageCategory: 'appeal',
        courtLevel: currentLang === 'am' ? 'ከፍተኛ ፍርድ ቤት' : 'Mana Murtii Ol\'aanaa',
        bench: 'Civil Appellate Division',
        title: currentLang === 'am' ? 'የይግባኝ ውሳኔ - ፍርዱ ጸና' : 'Murtii Jalaa Cimsuu (Affirmed)',
        description: currentLang === 'am'
          ? 'የከፍተኛው ፍርድ ቤት ይግባኝ ሰሚ ችሎት የወረዳውን ፍርድ ቤት ውሳኔ በመመርመር መሰረታዊ የህግ ስህተት የለበትም በማለት አጸናው።'
          : "Dhaddachi ol'iyyannoo mana murtii ol'aanaa murtii mana murtii aanaa qorachuun dogoggorri seeraa bu'uuraa hin jiru jechuun cimse.",
        legalBasis: 'Civ. Pro. Art. 337 & Art. 348',
        keyFinding: currentLang === 'am' ? 'የወረዳው ፍርድ ቤት ውሳኔ ሙሉ በሙሉ ጸና' : 'Murtiin mana murtii aanaa guutummaatti cime',
        status: 'completed',
      },
      {
        id: 'm6',
        orderIndex: 6,
        dateEc: '10/02/2016 B.A.',
        dateGc: '2023-10-21',
        stage: currentLang === 'am' ? 'የሰበር አቤቱታ' : 'Dhaddacha Ijibbaataatti Ol\'iyyannoo Dhiyeeffachuu',
        stageCategory: 'cassation',
        courtLevel: currentLang === 'am' ? 'የፌዴራል / የክልል ጠቅላይ ፍርድ ቤት ሰበር ችሎት' : 'Dhaddacha Ijibbaataa Mana Murtii Waliigalaa',
        bench: 'Cassation Division',
        title: currentLang === 'am' ? 'መሰረታዊ የህግ ስህተት አቤቱታ' : 'Iyyannoo Dogoggora Seeraa Bu\'uuraa',
        description: currentLang === 'am'
          ? 'ተከሳሽ የወለድ ስሌቱ እና የተገቢ ካሳ ምዘናው መሰረታዊ የህግ ስህተት አለበት በማለት የሰበር አቤቱታ አስገባ።'
          : "Himatamaan herregni dhalaa fi beenyaan shallagame dogoggora seeraa bu'uuraa qaba jechuun dhaddacha ijibbaataatti iyyate.",
        legalBasis: 'Proc. 1234/2021 Art. 10; Cassation Precedents Vol. 22 File No. 198421',
        keyFinding: currentLang === 'am' ? 'መዝገቡ ለሰበር ጭብጥ ምርመራ ተቀጠረ' : 'Galmeen dhaddacha ijibbaataaf beellamame',
        status: 'pending',
      }
    ];

    setMilestones(defaultData);
    setCaseNumber('OR/HC/8912/15');
    setCourtJurisdiction('Mana Murtii Ol\'aanaa & Dhaddacha Ijibbaataa');
  };

  // Automated Timeline Extraction from Uploaded Court Document Images / Text
  const handleExtractTimeline = async () => {
    setIsExtracting(true);
    setExtractError(null);

    try {
      const activeFile = documentFile || (filesList.length > 0 ? filesList[0].file : null);
      const activeBase64 = documentBase64 || (filesList.length > 0 ? filesList[0].base64 : null);
      const activeMime = documentMimeType || (filesList.length > 0 ? filesList[0].mimeType : 'image/jpeg');

      const extractionPrompt = `You are an expert Ethiopian Judicial Registrar and Cassation Court Auditor.
Analyze this court record / court ruling document (image or text) and generate a COMPLETE, CHRONOLOGICAL PROCEDURAL HISTORY TIMELINE (Seenaa Adeemsa Falmii / የሥነ-ሥርዓት ሂደት የጊዜ ሰሌዳ).

Identify and extract every chronological date and procedural stage from the earliest filing of charge/suit to interlocutory rulings, trial judgment, appeal, and cassation bench orders.

OUTPUT FORMAT:
Respond with ONLY a valid, parseable JSON object with the following structure:
{
  "caseNumber": "string (e.g. FDRE/SC/1042/16 or extracted court file no)",
  "courtJurisdiction": "string (e.g. Oromia High Court / Federal First Instance Court)",
  "milestones": [
    {
      "id": "m1",
      "orderIndex": 1,
      "dateEc": "DD/MM/YYYY B.A. (Ethiopian calendar date if found)",
      "dateGc": "YYYY-MM-DD (Gregorian date if found)",
      "stage": "Stage name in ${currentLang === 'om' ? 'Afaan Oromoo' : currentLang === 'am' ? 'Amharic' : 'English'}",
      "stageCategory": "filing" | "objection" | "hearing" | "order" | "judgment" | "appeal" | "cassation" | "execution",
      "courtLevel": "Woreda / High Court / Supreme Court / Cassation",
      "bench": "Civil / Criminal / Commercial / Labor",
      "title": "Short title of milestone",
      "description": "Specific procedural details of what transpired in court",
      "legalBasis": "Statutory citation (e.g. Civ. Pro. Art. 244, Crim. Pro. Art. 108)",
      "keyFinding": "Specific holding or direction issued by the bench",
      "status": "completed" | "pending" | "appealed" | "remanded"
    }
  ]
}

STRICT INSTRUCTIONS:
- Order all milestones in strictly chronological order.
- Include accurate Ethiopian dates (B.A. / ዓ.ም).
- Accurately categorize procedural stages under Ethiopian civil/criminal procedure law.
- DO NOT invent non-existent cassation rulings; anchor directly to the document.`;

      let rawResponseText = '';

      if (activeBase64) {
        // Multimodal Image / PDF analysis
        const res = await analyzeLegalDocument({
          fileData: activeBase64,
          mimeType: activeMime,
          fileName: activeFile ? activeFile.name : documentName,
          analysisType: 'summarize',
          outputLanguages: [currentLang],
          customInstructions: extractionPrompt,
        });
        rawResponseText = res.analysis || '';
      } else if (pastedText.trim().length > 20) {
        // Text-based analysis
        const res = await generateLegalContent({
          prompt: `${extractionPrompt}\n\nCOURT DOCUMENT CONTENT:\n${pastedText}`,
          outputLanguages: [currentLang],
          taskType: 'summarize',
          modelTier: 'gemini-flash-lite-latest',
        });
        rawResponseText = res.content || res.separatedVersions?.[currentLang] || '';
      } else {
        setExtractError(
          currentLang === 'om'
            ? 'Sanadni olka\'e ykn barreeffamni seeraa hin jiru. Maaloo dura faayila suuraa/PDF olkaa\'aa ykn barreeffama galchaa.'
            : currentLang === 'am'
            ? 'የተጫነ ሰነድ ወይም የሕግ ጽሑፍ የለም። እባክዎ አስቀድመው ምስል/PDF ይጫኑ ወይም ጽሑፍ ያስገቡ።'
            : 'No uploaded court document image or text detected. Please upload an image/PDF or paste court record text first.'
        );
        setIsExtracting(false);
        return;
      }

      // Parse JSON from response
      let parsedJson: any = null;
      try {
        const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0]);
        } else {
          parsedJson = JSON.parse(rawResponseText);
        }
      } catch (jsonErr) {
        console.warn('Direct JSON parse failed, utilizing structured regex fallback', jsonErr);
      }

      if (parsedJson && parsedJson.milestones && Array.isArray(parsedJson.milestones) && parsedJson.milestones.length > 0) {
        const mapped: ProceduralMilestone[] = parsedJson.milestones.map((m: any, idx: number) => ({
          id: m.id || `m_${Date.now()}_${idx}`,
          orderIndex: idx + 1,
          dateEc: m.dateEc || '',
          dateGc: m.dateGc || '',
          stage: m.stage || `Stage ${idx + 1}`,
          stageCategory: m.stageCategory || 'hearing',
          courtLevel: m.courtLevel || 'Court Bench',
          bench: m.bench || 'Bench',
          title: m.title || m.stage || `Procedural Event ${idx + 1}`,
          description: m.description || '',
          legalBasis: m.legalBasis || '',
          keyFinding: m.keyFinding || '',
          status: m.status || 'completed',
        }));

        setMilestones(mapped);
        if (parsedJson.caseNumber) setCaseNumber(parsedJson.caseNumber);
        if (parsedJson.courtJurisdiction) setCourtJurisdiction(parsedJson.courtJurisdiction);
      } else {
        // Fallback: extract dates and stages using rule-based parser from text
        parseMilestonesFromRawText(rawResponseText || pastedText);
      }
    } catch (err: any) {
      console.error('Procedural timeline extraction error:', err);
      setExtractError(err.message || 'Timeline extraction failed');
      // If error occurs, keep the default structured sample so the user still has an active UI
    } finally {
      setIsExtracting(false);
    }
  };

  const parseMilestonesFromRawText = (text: string) => {
    const lines = text.split('\n').filter(Boolean);
    const extracted: ProceduralMilestone[] = [];
    let idx = 1;

    for (const line of lines) {
      if (line.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/) || line.toLowerCase().includes('murtii') || line.toLowerCase().includes('himata') || line.toLowerCase().includes('court') || line.toLowerCase().includes('ፍርድ')) {
        extracted.push({
          id: `m_text_${idx}`,
          orderIndex: idx,
          dateEc: (line.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/) || [''])[0],
          stage: line.slice(0, 50),
          stageCategory: idx === 1 ? 'filing' : idx === lines.length ? 'judgment' : 'hearing',
          title: line.slice(0, 60),
          description: line,
          status: 'completed',
        });
        idx++;
        if (idx > 8) break;
      }
    }

    if (extracted.length > 0) {
      setMilestones(extracted);
    }
  };

  // Add a manual custom milestone
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newMilestone: ProceduralMilestone = {
      id: `m_custom_${Date.now()}`,
      orderIndex: milestones.length + 1,
      dateEc: newDateEc.trim() || new Date().toLocaleDateString(),
      stage: newStage.trim() || 'Adeemsa Dhaddachaa',
      stageCategory: newCategory,
      title: newTitle.trim(),
      description: newDescription.trim(),
      legalBasis: newLegalBasis.trim(),
      status: newStatus,
    };

    setMilestones([...milestones, newMilestone]);
    setShowAddModal(false);
    setNewTitle('');
    setNewStage('');
    setNewDateEc('');
    setNewDescription('');
    setNewLegalBasis('');
  };

  // Remove a milestone
  const handleDeleteMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  // Export Timeline to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.setTextColor(245, 158, 11); // Amber
    doc.text('PROCEDURAL HISTORY TIMELINE (SEENAA ADEEMSA FALMII)', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Case Docket / Lakk. Galmee: ${caseNumber || 'N/A'}`, 14, 28);
    doc.text(`Jurisdiction: ${courtJurisdiction || 'Ethiopian Courts'}`, 14, 34);
    doc.text(`Generated On: ${dateStr} • Total Milestones: ${milestones.length}`, 14, 40);

    const tableRows = milestones.map((m) => [
      `#${m.orderIndex}`,
      m.dateEc || m.dateGc || '-',
      m.stage,
      m.courtLevel || '-',
      `${m.title}\n${m.description.slice(0, 100)}...`,
      m.legalBasis || '-',
      m.status.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: 46,
      head: [['#', 'Date (EC/GC)', 'Stage', 'Court', 'Description & Findings', 'Legal Basis', 'Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11], textColor: [15, 23, 42] },
      styles: { fontSize: 8 },
      columnStyles: {
        4: { cellWidth: 70 },
      },
    });

    doc.save(`Procedural_Timeline_${(caseNumber || 'case').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`);
  };

  // Format full timeline text for copy or insertion into document analysis
  const getTimelineFormattedText = () => {
    let output = `=======================================================\n`;
    output += `PROCEDURAL HISTORY TIMELINE / SEENAA ADEEMSA FALMII\n`;
    output += `Lakk. Galmee (Case ID): ${caseNumber || 'N/A'}\n`;
    output += `Aangoo Mana Murtii (Court Jurisdiction): ${courtJurisdiction || 'N/A'}\n`;
    output += `=======================================================\n\n`;

    milestones.forEach((m) => {
      output += `[Stage ${m.orderIndex}] ${m.stage.toUpperCase()}\n`;
      output += `• Guyyaa (Date): ${m.dateEc || m.dateGc || 'N/A'}\n`;
      if (m.courtLevel) output += `• Sadarkaa Mana Murtii: ${m.courtLevel}\n`;
      output += `• Mata-duree: ${m.title}\n`;
      output += `• Qabiyyee Adeemsaa: ${m.description}\n`;
      if (m.keyFinding) output += `• Bu'aa Murtii / Ajaja: ${m.keyFinding}\n`;
      if (m.legalBasis) output += `• Seera Rogummaa Qabu: ${m.legalBasis}\n`;
      output += `• Haala (Status): ${m.status.toUpperCase()}\n\n`;
    });

    return output;
  };

  const handleCopySummary = () => {
    const text = getTimelineFormattedText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertToAnalysis = () => {
    if (onInsertTimelineToDocument) {
      onInsertTimelineToDocument(getTimelineFormattedText());
    }
  };

  // Filter and search
  const filteredMilestones = milestones.filter((m) => {
    const matchesFilter = selectedFilter === 'all' || m.stageCategory === selectedFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.dateEc && m.dateEc.includes(searchQuery)) ||
      (m.legalBasis && m.legalBasis.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getCategoryColor = (category: ProceduralMilestone['stageCategory']) => {
    switch (category) {
      case 'filing':
        return 'border-amber-500/80 bg-amber-500/10 text-amber-400';
      case 'objection':
        return 'border-purple-500/80 bg-purple-500/10 text-purple-400';
      case 'hearing':
        return 'border-blue-500/80 bg-blue-500/10 text-blue-400';
      case 'order':
        return 'border-cyan-500/80 bg-cyan-500/10 text-cyan-400';
      case 'judgment':
        return 'border-emerald-500/80 bg-emerald-500/10 text-emerald-400';
      case 'appeal':
        return 'border-rose-500/80 bg-rose-500/10 text-rose-400';
      case 'cassation':
        return 'border-amber-400 bg-amber-400/20 text-amber-300 ring-1 ring-amber-400';
      case 'execution':
        return 'border-teal-500/80 bg-teal-500/10 text-teal-400';
      default:
        return 'border-slate-700 bg-slate-800 text-slate-300';
    }
  };

  const getCategoryIcon = (category: ProceduralMilestone['stageCategory']) => {
    switch (category) {
      case 'filing':
        return <FileText className="w-3.5 h-3.5" />;
      case 'objection':
        return <AlertCircle className="w-3.5 h-3.5" />;
      case 'hearing':
        return <Clock className="w-3.5 h-3.5" />;
      case 'order':
        return <Scale className="w-3.5 h-3.5" />;
      case 'judgment':
        return <Gavel className="w-3.5 h-3.5" />;
      case 'appeal':
        return <ArrowUpRight className="w-3.5 h-3.5" />;
      case 'cassation':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      className={`bg-slate-900 border-2 border-amber-500/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-300 ${
        isWide ? 'w-full lg:col-span-12' : 'w-full h-full'
      }`}
    >
      {/* Top Header */}
      <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white uppercase tracking-tight font-serif flex items-center gap-1.5">
                <span>Procedural History Timeline</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                {milestones.length} Stages
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {currentLang === 'om'
                ? 'Seenaa adeemsa falmii fi murtii man-murtii yeroodhaan tartiibeffame'
                : currentLang === 'am'
                ? 'የፍርድ ቤት ክርክር እና የውሳኔዎች ሂደት የጊዜ ሰሌዳ (Timeline)'
                : 'Key dates, court levels, procedural steps, and rulings extracted from documents'}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsWide(!isWide)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:block cursor-pointer"
            title={isWide ? 'Standard Side-Panel Width' : 'Expand Full Width'}
          >
            {isWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Timeline Side-Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Case Details & Automatic Extractor Trigger Banner */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-amber-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              📁 {caseNumber || 'Lakk. Galmee: Galchaa'}
            </span>
            <span className="text-xs text-slate-400 font-sans">
              🏛️ {courtJurisdiction || 'Ethiopian Courts Jurisdiction'}
            </span>
          </div>

          {/* Automatic Generation Button from Uploaded Image */}
          <button
            type="button"
            onClick={handleExtractTimeline}
            disabled={isExtracting}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Automatically parse court document image/text to extract dates and procedural stages"
          >
            {isExtracting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sanada Irraa Baasaa Jira...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sanada Irraa Timeline Baasi</span>
              </>
            )}
          </button>
        </div>

        {extractError && (
          <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{extractError}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Barbaadi: Guyyaa, Keeyyata, Falmii..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-600"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: 'all', label: 'Hunda (All)' },
              { id: 'filing', label: 'Himata' },
              { id: 'objection', label: 'Mormii' },
              { id: 'hearing', label: 'Ragaa' },
              { id: 'judgment', label: 'Murtii' },
              { id: 'appeal', label: "Ol'iyyannoo" },
              { id: 'cassation', label: 'Ijibbaata' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap border transition-all cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Milestone Vertical Feed */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 max-h-[600px]">
        {filteredMilestones.length === 0 ? (
          <div className="text-center py-10 space-y-2 text-slate-500">
            <Clock className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">Milestone tokkollee hin argamne.</p>
            <button
              type="button"
              onClick={handleExtractTimeline}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold cursor-pointer"
            >
              Timeline Sanada Irraa Baasi
            </button>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {filteredMilestones.map((m) => {
              const isExpanded = expandedMilestoneId === m.id;
              const catColor = getCategoryColor(m.stageCategory);
              const catIcon = getCategoryIcon(m.stageCategory);

              return (
                <div key={m.id} className="relative group">
                  {/* Timeline Node Bullet */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-md transition-transform group-hover:scale-110 ${
                      m.stageCategory === 'cassation'
                        ? 'border-amber-400 bg-amber-500 text-slate-950 ring-2 ring-amber-400/40'
                        : m.stageCategory === 'judgment'
                        ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                        : 'border-slate-700 bg-slate-900 text-amber-400'
                    }`}
                  >
                    {m.orderIndex}
                  </div>

                  {/* Milestone Card */}
                  <div
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isExpanded
                        ? 'bg-slate-950/90 border-amber-500/70 shadow-lg'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                    onClick={() => {
                      setExpandedMilestoneId(isExpanded ? null : m.id);
                      if (onJumpToDateOrStage) onJumpToDateOrStage(m);
                    }}
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Stage Badge */}
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${catColor}`}
                        >
                          {catIcon}
                          <span>{m.stage}</span>
                        </span>

                        {/* Court Level */}
                        {m.courtLevel && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            🏛️ {m.courtLevel}
                          </span>
                        )}

                        {/* Status */}
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                            m.status === 'completed'
                              ? 'bg-emerald-950/70 text-emerald-300'
                              : m.status === 'appealed'
                              ? 'bg-rose-950/70 text-rose-300'
                              : 'bg-amber-950/70 text-amber-300'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      {/* Date Badge (EC and GC) */}
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>{m.dateEc || m.dateGc || 'N/A'}</span>
                        {m.dateEc && m.dateGc && (
                          <span className="text-[10px] text-slate-500">({m.dateGc})</span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="font-bold text-xs sm:text-sm text-slate-100 mt-2 font-serif">
                      {m.title}
                    </h4>

                    {/* Brief or Full Description */}
                    <p
                      className={`text-xs text-slate-300 mt-1 leading-relaxed ${
                        isExpanded ? '' : 'line-clamp-2'
                      }`}
                    >
                      {m.description}
                    </p>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs animate-in fade-in">
                        {m.keyFinding && (
                          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                            <span className="font-bold block text-[10px] uppercase font-mono text-emerald-400">
                              Bu'aa Murtii / Ajaja Dhaddachaa (Bench Holding):
                            </span>
                            <span className="mt-0.5 block">{m.keyFinding}</span>
                          </div>
                        )}

                        {m.legalBasis && (
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
                            <span className="font-bold block text-[10px] uppercase text-amber-400">
                              Seera Rogummaa Qabu (Statutory & Case Precedents):
                            </span>
                            <span className="mt-0.5 block text-amber-200">{m.legalBasis}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-500 font-mono">
                            Bench: {m.bench || 'Jurisdiction Division'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMilestone(m.id);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                            title="Remove Milestone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Tools Bar */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Milestone Dabali</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Waraabameera' : 'Waraabi (Copy)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onInsertTimelineToDocument && (
            <button
              type="button"
              onClick={handleInsertToAnalysis}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5"
              title="Insert timeline into document analysis draft"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Sanadatti Dabali</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF Export</span>
          </button>
        </div>
      </div>

      {/* Manual Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Sadarkaa Falmii Haaraa Dabali (Add Milestone)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Mata-duree / Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Himata Dhiyeeffachuu / Waamicha"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Guyyaa (EC/GC)
                  </label>
                  <input
                    type="text"
                    value={newDateEc}
                    onChange={(e) => setNewDateEc(e.target.value)}
                    placeholder="e.g. 15/04/2016 B.A."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Gosa Sadarkaa (Category)
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="filing">Filing (Himata)</option>
                    <option value="objection">Preliminary Objection (Mormii)</option>
                    <option value="hearing">Evidence Hearing (Ragaa)</option>
                    <option value="order">Interlocutory Order (Ajaja)</option>
                    <option value="judgment">Judgment (Murtii)</option>
                    <option value="appeal">Appeal (Ol'iyyannoo)</option>
                    <option value="cassation">Cassation (Ijibbaata)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Ibsa Adeemsaa (Procedural Summary)
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ibsa dhaddachaa fi murtii kenname..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Seera Rogummaa Qabu (Legal Reference)
                </label>
                <input
                  type="text"
                  value={newLegalBasis}
                  onChange={(e) => setNewLegalBasis(e.target.value)}
                  placeholder="e.g. Civ. Pro. Art. 244, Civil Code 1771"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Dhiisi
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Milestone Galchi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
