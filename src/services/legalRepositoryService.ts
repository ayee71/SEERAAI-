import { useState, useEffect } from 'react';

export interface Statute {
  id: string;
  title: string;
  content: string; // Markdown content
  date: string;
}

const STORAGE_KEY = 'offline_statutes_repo';

// In a real app, this would fetch from an API
export const fetchLatestStatutes = async (): Promise<Statute[]> => {
  // Simulating API call
  return [
    {
      id: '1',
      title: 'Seera Deemsa Falmii Yakkaa (Criminal Procedure Code)',
      content: '# Seera Deemsa Falmii Yakkaa\n\nQabiyyee seeraa kan... (Markdown content)',
      date: '2026-10-14'
    },
    {
      id: '2',
      title: 'Seera Ragaa (Evidence Code)',
      content: '# Seera Ragaa\n\nQabiyyee seeraa kan... (Markdown content)',
      date: '2026-10-14'
    }
  ];
};

export const saveStatutesOffline = (statutes: Statute[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(statutes));
};

export const getOfflineStatutes = (): Statute[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const useLegalRepository = () => {
  const [statutes, setStatutes] = useState<Statute[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = getOfflineStatutes();
    setStatutes(cached);
  }, []);

  const refreshStatutes = async () => {
    setLoading(true);
    try {
      const latest = await fetchLatestStatutes();
      saveStatutesOffline(latest);
      setStatutes(latest);
    } finally {
      setLoading(false);
    }
  };

  return { statutes, loading, refreshStatutes };
};
