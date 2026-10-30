import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, BarChart3 } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const VectorSearchStats: React.FC = () => {
  const [stats, setStats] = useState({ count: 0, avgSize: 0 });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const coll = collection(db, 'vector_chunks');
      const snapshot = await getDocs(coll);
      
      let totalSize = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.embedding && Array.isArray(data.embedding)) {
            totalSize += data.embedding.length;
        }
      });
      
      setStats({
        count: snapshot.size,
        avgSize: snapshot.size > 0 ? totalSize / snapshot.size : 0
      });
    } catch (e) {
      console.error('Error fetching vector stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = async () => {
    // Pipeline trigger placeholder
    alert('Ingestion pipeline triggered for missing documents.');
    await fetchStats();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Cpu className="w-4 h-4 text-purple-400" />
        Vector Search Statistics
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Indexed Documents</p>
          <p className="text-lg font-black text-white">{stats.count}</p>
        </div>
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Avg Vector Size</p>
          <p className="text-lg font-black text-white">{stats.avgSize.toFixed(0)}</p>
        </div>
        <button 
          className="p-3 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-700 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Index
        </button>
      </div>
    </div>
  );
};
