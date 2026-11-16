import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

export interface VideoMetadata {
  durationSec?: number;
  resolution?: string;
  fps?: number;
  bitrateKbps?: number;
  fileSizeBytes?: number;
  checksumSha256?: string;
  mimeType?: string;
  extractedAt?: string;
  serverVerified?: boolean;
}

export interface CaseEvidence {
  id: string;
  name: string;
  type: string;
  dataUrl?: string;
  storageUrl?: string;
  storagePath?: string;
  size?: number;
  uploadedAt: string;
  category?: string;
  aiDescription?: string;
  aiRelevance?: string;
  evidentialWeight?: 'primary' | 'corroborative' | 'secondary';
  admissibilityStatus?: 'admissible' | 'conditional' | 'objection_pending' | 'inadmissible';
  incidentDate?: string;
  authorOrSource?: string;
  tags?: string[];
  videoMetadata?: VideoMetadata;
  verificationStatus?: string;
  confirmedByReporter?: boolean;
  confirmedAt?: string;
}

export async function extractServerVideoMetadata(
  caseId: string,
  evidenceId: string,
  dataUrl: string,
  opts?: { filename?: string; sizeBytes?: number; duration?: number; resolution?: string; fps?: number }
): Promise<VideoMetadata | null> {
  try {
    const res = await fetch('/api/evidence/extract-video-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        evidenceId,
        dataUrl,
        filename: opts?.filename,
        fileSizeBytes: opts?.sizeBytes,
        duration: opts?.duration,
        resolution: opts?.resolution,
        fps: opts?.fps
      })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.metadata || null;
  } catch (err) {
    console.warn('[extractServerVideoMetadata warning]:', err);
    return null;
  }
}

export interface PracticeCase {
  id: string;
  userId: string;
  courtId: string;
  caseNumber: string;
  plaintiff: string;
  defendant: string;
  subject: string;
  status: 'open' | 'processing' | 'judgment' | 'appealed' | 'closed';
  stage: number;
  documents: string[];
  evidence?: CaseEvidence[];
  judgment?: string;
  appealTarget?: string;
  createdAt: any;
  updatedAt: any;
}

