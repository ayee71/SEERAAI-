import { OROMIA_COURTS_CATALOG, OromiaCourtNode } from '../data/courts/oromiaCourts';
import { getLocalInstitutions, CourtInstitution } from '../services/courtInstitutionService';

export interface CourtLinkDetails {
  courtId: string;
  courtName: string;
  slug: string; // e.g. "mmagurbicha"
  domainHandle: string; // e.g. "mmagurbicha.serai"
  fullHttpUrl: string; // e.g. "court://mmagurbicha.serai"
  level: 'first_instance' | 'high_court' | 'supreme_court' | 'cassation';
  zoneOrCity: string;
  seat: string;
  institutionId?: string;
}

/**
 * Generate standardized slug from court name and level
 * Examples:
 * - "Mana Murtii Aanaa Gurbicha" -> "mmagurbicha"
 * - "Mana Murtii Aanaa Adaamaa" -> "mmaadaamaa"
 * - "Mana Murtii Ol'aanaa Godina Shawaa Bahaa" -> "mmoshawaabahaa"
 * - "Mana Murtii Waliigalaa Oromiyaa" -> "mmwo"
 * - "Mana Murtii Waliigalaa Federaalaa" -> "mmwf"
 */
export const slugifyCourtName = (name: string, level?: string): string => {
  const cleanName = name.toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/mana\s+murtii/g, '')
    .replace(/aanaa/g, '')
    .replace(/ol['’]?aanaa|olaanaa/g, '')
    .replace(/godina/g, '')
    .replace(/magaalaa/g, '')
    .replace(/waliigalaa/g, '')
    .replace(/federaalaa/g, '')
    .replace(/oromiyaa/g, '')
    .replace(/bulchiinsa/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '');

  let prefix = 'mma'; // default First Instance (Mana Murtii Aanaa)
  if (level === 'high_court' || name.toLowerCase().includes('ol\'aanaa') || name.toLowerCase().includes('olaanaa') || name.toLowerCase().includes('high')) {
    prefix = 'mmo';
  } else if (level === 'supreme_court' || name.toLowerCase().includes('oromiyaa') && name.toLowerCase().includes('supreme')) {
    prefix = 'mmwo';
  } else if (level === 'cassation' || name.toLowerCase().includes('federaalaa') || name.toLowerCase().includes('ijibbaata')) {
    prefix = 'mmwf';
  }

  const slug = `${prefix}${cleanName}`;
  return slug || `mma${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Get full court link payload for any court node or institution
 */
export const getCourtLinkDetails = (court: {
  id: string;
  name: string;
  customCourtName?: string;
  level?: string;
  courtLevel?: string;
  zoneOrCity?: string;
  seat?: string;
}): CourtLinkDetails => {
  const nameToUse = court.customCourtName || court.name;
  const levelToUse = (court.courtLevel || court.level || 'first_instance') as 'first_instance' | 'high_court' | 'supreme_court' | 'cassation';
  const slug = slugifyCourtName(nameToUse, levelToUse);
  const domainHandle = `${slug}.serai`;
  
  return {
    courtId: court.id,
    courtName: nameToUse,
    slug,
    domainHandle,
    fullHttpUrl: `court://${domainHandle}`,
    level: levelToUse,
    zoneOrCity: court.zoneOrCity || 'Oromiyaa',
    seat: court.seat || 'Center',
    institutionId: court.id
  };
};

/**
 * GetAllCourtLinks Registry - Combines catalog and dynamic institutions
 */
export const getAllCourtLinks = (): CourtLinkDetails[] => {
  const linksMap = new Map<string, CourtLinkDetails>();

  // 1. Load from OROMIA_COURTS_CATALOG
  OROMIA_COURTS_CATALOG.forEach(c => {
    const details = getCourtLinkDetails({
      id: c.id,
      name: c.name,
      level: c.level === 'first_instance' ? 'first_instance' : c.level === 'high_court' ? 'high_court' : c.level === 'supreme_court' ? 'supreme_court' : 'cassation',
      zoneOrCity: c.zoneOrCity,
      seat: c.seat
    });
    linksMap.set(details.slug, details);
  });

  // Add specific sample like Mana Murtii Aanaa Gurbicha explicitly if not present
  if (!linksMap.has('mmagurbicha')) {
    linksMap.set('mmagurbicha', {
      courtId: 'inst_gurbicha_woreda_first',
      courtName: 'Mana Murtii Aanaa Gurbicha',
      slug: 'mmagurbicha',
      domainHandle: 'mmagurbicha.serai',
      fullHttpUrl: 'court://mmagurbicha.serai',
      level: 'first_instance',
      zoneOrCity: 'Buno Baddallee (Buno Bedele)',
      seat: 'Gurbicha / Bedele',
      institutionId: 'inst_gurbicha_woreda_first'
    });
  }

  // 2. Load from saved institutions in local storage / Firestore
  try {
    const insts = getLocalInstitutions();
    insts.forEach(inst => {
      const details = getCourtLinkDetails(inst);
      linksMap.set(details.slug, details);
    });
  } catch (e) {
    console.warn('Could not load local court institutions for links:', e);
  }

  return Array.from(linksMap.values());
};

/**
 * Resolve input court link string to matching CourtLinkDetails
 * Accepts: "court://mmagurbicha.serai", "mmagurbicha.serai", "mmagurbicha", "gurbicha", "mmagurbicha/login"
 */
export const resolveCourtLink = (input: string): CourtLinkDetails | null => {
  if (!input || !input.trim()) return null;

  let cleaned = input.trim().toLowerCase()
    .replace(/^court:\/\//, '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.serai$/, '');

  const allLinks = getAllCourtLinks();

  // Exact match on slug
  let match = allLinks.find(l => l.slug === cleaned);
  if (match) return match;

  // Fuzzy match on court name or slug inclusion
  match = allLinks.find(l => 
    l.slug.includes(cleaned) || 
    l.courtName.toLowerCase().includes(cleaned) ||
    cleaned.includes(l.slug)
  );

  if (match) return match;

  // Fallback dynamic generator if user typed a new custom court link like "mmagurbicha"
  if (cleaned.length >= 3) {
    const slug = cleaned.startsWith('mma') || cleaned.startsWith('mmo') || cleaned.startsWith('mmw') ? cleaned : `mma${cleaned}`;
    return {
      courtId: `inst_${slug}`,
      courtName: `Mana Murtii ${cleaned.toUpperCase()}`,
      slug,
      domainHandle: `${slug}.serai`,
      fullHttpUrl: `http://${slug}.serai`,
      level: 'first_instance',
      zoneOrCity: 'Oromiyaa',
      seat: cleaned,
      institutionId: `inst_${slug}`
    };
  }

  return null;
};
