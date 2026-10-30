import React, { useMemo, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getWorkflowCases, WorkflowCaseRecord } from '../services/legalWorkflowService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CaseloadDistributionChartProps {
  institutionId: string;
}

export const CaseloadDistributionChart: React.FC<CaseloadDistributionChartProps> = ({ institutionId }) => {
  const cases = getWorkflowCases(institutionId);
  const [threshold, setThreshold] = useState(10);
  const chartRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const activeCases = cases.filter(c => c.status === 'in_progress');
    const distribution: Record<string, { count: number; processingTimes: number[] }> = {};

    activeCases.forEach(c => {
      if (!distribution[c.bench]) {
        distribution[c.bench] = { count: 0, processingTimes: [] };
      }
      distribution[c.bench].count += 1;
      const start = new Date(c.startedAt).getTime();
      const end = new Date().getTime();
      distribution[c.bench].processingTimes.push(end - start);
    });

    return Object.entries(distribution).map(([bench, { count, processingTimes }]) => ({
      bench,
      count,
      avgTimeDays: Math.floor((processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) / (1000 * 60 * 60 * 24))
    }));
  }, [cases]);

  const exportToPDF = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      pdf.text('Caseload Distribution Report', 10, 10);
      pdf.addImage(imgData, 'PNG', 10, 20, 180, 100);
      pdf.save('caseload_report.pdf');
    }
  };

  if (data.length === 0) return <div className="p-4 text-xs text-slate-400">No active case data for visualization.</div>;

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl" ref={chartRef}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xs font-semibold text-white">Caseload Distribution by Bench</h4>
        <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-400">Threshold:</label>
            <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-10 bg-slate-800 text-white text-[10px] p-1 rounded" />
            <button onClick={exportToPDF} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded">Export PDF</button>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="bench" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', fontSize: '10px' }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(value: any, name: any) => [
                  name === 'count' ? value : `${value} days`, 
                  name === 'count' ? 'Active Cases' : 'Avg Time'
              ]}
            />
            <Bar dataKey="count" onClick={(data: any) => console.log('Filtering cases for bench:', data?.activePayload?.[0]?.payload?.bench || data?.bench)}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.count > threshold ? '#ef4444' : '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-[10px] text-slate-400">
        * Red indicates potential bottleneck ({'>'}{threshold} active cases).
      </div>
    </div>
  );
};
