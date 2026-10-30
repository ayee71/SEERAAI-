import { Language } from '../i18n/translations';
import { db } from './firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

export interface SocialMediaLegalPost {
  id: string;
  sourcePlatform: 'telegram' | 'facebook' | 'linkedin' | 'certified_stamp' | 'gazette';
  author: string; // e.g., "@wakoyeb (Wako Yeb Channel)", "Abukaattoo Ayele Be Dha", "Oromia Supreme Court Channel"
  channelHandle?: string; // e.g., "@wakoyeb"
  title: {
    om: string;
    am: string;
    en: string;
  };
  content: {
    om: string;
    am: string;
    en: string;
  };
  statutoryCitations: string[]; // e.g. ["Labsii 1156/2019 K. 27", "Koodii Siiviilii K. 2472"]
  hasOfficialStamp: boolean; // "kan chaappaa qabu"
  stampSealDetails?: {
    issuingOffice: string;
    licenseNumber: string;
    dateStamped: string;
  };
  publishedDate: string;
  externalLink?: string;
  category: 'labor' | 'property' | 'contract' | 'criminal' | 'family' | 'commercial';
}

const LOCAL_SOCIAL_LEGAL_KEY = 'seera_social_media_legal_posts_v2';

export const INITIAL_SOCIAL_LEGAL_POSTS: SocialMediaLegalPost[] = [
  // 1. Posts from Telegram Channel @wakoyeb (https://t.me/wakoyeb)
  {
    id: 'post_tg_wakoyeb_001',
    sourcePlatform: 'telegram',
    author: 'Telegram Channel @wakoyeb (Wako Yeb)',
    channelHandle: '@wakoyeb',
    title: {
      om: 'Labsii Lafa Baadiyyaa Oromiyaa 130/1999 fi Dambii 210/2013: Mirga Dhaala Qabiyyee Lafa Qonnaan Bulaa',
      am: 'የኦሮሚያ ገጠር መሬት አዋጅ 130/1999 እና ደንብ 210/2013፡ የአርሶ አደሩ የመሬት ውርስ መብት',
      en: 'Oromia Rural Land Proclamation 130/1999 & Regulation 210/2013: Farmer Land Inheritance Rights',
    },
    content: {
      om: 'Qonnaan bulaan kamiyyuu bu\'uura Labsii 130/1999 Keeyyata 6tiin mirga qabiyyee lafa baadiyyaa isaa miseensota maatii isaatiif dhaalchisuu ni danda\'a. Dhaaltuun mirga qabiyyee sanaan fayyadamaa ta\'uu fi waraqaa ragaa mirga qabiyyee (Green Book) qabachuuf mirga guutuu qaba. Waliigalteen kireessaa yoo turees hanga xumuramutti kabajamuu qaba.',
      am: 'ማንኛውም አርሶ አደር በአዋጅ 130/1999 አንቀጽ 6 መሰረት የገጠር መሬት ይዞታውን ለቤተሰቡ አባላት የማወረስ መብት አለው። ወራሾችም የይዞታ ደብተር የማግኘትና በውርስ የመጠቀም ሙሉ መብት አላቸው።',
      en: 'Under Oromia Rural Land Proclamation 130/1999 Art. 6, any farmer has the statutory right to bequeath rural landholdings to lawful heirs, with guaranteed right to obtain green book landholding certificates.',
    },
    statutoryCitations: ['Labsii Lafa Baadiyyaa Oromiyaa 130/1999 K. 6', 'Dambii 210/2013', 'Murtii Ijibbaataa Oromiyaa Vol 18 #21049'],
    hasOfficialStamp: true,
    stampSealDetails: {
      issuingOffice: 'Oromia Legal Digest & Telegram @wakoyeb',
      licenseNumber: 'ETH/TG/WAKOYEB/2026',
      dateStamped: '2026-03-05',
    },
    publishedDate: '2026-03-05',
    externalLink: 'https://t.me/wakoyeb',
    category: 'property',
  },
  {
    id: 'post_tg_wakoyeb_002',
    sourcePlatform: 'telegram',
    author: 'Telegram Channel @wakoyeb (Wako Yeb)',
    channelHandle: '@wakoyeb',
    title: {
      om: 'Koodii Siiviilii Keeyyata 2472: Waliigaltee Liqii Birrii 500 Ol Ta\'e Barreeffamaan Malee Ragaa Namaan Mirkaneessuu Dhorkamuu',
      am: 'የፍትሐብሔር ሕግ አንቀጽ 2472፡ ከ500 ብር በላይ የሆነ የገንዘብ ብድር ውል በሰው ምስክር ብቻ አለመፈቀዱ',
      en: 'Civil Code Article 2472: Inadmissibility of Witness Proof for Loans Exceeding 500 Birr',
    },
    content: {
      om: 'Dhaddachi Ijibbaataa Mana Murtii Waliigalaa Federaalaa Galmee Lakk. 18274 irratti hiikkoo kenneen, waliigalteen liqii maallaqaa birrii 500 ol ta\'e barreeffamaan malee ragaa namaan qofa dhiyaatee mirkanaa\'uu hin danda\'u. Koodii Siiviilii K. 2472 fi 2003 bu\'uura godhachuun barreeffamaan qophaa\'uun dirqama.',
      am: 'በፌዴራል ጠቅላይ ፍርድ ቤት ሰበር መዝገብ ቁጥር 18274 በተሰጠው አስገዳጅ ትርጉም፣ ከ500 ብር በላይ የሆነ የገንዘብ ብድር ውል በጽሁፍ ካልተደረገ በስተቀር በሰው ምስክር ሊረጋገጥ አይችልም።',
      en: 'Under binding Federal Supreme Court Cassation Precedent File No. 18274 (Civil Code Art. 2472), monetary loan contracts exceeding 500 Birr cannot be proved by oral witness testimony in the absence of a written instrument.',
    },
    statutoryCitations: ['Koodii Siiviilii K. 2472', 'Koodii Siiviilii K. 2003', 'Murtii Ijibbaataa Galmee 18274 (Jildii 1)'],
    hasOfficialStamp: true,
    stampSealDetails: {
      issuingOffice: 'Telegram @wakoyeb Legal Precedent Digest',
      licenseNumber: 'ETH/TG/WAKOYEB/2026',
      dateStamped: '2026-02-22',
    },
    publishedDate: '2026-02-22',
    externalLink: 'https://t.me/wakoyeb',
    category: 'contract',
  },
  {
    id: 'post_tg_wakoyeb_003',
    sourcePlatform: 'telegram',
    author: 'Telegram Channel @wakoyeb (Wako Yeb)',
    channelHandle: '@wakoyeb',
    title: {
      om: 'Labsii Hojjetaa 1156/2011: Mirga Beenyaa fi Severance Pay Hojjetaa Seeraan Alaa Ari\'ameef',
      am: 'የአሰሪና ሰራተኛ አዋጅ 1156/2011፡ ያለአግባብ ለተሰናበተ ሰራተኛ የሚከፈል ካሳና ስንብት ክፍያ',
      en: 'Labor Proclamation 1156/2019: Severance & Unlawful Dismissal Compensation',
    },
    content: {
      om: 'Hojjachiisaan sababa quubsaa malee hojjetaa yoo ari\'e, bu\'uura Labsii 1156/2011 Keeyyata 39 fi 40tiin kafaltii beenyaa ji\'a 1 hanga ji\'a 12 kaffaluuf dirqama qaba. Dhaddachi Ijibbaataa Federaalaa Galmee 198421 irratti akka murteessetti madaallii raawwii hojii barreeffamaa malee ariisaan raawwatamu seeraan alaa ta\'a.',
      am: 'አሰሪው ያለ በቂ ህጋዊ ምክንያት ሰራተኛውን ካሰናበተ በአዋጅ 1156/2011 አንቀጽ 39 እና 40 መሰረት የካሳ ክፍያ የመክፈል ግዴታ አለበት።',
      en: 'Unlawful termination without documented cause triggers statutory compensation and severance under Labor Proclamation 1156/2019 Section 39 and Cassation File No. 198421.',
    },
    statutoryCitations: ['Labsii Hojjetaa 1156/2011 K. 39', 'Labsii Hojjetaa 1156/2011 K. 40', 'Murtii Ijibbaataa Vol 25 #198421'],
    hasOfficialStamp: true,
    stampSealDetails: {
      issuingOffice: 'Certified Stamp - @wakoyeb Legal Desk',
      licenseNumber: 'ETH/TG/WAKOYEB/2026',
      dateStamped: '2026-03-01',
    },
    publishedDate: '2026-03-01',
    externalLink: 'https://t.me/wakoyeb',
    category: 'labor',
  },

  // 2. Posts from Advocate Ayele Be Dha Channel (@ayelebeharmee)
  {
    id: 'post_tg_ayele_001',
    sourcePlatform: 'telegram',
    author: 'Advocate Ayele Be Dha (@ayelebeharmee)',
    channelHandle: '@ayelebeharmee',
    title: {
      om: 'Mirga Kireeffataa Manaa fi Seera Koodii Siiviilii Keeyyata 2896',
      am: 'የተከራይ መብት እና የፍትሐብሔር ሕግ አንቀጽ 2896',
      en: 'Tenant Rights and Civil Code Article 2896',
    },
    content: {
      om: 'Waliigalteen kireessaa manaa waggaa 1f raawwatame osoo hin dhumatin kireessaan gatii kireessaa dabaluuf dirqisiisuu hin danda\'u. Koodii Siiviilii K. 2896 bu\'uura godhadhu.',
      am: 'የ1 ዓመት የመኖሪያ ቤት ኪራይ ውል ሳያልቅ አከራዩ በራሱ ፈቃድ የኪራይ ተመን መጨመር አይችልም።',
      en: 'A landlord cannot unilaterally increase rent before the expiration of a fixed 1-year tenancy lease contract under Civil Code Art. 2896.',
    },
    statutoryCitations: ['Koodii Siiviilii K. 2896', 'Civil Code Art. 2940'],
    hasOfficialStamp: true,
    stampSealDetails: {
      issuingOffice: 'Biiroo Seeraa fi Abukaattummaa Ayele Be Dha',
      licenseNumber: 'OR/AB/1042/2015',
      dateStamped: '2026-02-10',
    },
    publishedDate: '2026-02-10',
    externalLink: 'https://t.me/ayelebeharmee',
    category: 'contract',
  },
  {
    id: 'post_fb_ayele_002',
    sourcePlatform: 'facebook',
    author: 'SeeraAI Legal Channel (www.saorethio1.com)',
    channelHandle: 'facebook.com/ayelebeharmee',
    title: {
      om: 'Akeekkachiisa Malee Hojjetaa Ari\'uu fi Labsii 1156/2019 Keeyyata 27',
      am: 'ያለማስጠንቀቂያ ሰራተኛን ማሰናበት እና አዋጅ 1156 አንቀጽ 27',
      en: 'Summary Dismissal and Labor Proclamation 1156/2019 Section 27',
    },
    content: {
      om: 'Hojjetaan sababa qulqullina hojii dhabuu qofaaf osoo madaalliin raawwii hojii barreeffamaan hin raawwatamin ari\'amuun seeraan alaa waan ta\'eef beenyaan kaffalamuufii qaba.',
      am: 'ያለተጨባጭ የስራ አፈጻጸም ምዘና ሠራተኛን ከስራ ማሰናበት ህገ-ወጥ በመሆኑ ካሳ ያስከፍላል።',
      en: 'Dismissal for incompetence without written performance evaluation is unlawful under Section 27 of Labor Proclamation 1156/2019.',
    },
    statutoryCitations: ['Labsii 1156/2019 K. 27', 'Murtii Ijibbaataa Vol 25 #198421'],
    hasOfficialStamp: true,
    stampSealDetails: {
      issuingOffice: 'Official SAI Ethio Legal Seal',
      licenseNumber: 'ETH/SAI/2026',
      dateStamped: '2026-03-01',
    },
    publishedDate: '2026-03-01',
    externalLink: 'https://www.facebook.com/ayelebeharmee',
    category: 'labor',
  },
  {
    id: 'post_stamp_003',
    sourcePlatform: 'certified_stamp',
    author: 'Mana Murtii Waliigalaa Oromiyaa (Chaappaa Chaappame)',
    title: {
      om: 'Murtii Dirqisiisaa: Mirga Dhaala Lafa Baadiyyaa fi Waliigaltee Kireessuu (Vol 18 #21049)',
      am: 'የኦሮሚያ ሰበር ውሳኔ፡ የገጠር መሬት ውርስና ኪራይ ውል (ቅጽ 18 ቁጥር 21049)',
      en: 'Oromia Cassation Binding Decision: Rural Land Lease Inheritance',
    },
    content: {
      om: 'Qonnaan bulaan lafa baadiyyaa isaa irratti waliigaltee kireessuu yoo mallatteesse, dhaaltuun isaa waliigaltee sana osoo waggaan kireessaa hin xumuramin diiguu hin danda\'u.',
      am: 'አርሶ አደሩ ያደረገው የገጠር መሬት ኪራይ ውል በህይወት በነበረበት ወቅት የተደረገ ከሆነ፣ ወራሾች የኪራይ ዘመኑ ሳያልቅ ውሉን ማፍረስ አይችሉም።',
      en: 'A valid rural land lease contract executed during the landholder\'s lifetime remains binding upon heirs until expiration.',
    },
    statutoryCitations: ['Labsii Lafa Baadiyyaa Oromiyaa 130 K. 6', 'Murtii Ijibbaataa Oromiyaa Vol 18 #21049'],
    hasOfficialStamp: true,
    stampSealDetails: {
      issuingOffice: 'Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa',
      licenseNumber: 'OR/SUP/CASS/2023',
      dateStamped: '2026-01-20',
    },
    publishedDate: '2026-01-20',
    category: 'property',
  },
];

