export interface FilingDeadline {
  id: string;
  caseTitle: string;
  caseNumber: string;
  courtName: string;
  courtroom: string;
  judgeName: string;
  deadlineDate: string; // ISO string e.g. "2026-10-25T10:00:00"
  description: string;
  notified48h?: boolean;
  notified24h?: boolean;
}

const STORAGE_KEY = 'seera_filing_deadlines_v1';

export function getSavedDeadlines(): FilingDeadline[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed default deadline for demonstration
      const defaultDeadlines: FilingDeadline[] = [
        {
          id: 'deadline_demo_1',
          caseTitle: 'Obbo Kabbadaa c. Dhaabbata Abbaa Biyyee',
          caseNumber: 'OR/CASS/8892/18',
          courtName: 'Mana Murtii Waliigalaa Oromiyaa (Cassation)',
          courtroom: 'Dhaddacha 4ffaa',
          judgeName: 'Obbo Abbabaa Balaay',
          deadlineDate: new Date(Date.now() + 36 * 3600 * 1000).toISOString(), // 36 hours from now
          description: 'Iyyata Ol-iyyannoo fi Qabxii Falmii dhiyeessuu (Statement of Appeal)',
        },
        {
          id: 'deadline_demo_2',
          caseTitle: 'Addee Saaraa c. Baankii Daldala Itoophiyaa',
          caseNumber: 'FED/HIGH/10293/17',
          courtName: 'Mana Murtii Federaalaa (High Court)',
          courtroom: 'Civil Bench 2',
          judgeName: 'W/ro Almaaz Gabree',
          deadlineDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(), // 5 days from now
          description: 'Deebii Iyyannoo (Statement of Defense)',
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDeadlines));
      return defaultDeadlines;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDeadlines(deadlines: FilingDeadline[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deadlines));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function triggerDesktopNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.png',
      });
    } catch (e) {
      console.warn('Desktop notification failed:', e);
    }
  }
}

export function initFilingReminderWorker() {
  if (typeof window === 'undefined') return;

  // Check every 60 seconds
  const interval = setInterval(async () => {
    const deadlines = getSavedDeadlines();
    const now = Date.now();
    let updated = false;

    const newDeadlines = deadlines.map((d) => {
      const targetTime = new Date(d.deadlineDate).getTime();
      const diffHours = (targetTime - now) / (1000 * 60 * 60);

      // 48 hours check (between 47.5 and 48.5 hours)
      if (diffHours > 47 && diffHours <= 49 && !d.notified48h) {
        requestNotificationPermission().then((granted) => {
          if (granted) {
            triggerDesktopNotification(
              `⚠️ Akeekkachiisa Beellama (48 Hours Left)`,
              `Galmee: ${d.caseTitle}\nMannii Murtii: ${d.courtName}\nSa'aatiin hafe: Sa'aatii 48 keessatti xumuramu qaba!`
            );
          }
        });
        return { ...d, notified48h: true };
      }

      // 24 hours check (between 23.5 and 25 hours)
      if (diffHours > 23 && diffHours <= 25 && !d.notified24h) {
        requestNotificationPermission().then((granted) => {
          if (granted) {
            triggerDesktopNotification(
              `🚨 BEELLAMA ARIITII (24 Hours Left)!`,
              `Galmee: ${d.caseTitle}\nMannii Murtii: ${d.courtName}\nBeellamni boru ga'a! Sanada qopheessaa.`
            );
          }
        });
        return { ...d, notified24h: true };
      }

      return d;
    });

    if (updated || JSON.stringify(deadlines) !== JSON.stringify(newDeadlines)) {
      saveDeadlines(newDeadlines);
    }
  }, 60000);

  return () => clearInterval(interval);
}