// Intelligent AI Evidence Description Generator
export function generateAIEvidenceDescription(
  item: Partial<CaseEvidence>,
  context?: { caseNumber?: string; subject?: string; plaintiff?: string; defendant?: string },
  lang: 'om' | 'am' | 'en' = 'om'
): {
  description: string;
  relevance: string;
  weight: 'primary' | 'corroborative' | 'secondary';
  admissibility: 'admissible' | 'conditional' | 'objection_pending';
} {
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const caseNo = context?.caseNumber || 'CR-2026/045';
  const plaintiff = context?.plaintiff || 'Iyyataa';
  const defendant = context?.defendant || 'Waamamaa';

  if (cat.includes('photo') || cat.includes('suuraa') || item.type?.startsWith('image/')) {
    if (lang === 'om') {
      return {
        description: `Ragaan suuraa kun haala qabatamaa bakka falmiin irratti uumamee fi qabeenya galmee lakk. ${caseNo} irratti tuqame ifatti agarsiisa. Yeroo fi iddoo waraabbamee mallattoo fi qindoomina daangaa lafaa deeggara.`,
        relevance: `Dhugummaa himannaa ${plaintiff} mirkaneessuuf ragaa mul'ataa (Real Evidence) ta'ee tajaajila; madaallii ragaa S.A.F.H.H. Kw. 258 bu'uureffata.`,
        weight: 'primary',
        admissibility: 'admissible'
      };
    } else if (lang === 'am') {
      return {
        description: `ይህ የፎቶግራፍ ማስረጃ በተከራካሪው መሬትና ንብረት ላይ የተከሰተውን ነባራዊ ሁኔታ በግልጽ ያሳያል። በፋይል ቁጥር ${caseNo} ላይ የተጠቀሰውን ድንበርና ይዞታ ያረጋግጣል።`,
        relevance: `የከሳሽን ይዞታ የሚያረጋግጥ ቀዳሚ የዓይን ማስረጃ ሲሆን በፍ/ብ/ሥ/ሥ/ሕ/ቁ 258 መሠረት ተቀባይነት አለው።`,
        weight: 'primary',
        admissibility: 'admissible'
      };
    } else {
      return {
        description: `Photographic visual evidence depicting physical demarcations and state of disputed property referenced in case ${caseNo}. Corroborates the spatial claims established by the plaintiff.`,
        relevance: `Serves as primary demonstrative/real evidence substantiating physical possession under Civil Procedure Code Art. 258.`,
        weight: 'primary',
        admissibility: 'admissible'
      };
    }
  }

  if (cat.includes('contract') || cat.includes('waliigaltee') || name.includes('contract') || name.includes('agreement')) {
    if (lang === 'om') {
      return {
        description: `Sanada waliigaltee bittaa fi gurgurtaa qaamolee lamaan gidduutti raawwatamee fi mallattoolee ragaalee of keessaa qabu. Dirqama seeraa fi hariiroo daldalaa mirkaneessa.`,
        relevance: `Seera Hariiroo Hawaasaa Kw. 1731 fi Kw. 2005 bu'uuraan dirqisiisummaa waliigaltee himannaa fi deebii gidduu jiru madaala.`,
        weight: 'primary',
        admissibility: 'admissible'
      };
    } else if (lang === 'am') {
      return {
        description: `በተከራካሪዎች መካከል የተደረገ የጽሑፍ ውል ማስረጃ ሲሆን የሁለቱን ወገኖች ስምምነትና የፈራሚዎችን ፊርማ ይዟል።`,
        relevance: `በፍትሐብሔር ሕግ ቁጥር 1731 መሠረት ውል በሕግ ፊት አስገዳጅ መሆኑን የሚያረጋግጥ ቀዳሚ ሰነድ ነው።`,
        weight: 'primary',
        admissibility: 'admissible'
      };
    } else {
      return {
        description: `Executed legal contractual agreement bearing mutual assent and signatures regarding the core transaction in controversy.`,
        relevance: `Primary documentary evidence establishing enforceable reciprocal obligations pursuant to Civil Code Art. 1731.`,
        weight: 'primary',
        admissibility: 'admissible'
      };
    }
  }

  if (cat.includes('receipt') || cat.includes('nagahee') || cat.includes('bank') || name.includes('receipt')) {
    if (lang === 'om') {
      return {
        description: `Ragaa nagahee kaffaltii maallaqaa baankii ykn kaffaltii bittaa agarsiisu. Lakkoofsa herregaa, guyyaa kaffaltii fi hamma maallaqa raawwatamee calaqqisiisa.`,
        relevance: `Kaffaltiin walitti dhufeenya dhimma kanaatiin raawwatamuu isaa madaallii liqii fi beenyaa keessatti mirkaneessa.`,
        weight: 'corroborative',
        admissibility: 'admissible'
      };
    } else if (lang === 'am') {
      return {
        description: `የባንክ ወይም የክፍያ ደረሰኝ ማስረጃ ሲሆን የገንዘብ ዝውውር መፈጸሙንና ቀኑን ያረጋግጣል።`,
        relevance: `የተፈጸመውን ክፍያ ወይም የደረሰውን ኪሳራ የሚያረጋግጥ ደጋፊ የሰነድ ማስረጃ ነው።`,
        weight: 'corroborative',
        admissibility: 'admissible'
      };
    } else {
      return {
        description: `Financial transaction receipt / ledger documenting monetary consideration and transfer dates corresponding to the dispute.`,
        relevance: `Corroborative documentary proof of payment performance and financial damages mitigation.`,
        weight: 'corroborative',
        admissibility: 'admissible'
      };
    }
  }

  if (cat.includes('police') || cat.includes('report') || cat.includes('gabaasa') || name.includes('report')) {
    if (lang === 'om') {
      return {
        description: `Gabaasa qorannoo qulqullina ragaa waajjira dhimmi ilaallatuun (poolisii ykn bulchiinsa naannoo) qophaa'e. Haala taatee fi qaboo yaa'ii bakka dhimmaa of keessaa qaba.`,
        relevance: `Qorannoo al-loogummaa qaama mootummaatiin gaggeeffame waan ta'eef amanammummaa olaanaa qabaata.`,
        weight: 'primary',
        admissibility: 'admissible'
      };
    } else if (lang === 'am') {
      return {
        description: `በፖሊስ ወይም አግባብ ባለው አካል የተዘጋጀ ይፋዊ የቦታ ምልከታና ምርመራ ሪፖርት ነው።`,
        relevance: `ገለልተኛ በሆነ የመንግሥት አካል የተመዘገበ በመሆኑ ከፍተኛ የማስረጃ ክብደት አለው።`,
        weight: 'primary',
        admissibility: 'admissible'
      };
    } else {
      return {
        description: `Official investigative report and physical scene log prepared by designated authorities regarding the incident.`,
        relevance: `Independent institutional findings carrying substantial probative weight under procedural standards.`,
        weight: 'primary',
        admissibility: 'admissible'
      };
    }
  }

  // Default general evidence synthesis
  if (lang === 'om') {
    return {
      description: `Sanada ragaa seeraa galmee ${caseNo} waliin walqabatee dhiyaate. Ragaa firii dubbii fi qabxiilee falmii qorachuuf gargaara.`,
      relevance: `Madaallii ragaa waliigalaa mana murtii keessatti akka ragaa deeggarsaatti qoratama.`,
      weight: 'corroborative',
      admissibility: 'conditional'
    };
  } else if (lang === 'am') {
    return {
      description: `ከፋይል ቁጥር ${caseNo} ጋር በተያያዘ የቀረበ የሰነድ ማስረጃ። የክርክሩን ጭብጥ ለማጣራት ይረዳል።`,
      relevance: `በፍርድ ቤቱ አጠቃላይ የማስረጃ ምዘና ሂደት ውስጥ እንደ ደጋፊ ማስረጃ የሚመረመር።`,
      weight: 'corroborative',
      admissibility: 'conditional'
    };
  } else {
    return {
      description: `Formal evidential document submitted in connection with proceedings ${caseNo}, detailing procedural circumstances.`,
      relevance: `Admitted as corroborative proof supporting factual determinations in the judicial review.`,
      weight: 'corroborative',
      admissibility: 'conditional'
    };
  }
}

