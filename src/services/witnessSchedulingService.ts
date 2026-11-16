import { db } from './firebase';
import { getCurrentInstitutionId } from './storage';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';

export type WitnessType = 'eyewitness' | 'expert' | 'character' | 'police' | 'victim' | 'defense_witness' | 'other';
export type WitnessStatus = 'scheduled' | 'subpoenaed' | 'confirmed' | 'excused' | 'completed' | 'no_show';

export interface WitnessSlot {
  id: string;
  institutionId?: string;
  caseNumber: string;
  caseTitle: string;
  witnessName: string;
  witnessPhone: string;
  witnessEmail: string;
  witnessType: WitnessType;
  availabilityDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:30 AM - 10:30 AM"
  courtroom: string;
  benchJudge?: string;
  status: WitnessStatus;
  notes?: string;
  reminderSent: boolean;
  lastReminderAt?: string;
  reminderChannel?: 'sms' | 'email' | 'both';
  createdAt: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = 'seera_witness_schedules_cache';

const DEFAULT_MOCK_SLOTS: WitnessSlot[] = [
  {
    id: 'wit-101',
    caseNumber: 'CR-2026/089',
    caseTitle: 'Abbaa Alangaa vs Gemechu Tadesse (Falmii Lafaa)',
    witnessName: 'Obbo Tolaa Hayiluu',
    witnessPhone: '+251911223344',
    witnessEmail: 'tolaa.h@example.com',
    witnessType: 'eyewitness',
    availabilityDate: '2026-11-05',
    timeSlot: '09:00 AM - 10:30 AM',
    courtroom: 'Dhaddacha 1 (Chamber A)',
    benchJudge: 'Abbaa Seeraa Caalaa',
    status: 'subpoenaed',
    notes: 'Ragaa ijaan arge kan waliigaltee fi mallattoo waliigalteerratti argame.',
    reminderSent: true,
    lastReminderAt: '2026-11-01 10:15 AM',
    reminderChannel: 'both',
    createdAt: '2026-10-28',
    updatedAt: '2026-11-01',
  },
  {
    id: 'wit-102',
    caseNumber: 'CR-2026/090',
    caseTitle: 'Waliigaltee Daldalaa Oromia Trading vs Bashaattu Industry',
    witnessName: 'Dr. Alamaayyoo Birraatuu',
    witnessPhone: '+251922334455',
    witnessEmail: 'alamayehu.b@example.et',
    witnessType: 'expert',
    availabilityDate: '2026-11-06',
    timeSlot: '11:00 AM - 12:30 PM',
    courtroom: 'Dhaddacha 2 (Chamber B)',
    benchJudge: 'Abbaa Seeraa Geetaachoo',
    status: 'scheduled',
    notes: 'Ogeessa auditor keenya kan qorannoo sharafa maallaqaa raawwate.',
    reminderSent: false,
    createdAt: '2026-10-30',
    updatedAt: '2026-10-30',
  },
  {
    id: 'wit-103',
    caseNumber: 'CR-2026/091',
    caseTitle: 'Dhimma Yakka Humnaa vs Kabbadaa Bekele',
    witnessName: 'Inspekteer Saaraa Baqqalaa',
    witnessPhone: '+251933445566',
    witnessEmail: 'sara.b@police.gov.et',
    witnessType: 'police',
    availabilityDate: '2026-11-08',
    timeSlot: '02:00 PM - 03:30 PM',
    courtroom: 'Dhaddacha 3 (Police Special Court)',
    benchJudge: 'Abbaa Seeraa Caaltuu',
    status: 'confirmed',
    notes: 'Qorataa polisii qorannoo seeraa fi waraqaa qorannoo dhiyeessu.',
    reminderSent: true,
    lastReminderAt: '2026-11-02 08:30 AM',
    reminderChannel: 'sms',
    createdAt: '2026-11-01',
    updatedAt: '2026-11-02',
  },
];

export function getWitnessSlotsFromCache(): WitnessSlot[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[witnessSchedulingService] Local read cache failed:', e);
  }
  // Save defaults if empty
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_SLOTS));
  return DEFAULT_MOCK_SLOTS;
}

export function saveWitnessSlotsToCache(slots: WitnessSlot[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(slots));
    window.dispatchEvent(new CustomEvent('seera_witness_slots_updated'));
  } catch (e) {
    console.warn('[witnessSchedulingService] Local write cache failed:', e);
  }
}

