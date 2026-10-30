export interface ReferralUserStat {
  id: string;
  name: string;
  role: string;
  clicks: number;
  activeUsers: number;
  docsCreated: number;
  badge: string;
  lastActive: string;
}

export interface ReferralStatsResponse {
  isProtected?: boolean;
  message?: string;
  totalClicks: number;
  referrers: ReferralUserStat[];
  channelBreakdown: {
    facebook: number;
    telegram: number;
    whatsapp: number;
    direct: number;
  };
  recentVisits: Array<{
    referrerId: string;
    channel: string;
    time: string;
    location: string;
  }>;
  deviceBreakdown?: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  browserBreakdown?: {
    chrome: number;
    safari: number;
    firefox: number;
    edge: number;
    other: number;
    [key: string]: number | undefined;
  };
  osBreakdown?: {
    android: number;
    windows: number;
    ios: number;
    macos: number;
    linux: number;
    [key: string]: number | undefined;
  };
}

export const OWNER_ACCESS_STORAGE_KEY = 'seera_owner_admin_key';

export function getStoredOwnerKey(): string {
  try {
    return localStorage.getItem(OWNER_ACCESS_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredOwnerKey(key: string): void {
  try {
    localStorage.setItem(OWNER_ACCESS_STORAGE_KEY, key);
  } catch {}
}

export function clearStoredOwnerKey(): void {
  try {
    localStorage.removeItem(OWNER_ACCESS_STORAGE_KEY);
  } catch {}
}

export async function fetchReferralStats(adminKey?: string): Promise<ReferralStatsResponse> {
  try {
    const key = adminKey || getStoredOwnerKey() || '';
    const headers: Record<string, string> = {};
    if (key) {
      headers['x-admin-key'] = key;
    }
    const url = key ? `/api/referrals/stats?adminKey=${encodeURIComponent(key)}` : '/api/referrals/stats';
    const res = await fetch(url, { headers });
    if (!res.ok) {
      return {
        totalClicks: 0,
        referrers: [],
        channelBreakdown: { facebook: 0, telegram: 0, whatsapp: 0, direct: 0 },
        recentVisits: [],
      };
    }
    return res.json();
  } catch {
    return {
      totalClicks: 0,
      referrers: [],
      channelBreakdown: { facebook: 0, telegram: 0, whatsapp: 0, direct: 0 },
      recentVisits: [],
    };
  }
}

export async function trackReferralVisit(referrerId: string, channel?: string, visitorName?: string): Promise<void> {
  try {
    await fetch('/api/referrals/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrerId,
        channel: channel || 'direct',
        visitorName,
      }),
    });
  } catch {
    // Fail silently when offline or server API unavailable
  }
}