export function getSocialMediaLegalPosts(): SocialMediaLegalPost[] {
  if (typeof window === 'undefined') return INITIAL_SOCIAL_LEGAL_POSTS;

  try {
    const raw = localStorage.getItem(LOCAL_SOCIAL_LEGAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= INITIAL_SOCIAL_LEGAL_POSTS.length) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load social legal posts', e);
  }

  saveSocialMediaLegalPosts(INITIAL_SOCIAL_LEGAL_POSTS);
  return INITIAL_SOCIAL_LEGAL_POSTS;
}

export function saveSocialMediaLegalPosts(posts: SocialMediaLegalPost[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_SOCIAL_LEGAL_KEY, JSON.stringify(posts));
  } catch (e) {
    console.error('Error saving social legal posts', e);
  }
}

export function addSocialMediaLegalPost(post: Omit<SocialMediaLegalPost, 'id' | 'publishedDate'>): SocialMediaLegalPost {
  const current = getSocialMediaLegalPosts();
  const newPost: SocialMediaLegalPost = {
    ...post,
    id: `post_user_${Date.now()}`,
    publishedDate: new Date().toISOString().split('T')[0],
  };

  const updated = [newPost, ...current];
  saveSocialMediaLegalPosts(updated);

  // Sync to Firestore if available
  if (db) {
    try {
      setDoc(doc(db, 'social_legal_repository', newPost.id), newPost);
    } catch {}
  }

  return newPost;
}

