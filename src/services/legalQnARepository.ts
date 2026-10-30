import { Language } from '../i18n/translations';
import { db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface AnsweredLegalQA {
  id: string;
  userId?: string;
  isOwnerPrivate?: boolean;
  question: string;
  askedByVisitor?: string;
  category: 'labor' | 'property' | 'contract' | 'criminal' | 'family' | 'commercial' | 'general';
  answerContent: {
    om: string;
    am: string;
    en: string;
  };
  referencedStatutes: string[];
  referencedCassations?: string[];
  timestamp: string;
  isVerifiedByExpert: boolean;
  upvotesCount: number;
}

const LOCAL_QNA_KEY = 'seera_answered_qna_repository_v1';
const LOCAL_OWNER_QNA_KEY = 'seera_owner_private_qna_repository_v1';

export const INITIAL_ANSWERED_QNAS: AnsweredLegalQA[] = [
  {
    id: 'qna_001',
    question: 'Hojjetaa heeyyama malee guyyoota 5f hojii irraa hafe akeekkachiisa malee ari\'uun ni danda\'amaa?',
    askedByVisitor: 'Legislation Inquirer',
    category: 'labor',
    answerContent: {
      om: 'Eeyyee, Labsii Hojjetaa fi Hojjechiisaa Lakk. 1156/2011 Keeyyata 27(1)(f) bu\'uura godhachuudhaan, hojjetaan sababa gayaa malee guyyoota hojii walitti aanan shaniif (5 consecutive days) hojiirraa yoo hafe, hojjachiisaan beeksisa malee waliigaltee hojii addaan kutuu ni danda\'a.',
      am: 'አዎ፣ በአሰሪና ሰራተኛ አዋጅ ቁጥር 1156/2011 አንቀጽ 27(1)(ረ) መሰረት፣ ሰራተኛው ያለ በቂ ምክንያት ለ5 ተከታታይ የስራ ቀናት ከስራ ከተቀረ አሰሪው ያለማስጠንቀቂያ የሰራ ውል ለማቋረጥ ይችላል።',
      en: 'Yes. Under Labor Proclamation No. 1156/2019 Article 27(1)(f), an employer can summarily terminate employment without notice if an employee is absent without cause for 5 consecutive working days.',
    },
    referencedStatutes: ['Labsii Hojjetaa 1156/2011 K. 27(1)(f)'],
    referencedCassations: ['Galmee Lakk. 198421'],
    timestamp: '2026-03-10',
    isVerifiedByExpert: true,
    upvotesCount: 24,
  },
  {
    id: 'qna_002',
    question: 'Waliigalteen kireessaa manaa barreeffamaan hin taane seeraan fudhatama qabaa?',
    askedByVisitor: 'Property Tenant',
    category: 'contract',
    answerContent: {
      om: 'Koodii Siiviilii Keeyyata 2896 fi 1723 bu\'uura godhachuudhaan, waliigalteen kireessaa manaa waggaa 1 ol ta\'e barreeffamaan qophaa\'ee sanadoota DARA duratti galmaa\'uu qaba. Barreeffamaan yoo hin taane ragaa namaan mirkaneessuun hin danda\'amu.',
      am: 'በፍትሐብሔር ሕግ አንቀጽ 2896 እና 1723 መሰረት ከ1 ዓመት በላይ የሆነ የቤት ኪራይ ውል በጽሁፍ ተደርጎ በሰነዶች ማረጋገጫ ሊመዘገብ ይገባል።',
      en: 'Under Civil Code Arts. 2896 and 1723, residential leases exceeding 1 year must be executed in writing and registered to be enforceable against third parties.',
    },
    referencedStatutes: ['Koodii Siiviilii K. 2896', 'Koodii Siiviilii K. 1723'],
    referencedCassations: ['Galmee Lakk. 18274'],
    timestamp: '2026-03-12',
    isVerifiedByExpert: true,
    upvotesCount: 18,
  },
];

export function getAnsweredQAsFromStorage(): AnsweredLegalQA[] {
  if (typeof window === 'undefined') return INITIAL_ANSWERED_QNAS;

  const currentUser = auth.currentUser;
  const isOwner = 
    currentUser?.email === 'ayeledha@gmail.com' || 
    localStorage.getItem('seera_owner_email') === 'ayeledha@gmail.com' ||
    localStorage.getItem('seera_owner_unlocked') === 'true';

  let publicData: AnsweredLegalQA[] = INITIAL_ANSWERED_QNAS;
  try {
    const rawPublic = localStorage.getItem(LOCAL_QNA_KEY);
    if (rawPublic) {
      const parsed = JSON.parse(rawPublic);
      if (Array.isArray(parsed)) {
        publicData = parsed.filter(qa => !qa.isOwnerPrivate);
      }
    }
  } catch (e) {
    console.warn('Failed to load public Q&A archive', e);
  }

  if (!isOwner) {
    // Other visitors (nama biroo) strictly receive only public Q&As, owner private Q&As are never returned
    return publicData;
  }

  // Owner sees public data plus strictly private owner Q&As
  let ownerPrivateData: AnsweredLegalQA[] = [];
  try {
    const rawOwner = localStorage.getItem(LOCAL_OWNER_QNA_KEY);
    if (rawOwner) {
      const parsed = JSON.parse(rawOwner);
      if (Array.isArray(parsed)) {
        ownerPrivateData = parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load owner private Q&A archive', e);
  }

  // Combine owner private items with public items (owner private items first)
  const combinedMap = new Map<string, AnsweredLegalQA>();
  [...ownerPrivateData, ...publicData].forEach(qa => combinedMap.set(qa.id, qa));
  return Array.from(combinedMap.values());
}

export function saveAnsweredQAsToStorage(items: AnsweredLegalQA[]): void {
  if (typeof window === 'undefined') return;
  const currentUser = auth.currentUser;
  const isOwner = 
    currentUser?.email === 'ayeledha@gmail.com' || 
    localStorage.getItem('seera_owner_email') === 'ayeledha@gmail.com' ||
    localStorage.getItem('seera_owner_unlocked') === 'true';

  try {
    if (isOwner) {
      const ownerItems = items.filter(i => i.isOwnerPrivate);
      const publicItems = items.filter(i => !i.isOwnerPrivate);
      localStorage.setItem(LOCAL_OWNER_QNA_KEY, JSON.stringify(ownerItems));
      localStorage.setItem(LOCAL_QNA_KEY, JSON.stringify(publicItems));
    } else {
      const publicItems = items.filter(i => !i.isOwnerPrivate);
      localStorage.setItem(LOCAL_QNA_KEY, JSON.stringify(publicItems));
    }
  } catch (e) {
    console.error('Error saving answered Q&As', e);
  }
}

export function autoArchiveAnsweredLegalQA(
  question: string,
  answerContent: { om: string; am: string; en: string },
  referencedStatutes: string[] = [],
  referencedCassations: string[] = [],
  category: AnsweredLegalQA['category'] = 'general',
  askedByVisitor?: string
): AnsweredLegalQA {
  const currentUser = auth.currentUser;
  const isOwner = 
    currentUser?.email === 'ayeledha@gmail.com' || 
    localStorage.getItem('seera_owner_email') === 'ayeledha@gmail.com' ||
    localStorage.getItem('seera_owner_unlocked') === 'true';

  const current = getAnsweredQAsFromStorage();

  const existing = current.find((q) => q.question.toLowerCase().trim() === question.toLowerCase().trim());
  if (existing) return existing;

  const newQA: AnsweredLegalQA = {
    id: `qna_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: currentUser?.uid,
    isOwnerPrivate: isOwner,
    question: question.trim(),
    askedByVisitor: askedByVisitor || (isOwner ? 'Abbaa App (Ayele)' : 'User Query'),
    category,
    answerContent,
    referencedStatutes: referencedStatutes.length > 0 ? referencedStatutes : ['Seera Hojiirra Jiru / Active Law'],
    referencedCassations,
    timestamp: new Date().toISOString().split('T')[0],
    isVerifiedByExpert: true,
    upvotesCount: 1,
  };

  const updated = [newQA, ...current];
  saveAnsweredQAsToStorage(updated);

  if (db) {
    try {
      setDoc(doc(db, isOwner ? 'owner_private_qna' : 'legal_qna_repository', newQA.id), newQA);
    } catch (e) {
      console.log('Firestore Q&A sync notice:', e);
    }
  }

  return newQA;
}

export function saveLegalInterpretation(data: { query: string; interpretation: string; createdAt?: string }): AnsweredLegalQA {
  return autoArchiveAnsweredLegalQA(
    data.query,
    {
      om: data.interpretation,
      am: data.interpretation,
      en: data.interpretation,
    },
    ['Cassation Bench Precedent & Statutory Interpretation'],
    [],
    'general',
    'Expert Reviewer'
  );
}