// Built-in demonstration digital evidence items for courtroom practice cases
export const SAMPLE_DIGITAL_EVIDENCE: CaseEvidence[] = [
  {
    id: 'ev_sample_photo_01',
    name: 'Waraabbata_Suuraa_Daangaa_Qabeenyaa_Parcel42.jpg',
    type: 'image/jpeg',
    size: 2450000,
    uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    incidentDate: '2026-11-02',
    category: 'Photographic Exhibit (Suuraa)',
    aiDescription: 'Ragaan suuraa kun daangaa lafaa lakk. 042 irratti dallaa haaraa ijaaramee fi mallattoolee lakkoofsa lafaa duraanii ifatti agarsiisa. Iyyannoo himataa irratti dhiyaate kan deeggaruudha.',
    aiRelevance: 'Qabatamummaa sarbama daangaa fi haala qabeenyaa yeroo falmiin ka\'e mirkaneessa (S.A.F.H.H. Kw. 258).',
    evidentialWeight: 'primary',
    admissibilityStatus: 'admissible',
    authorOrSource: 'Qorataa Seeraa Mana Murtii Aanaa Gurbicha',
    tags: ['Lafa', 'Daangaa', 'Suuraa']
  },
  {
    id: 'ev_sample_doc_02',
    name: 'Waliigaltee_Bittaa_fi_Gurgurtaa_Dachee_2025.pdf',
    type: 'application/pdf',
    size: 1820000,
    uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    incidentDate: '2025-08-14',
    category: 'Legal Contract (Waliigaltee)',
    aiDescription: 'Sanada waliigaltee barreeffamaa bittaa lafaa Birrii 1,200,000 irratti mallatteeffamee fi mallattoo jaarsolii sadii of keessaa qabu. Dirqama kaffaltii fi dabarsa qabeenyaa ibsa.',
    aiRelevance: 'Seera Hariiroo Hawaasaa Kw. 1731 fi Kw. 2877 bu\'uureffachuun mirga abbaa qabeenyummaa mirkaneessa.',
    evidentialWeight: 'primary',
    admissibilityStatus: 'admissible',
    authorOrSource: 'Waajjira Kattaa Ragaafi Galmee Galmeessaa',
    tags: ['Waliigaltee', 'Bittaa', 'PDF']
  },
  {
    id: 'ev_sample_receipt_03',
    name: 'Nagahee_Baankii_Sinqee_Kaffaltii_Dabarsaa.pdf',
    type: 'application/pdf',
    size: 640000,
    uploadedAt: new Date(Date.now() - 86400000 * 12).toISOString(), // 12 days ago
    incidentDate: '2026-10-18',
    category: 'Receipt & Invoice (Nagahee)',
    aiDescription: 'Nagahee kaffaltii Baankii Sinqee lakk. SNQ-2026-88910 tiin Birrii 450,000 gara herrega waamamaatti dabarfamuu isaa agarsiisa.',
    aiRelevance: 'Kaffaltiin dhimma falmiitiif taasisamuu fi himatamaan maallaqa fudhachuu isaa ragaa deeggarsaatiin mirkaneessa.',
    evidentialWeight: 'corroborative',
    admissibilityStatus: 'admissible',
    authorOrSource: 'Baankii Sinqee Damee Adaamaa',
    tags: ['Baankii', 'Nagahee', 'Sinqee']
  },
  {
    id: 'ev_sample_police_04',
    name: 'Gabaasa_Qorannoo_Bakka_Taatee_Poolisii_Aanaa.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1150000,
    uploadedAt: new Date(Date.now() - 86400000 * 25).toISOString(), // 25 days ago
    incidentDate: '2026-09-29',
    category: 'Official/Police Report (Gabaasa)',
    aiDescription: 'Gabaasa qorannoo qulqullina ragaa fi suuraalee bakka taatee poolisii aanaatiin qindaa\'e. Qaboo yaa\'ii dhaddacha duraa fi jecha namoota naannoo of keessaa qaba.',
    aiRelevance: 'Qorannoo al-loogummaa qaama mootummaa ti; himannaa ragaa sobaa dhiyaate fashaleessuuf fayyada.',
    evidentialWeight: 'primary',
    admissibilityStatus: 'admissible',
    authorOrSource: 'Qajeelcha Poolisii Aanaa Gurbicha',
    tags: ['Poolisii', 'Gabaasa', 'Word']
  },
  {
    id: 'ev_sample_audio_05',
    name: 'Waraabbata_Jecha_Kakuu_Ragaa_Arraata.mp3',
    type: 'audio/mpeg',
    size: 3800000,
    uploadedAt: new Date(Date.now() - 86400000 * 45).toISOString(), // 45 days ago
    incidentDate: '2026-09-10',
    category: 'Audio Testimony (Sagalee)',
    aiDescription: 'Waraabbata sagalee dhaddacha jalqabaa irratti ragaan kakuu raawwatee jecha kenne. Taateen yeroo raawwatamu bakka sanatti akka turee fi wanta arge ibsa.',
    aiRelevance: 'Ragaa afaanii (Oral Testimony) barreeffama waraabbata sagaleetiin deeggaramee murtii jalaatiif bu\'uura ture.',
    evidentialWeight: 'corroborative',
    admissibilityStatus: 'admissible',
    authorOrSource: 'Dhaddacha Mana Murtii Aanaa Gurbicha',
    tags: ['Sagalee', 'Ragaa', 'Kakuu']
  }
];

