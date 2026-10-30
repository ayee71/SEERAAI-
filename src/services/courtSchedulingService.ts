export interface CourtHearingEvent {
  id: string;
  caseNumber: string;
  caseTitle: string;
  hearingDate: string; // YYYY-MM-DD
  hearingTime: string; // HH:MM
  courtName: string;
  bench: string;
  judgeName: string;
  hearingType: 'First Hearing' | 'Evidence Submission' | 'Witness Examination' | 'Oral Arguments' | 'Judgment Delivery' | 'Mention';
  status: 'Scheduled' | 'Notified' | 'Completed' | 'Postponed' | 'Cancelled';
  litigants: string;
  reminderSent: boolean;
  notes?: string;
  allowSelfRegistration?: boolean;
}

const STORAGE_KEY = 'seeraai_court_hearings_v1';

export function getStoredHearingEvents(): CourtHearingEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultEvents: CourtHearingEvent[] = [
        {
          id: 'hear_101',
          caseNumber: 'OR/CC/0482/2026',
          caseTitle: 'Abbaa Qabeenyaa fi Bulchiinsa Magaalaa Adaamaa',
          hearingDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          hearingTime: '09:00',
          courtName: 'Mana Murtii Waliigalaa Oromiyaa',
          bench: 'Dhaddacha Ijibbaataa',
          judgeName: 'Obbo Kabbadaa Tasfaa',
          hearingType: 'Oral Arguments',
          status: 'Scheduled',
          litigants: 'Obbo Galataa Baqqalaa vs Bulchiinsa Magaalaa',
          reminderSent: false,
          notes: 'Mandate to review expropriation compensation statutory compliance.'
        },
        {
          id: 'hear_102',
          caseNumber: 'OR/HC/1190/2025',
          caseTitle: 'Dhimma Waliigaltee Daldalaa fi Liqii',
          hearingDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
          hearingTime: '10:30',
          courtName: 'Mana Murtii Ol\'aanaa Baalee',
          bench: 'Dhaddacha Hariiroo Hawaasaa',
          judgeName: 'Aadde Siheen Mahaammad',
          hearingType: 'Evidence Submission',
          status: 'Notified',
          litigants: 'Daldalaa Roobee S.C. vs Baankii Daldalaa Itoophiyaa',
          reminderSent: true,
          notes: 'Verify bank collateral documents and witness statements.'
        }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultEvents));
      return defaultEvents;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveHearingEvent(event: Omit<CourtHearingEvent, 'id'>): CourtHearingEvent {
  const events = getStoredHearingEvents();
  const newEvent: CourtHearingEvent = {
    ...event,
    id: 'hear_' + Date.now() + Math.random().toString(36).substring(2, 6)
  };
  events.unshift(newEvent);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  return newEvent;
}

export function updateHearingStatus(id: string, status: CourtHearingEvent['status'], reminderSent?: boolean): void {
  const events = getStoredHearingEvents();
  const updated = events.map(e => {
    if (e.id === id) {
      return {
        ...e,
        status,
        reminderSent: reminderSent !== undefined ? reminderSent : e.reminderSent
      };
    }
    return e;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteHearingEvent(id: string): void {
  const events = getStoredHearingEvents();
  const filtered = events.filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
