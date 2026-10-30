import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { BarChart3 } from 'lucide-react';

export const CaseStageDashboard: React.FC<{ cases: any[] }> = ({ cases }) => {
  const stageCounts = cases.reduce((acc, c) => {
    const stage = c.stage || 'draft';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = [
    { name: 'Opening (Draft)', value: stageCounts.draft || 0, color: '#f59e0b' },
    { name: 'Evidence (Review)', value: stageCounts.review || 0, color: '#3b82f6' },
    { name: 'Hearing', value: stageCounts.hearing || 0, color: '#10b981' },
    { name: 'Closed', value: stageCounts.closed || 0, color: '#ef4444' },
  ];

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-amber-500" />
        Case Litigation Stages
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
            <Bar dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