const COLLECTION_NAME = 'practice_cases';

export const practiceCaseService = {
  /**
   * Creates a new simulation case.
   */
  async createCase(userId: string, courtId: string, caseData: Partial<PracticeCase>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...caseData,
      userId,
      courtId,
      status: 'open',
      stage: 0,
      documents: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Updates an existing simulation case.
   */
  async updateCase(caseId: string, updates: Partial<PracticeCase>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, caseId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Attaches digital evidence to a practice case.
   */
  async attachEvidence(caseId: string, evidenceItem: CaseEvidence): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, caseId);
    await updateDoc(docRef, {
      evidence: arrayUnion(evidenceItem),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Removes digital evidence from a practice case.
   */
  async removeEvidence(caseId: string, evidenceItem: CaseEvidence): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, caseId);
    await updateDoc(docRef, {
      evidence: arrayRemove(evidenceItem),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Fetches the latest practice case for a user.
   */
  async getLatestCase(userId: string): Promise<PracticeCase | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as PracticeCase;
  },

  /**
   * Subscribe to practice cases for a user.
   */
  subscribeToCases(userId: string, callback: (cases: PracticeCase[]) => void) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(
      q,
      (snap: QuerySnapshot<DocumentData>) => {
        const cases = snap.docs.map((d: DocumentData) => ({ id: d.id, ...d.data() } as PracticeCase));
        callback(cases);
      },
      (error: Error) => {
        console.warn('practiceCaseService subscribeToCases notice:', error);
        callback([]);
      }
    );
  },

  /**
   * Fetches detailed evidence metadata retrieved from the Firestore 'practice_cases' document.
   */
  async fetchEvidenceMetadataFromPracticeCases(
    evidenceIdOrName?: string,
    caseIdOrNumber?: string
  ): Promise<CaseEvidence | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        limit(20)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          const caseData = docSnap.data() as PracticeCase;
          if (caseData.evidence && caseData.evidence.length > 0) {
            if (evidenceIdOrName) {
              const matched = caseData.evidence.find(
                e => e.id === evidenceIdOrName || 
                     e.name.toLowerCase().includes(evidenceIdOrName.toLowerCase()) ||
                     (evidenceIdOrName.toLowerCase().includes(e.name.toLowerCase()))
              );
              if (matched) return matched;
            } else {
              return caseData.evidence[0];
            }
          }
        }
      }
      return null;
    } catch (err) {
      console.warn('[practiceCaseService] fetchEvidenceMetadataFromPracticeCases notice:', err);
      return null;
    }
  }
};