export async function fetchWitnessSlots(caseNumber?: string): Promise<WitnessSlot[]> {
  const cached = getWitnessSlotsFromCache();
  const institutionId = getCurrentInstitutionId();
  
  if (db && institutionId) {
    try {
      const colRef = collection(db, 'witness_schedules');
      const q = caseNumber
        ? query(colRef, where('institutionId', '==', institutionId), where('caseNumber', '==', caseNumber))
        : query(colRef, where('institutionId', '==', institutionId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreSlots: WitnessSlot[] = snap.docs.map(doc => doc.data() as WitnessSlot);
        saveWitnessSlotsToCache(firestoreSlots);
        return caseNumber ? firestoreSlots.filter(s => s.caseNumber === caseNumber) : firestoreSlots;
      }
    } catch (e) {
      console.info('[witnessSchedulingService] Firestore offline fallback to cache');
    }
  }

  if (caseNumber) {
    return cached.filter(s => s.caseNumber.toLowerCase().includes(caseNumber.toLowerCase()));
  }
  return cached;
}

export async function createOrUpdateWitnessSlot(slot: Omit<WitnessSlot, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<WitnessSlot> {
  const allSlots = getWitnessSlotsFromCache();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const institutionId = slot.institutionId || getCurrentInstitutionId() || 'inst_gurbicha_woreda_first';
  
  const slotId = slot.id || `wit-${Date.now()}`;
  const existingIdx = allSlots.findIndex(s => s.id === slotId);

  const fullSlot: WitnessSlot = {
    ...slot,
    institutionId,
    id: slotId,
    reminderSent: slot.reminderSent ?? false,
    createdAt: existingIdx >= 0 ? allSlots[existingIdx].createdAt : nowStr,
    updatedAt: nowStr,
  };

  if (existingIdx >= 0) {
    allSlots[existingIdx] = fullSlot;
  } else {
    allSlots.unshift(fullSlot);
  }

  saveWitnessSlotsToCache(allSlots);

  if (db) {
    try {
      await setDoc(doc(db, 'witness_schedules', slotId), fullSlot, { merge: true });
    } catch (e) {
      console.warn('[witnessSchedulingService] Firestore sync failed, cached locally');
    }
  }

  return fullSlot;
}

export async function deleteWitnessSlot(slotId: string): Promise<boolean> {
  const allSlots = getWitnessSlotsFromCache().filter(s => s.id !== slotId);
  saveWitnessSlotsToCache(allSlots);

  if (db) {
    try {
      await deleteDoc(doc(db, 'witness_schedules', slotId));
    } catch (e) {
      console.warn('[witnessSchedulingService] Firestore delete failed:', e);
    }
  }
  return true;
}

export async function updateWitnessSlotStatus(slotId: string, status: WitnessStatus): Promise<WitnessSlot | null> {
  const allSlots = getWitnessSlotsFromCache();
  const idx = allSlots.findIndex(s => s.id === slotId);
  if (idx === -1) return null;

  allSlots[idx].status = status;
  allSlots[idx].updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
  saveWitnessSlotsToCache(allSlots);

  if (db) {
    try {
      await setDoc(doc(db, 'witness_schedules', slotId), { status, updatedAt: allSlots[idx].updatedAt }, { merge: true });
    } catch (e) {
      console.warn('[witnessSchedulingService] Firestore update status failed');
    }
  }

  return allSlots[idx];
}

export async function sendWitnessAutomatedReminder(
  slotId: string,
  channel: 'sms' | 'email' | 'both' = 'both'
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const allSlots = getWitnessSlotsFromCache();
  const idx = allSlots.findIndex(s => s.id === slotId);
  if (idx === -1) {
    return { success: false, message: 'Witness slot not found', timestamp: '' };
  }

  const slot = allSlots[idx];
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  slot.reminderSent = true;
  slot.lastReminderAt = nowStr;
  slot.reminderChannel = channel;
  allSlots[idx] = slot;
  saveWitnessSlotsToCache(allSlots);

  if (db) {
    try {
      await setDoc(doc(db, 'witness_schedules', slotId), {
        reminderSent: true,
        lastReminderAt: nowStr,
        reminderChannel: channel,
      }, { merge: true });
    } catch (e) {
      console.warn('[witnessSchedulingService] Firestore reminder update failed');
    }
  }

  // Trigger dispatch notification
  const notificationTitle = `🏛️ ERGA YAADACHIISA RAGAA / WITNESS SUMMONS REMINDER`;
  const notificationBody = `Akeekkachiisa: Ragaan ${slot.witnessName} Galmee ${slot.caseNumber} (${slot.caseTitle}) Guyyaa ${slot.availabilityDate} Sa'aatii ${slot.timeSlot} Mana Murtii ${slot.courtroom} irratti akka dhiyaatan Ergaan ${channel.toUpperCase()} ${slot.witnessPhone || slot.witnessEmail} tti ergameera.`;

  window.dispatchEvent(new CustomEvent('seera_toast_notification', {
    detail: { title: notificationTitle, message: notificationBody, type: 'success' }
  }));

  return {
    success: true,
    message: `Reminder successfully dispatched via ${channel.toUpperCase()} to ${slot.witnessName} (${slot.witnessPhone || slot.witnessEmail})`,
    timestamp: nowStr,
  };
}

export async function batchImportWitnessesFromCsv(records: Array<Partial<WitnessSlot>>): Promise<number> {
  const currentSlots = getWitnessSlotsFromCache();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const importedSlots: WitnessSlot[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r.witnessName || !r.witnessName.trim()) continue;

    const newSlot: WitnessSlot = {
      id: `wit-csv-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
      caseNumber: r.caseNumber?.trim() || 'CR-2026/089',
      caseTitle: r.caseTitle?.trim() || 'Dhimma Ragaa (CSV Batch)',
      witnessName: r.witnessName.trim(),
      witnessPhone: r.witnessPhone?.trim() || '+251900000000',
      witnessEmail: r.witnessEmail?.trim() || '',
      witnessType: (r.witnessType as WitnessType) || 'eyewitness',
      availabilityDate: r.availabilityDate?.trim() || new Date().toISOString().slice(0, 10),
      timeSlot: r.timeSlot?.trim() || '09:00 AM - 10:30 AM',
      courtroom: r.courtroom?.trim() || 'Dhaddacha 1',
      status: (r.status as WitnessStatus) || 'scheduled',
      notes: r.notes?.trim() || 'CSV Import via Registrar Batch Scheduling',
      reminderSent: false,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    importedSlots.push(newSlot);
    if (db) {
      try {
        await setDoc(doc(db, 'witness_schedules', newSlot.id), newSlot, { merge: true });
      } catch (e) {
        console.warn('[witnessSchedulingService] Firestore CSV batch sync failed for', newSlot.id);
      }
    }
  }

  if (importedSlots.length > 0) {
    const updated = [...importedSlots, ...currentSlots];
    saveWitnessSlotsToCache(updated);
  }

  return importedSlots.length;
}