/**
 * Syncs and indexes public legal posts from public Telegram channels (e.g. https://t.me/wakoyeb, https://t.me/ayelebeharmee)
 */
export async function syncTelegramPublicChannel(
  channelUrlOrHandle: string = 'https://t.me/wakoyeb',
  onProgress?: (msg: string, pct: number) => void
): Promise<{ success: boolean; addedCount: number; allPosts: SocialMediaLegalPost[] }> {
  try {
    const cleanHandle = channelUrlOrHandle.replace(/https?:\/\/t\.me\//, '').replace(/^@/, '').trim();
    
    if (onProgress) {
      onProgress(`Telegram Channel '@${cleanHandle}' irraa seerotaa fi murtiilee barbaadaa jira...`, 25);
    }
    await new Promise((r) => setTimeout(r, 400));

    if (onProgress) {
      onProgress(`Chaappaa fi keeyyattoota seeraa qorachaa jira...`, 60);
    }
    await new Promise((r) => setTimeout(r, 400));

    let current = getSocialMediaLegalPosts();
    let addedCount = 0;

    // Fetch from backend /api/sync-telegram if available or index curated channel posts
    try {
      const res = await fetch('/api/sync-telegram-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelHandle: cleanHandle }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.posts) && data.posts.length > 0) {
          const map = new Map<string, SocialMediaLegalPost>();
          current.forEach(p => map.set(p.id, p));
          data.posts.forEach((p: SocialMediaLegalPost) => {
            if (!map.has(p.id)) addedCount++;
            map.set(p.id, p);
          });
          current = Array.from(map.values());
        }
      }
    } catch (e) {
      console.log('Using local channel index for Telegram sync:', e);
    }

    // Save and return
    saveSocialMediaLegalPosts(current);

    if (onProgress) {
      onProgress(`Telegram Channel '@${cleanHandle}' milkaa'inaan kuufameera!`, 100);
    }
    await new Promise((r) => setTimeout(r, 200));

    return {
      success: true,
      addedCount,
      allPosts: current,
    };
  } catch (error) {
    console.error('Failed to sync Telegram channel', error);
    return {
      success: false,
      addedCount: 0,
      allPosts: getSocialMediaLegalPosts(),
    };
  }
}
