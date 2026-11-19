import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ReferenceLine
} from 'recharts';
import { MilestoneStage } from '../services/caseMilestoneService';
import { Language } from '../i18n/translations';
import { Clock, AlertTriangle, Scale, ShieldAlert, CheckCircle2, TrendingUp, Info } from 'lucide-react';

interface CaseMilestoneTimeDistributionChartProps {
  stages: MilestoneStage[];
  currentLang: Language;
  onStageSelect?: (stage: MilestoneStage) => void;
  className?: string;
}

export const CaseMilestoneTimeDistributionChart: React.FC<CaseMilestoneTimeDistributionChartProps> = ({
  stages,
  currentLang,
  onStageSelect,
  className = '',
}) => {
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const [selectedBottleneckStage, setSelectedBottleneckStage] = useState<MilestoneStage | null>(null);

  // Default duration fallbacks if not explicitly provided
  const defaultDurations: Record<string, { est: number; act: number }> = {
    '1': { est: 14, act: 8 },
    '2': { est: 7, act: 7 },
    '3': { est: 10, act: 18 }, // Bottleneck!
    '4': { est: 20, act: 29 }, // Bottleneck!
    '5': { est: 15, act: 12 },
    '6': { est: 30, act: 22 },
  };

  // Prepare chart dataset
  let cumulativeDays = 0;
  const chartData = stages.map((stg) => {
    const fallback = defaultDurations[stg.stageNumber.toString()] || { est: 14, act: 14 };
    const estDays = stg.estimatedDays || fallback.est;
    const actDays = stg.actualDays || fallback.act;
    const isOverdue = actDays > estDays || stg.status === 'flagged';
    const variance = actDays - estDays;

    cumulativeDays += actDays;

    return {
      id: stg.id,
      stageNumber: stg.stageNumber,
      shortTitle: `Stage ${stg.stageNumber}`,
      fullTitle: stg.title[currentLang] || stg.title.om,
      estimatedDays: estDays,
      actualDays: actDays,
      cumulativeDays,
      variance,
      isOverdue,
      status: stg.status,
      proceduralGrounds: stg.proceduralGrounds[currentLang] || stg.proceduralGrounds.om,
      stage: stg,
    };
  });

  // Calculate total case metrics
  const totalEstimated = chartData.reduce((acc, curr) => acc + curr.estimatedDays, 0);
  const totalActual = chartData.reduce((acc, curr) => acc + curr.actualDays, 0);
  const bottleneckCount = chartData.filter((d) => d.isOverdue).length;

  // Custom Glassmorphism Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-2 text-xs backdrop-blur-md max-w-xs font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-mono font-bold text-amber-400">
              Stage #{data.stageNumber}: {data.shortTitle}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              data.isOverdue ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {data.isOverdue ? '⚠️ Delay Bottleneck' : '✓ Normal Scale'}
            </span>
          </div>

          <h5 className="font-bold text-slate-100 font-serif-legal">{data.fullTitle}</h5>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-850">
              <span className="text-slate-500 block text-[9px]">Target Standard:</span>
              <strong className="text-slate-200">{data.estimatedDays} Days</strong>
            </div>
            <div className={`p-2 rounded-xl bg-slate-900 border ${data.isOverdue ? 'border-rose-500/40 text-rose-300' : 'border-slate-850 text-emerald-300'}`}>
              <span className="text-slate-500 block text-[9px]">Actual Elapsed:</span>
              <strong>{data.actualDays} Days</strong>
            </div>
          </div>

          {data.variance > 0 && (
            <p className="text-[10px] text-rose-400 font-mono flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>Exceeds standard target duration by +{data.variance} days</span>
            </p>
          )}

          <p className="text-[10px] text-amber-300/80 font-mono pt-1 border-t border-slate-850">
            <strong>Grounds:</strong> {data.proceduralGrounds}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5 relative overflow-hidden ${className}`}>
      {/* Background ambient radial glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white font-serif-legal">
              {isOm ? 'Xiinxala Qoodinsa Yeroo & Sakatta\'iinsa Suuka' : 'Milestone Time Distribution & Bottleneck Analytics'}
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            {isOm ? 'Xiinxala guuyyoota stage murtii seeraa qabatee suuka (bottleneck) adda baasuu' : 'Comparing statutory standard target days vs actual elapsed days across procedural stages'}
          </p>
        </div>

        {/* Total Summary Metrics Pills */}
        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-500 text-[10px] block">Target Total:</span>
            <strong className="text-amber-400">{totalEstimated} Days</strong>
          </div>
          <div className={`px-3 py-1.5 rounded-xl bg-slate-900 border ${
            totalActual > totalEstimated ? 'border-rose-500/40 text-rose-300' : 'border-emerald-500/40 text-emerald-300'
          }`}>
            <span className="text-slate-500 text-[10px] block">Actual Duration:</span>
            <strong>{totalActual} Days</strong>
          </div>
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 20, bottom: 20, left: 0 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length) {
                const clicked = e.activePayload[0].payload.stage;
                setSelectedBottleneckStage(clicked);
                if (onStageSelect) onStageSelect(clicked);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="shortTitle" 
              stroke="#64748b" 
              fontSize={11} 
              fontFamily="monospace"
              tickLine={false}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={11} 
              fontFamily="monospace"
              tickLine={false}
              unit=" days"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36} 
              wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
            />

            {/* Standard Target Bar */}
            <Bar 
              dataKey="estimatedDays" 
              name="Standard Target (Days)" 
              fill="#334155" 
              radius={[6, 6, 0, 0]} 
              barSize={20}
            />

            {/* Actual Elapsed Bar with Bottleneck Color Coding */}
            <Bar 
              dataKey="actualDays" 
              name="Actual Elapsed (Days)" 
              radius={[6, 6, 0, 0]} 
              barSize={20}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isOverdue ? '#f43f5e' : entry.status === 'completed' ? '#10b981' : '#f59e0b'} 
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                />
              ))}
            </Bar>

            {/* Cumulative Days Trend Line */}
            <Line 
              type="monotone" 
              dataKey="cumulativeDays" 
              name="Cumulative Timeline Trend" 
              stroke="#38bdf8" 
              strokeWidth={2.5} 
              dot={{ fill: '#38bdf8', r: 4 }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottleneck Diagnostic Bar & Recommendations */}
      {bottleneckCount > 0 && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between text-rose-300 font-bold font-mono">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                {isOm ? 'Akeekkachiisa Suuka Adeemsa Seeraa (Procedural Bottleneck Alert):' : 'Procedural Stage Delay & Bottleneck Analysis:'}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px]">
              {bottleneckCount} {isOm ? 'Stage Ture' : 'Stages Overdue'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            {chartData
              .filter((d) => d.isOverdue)
              .map((b) => (
                <div 
                  key={b.id} 
                  onClick={() => {
                    setSelectedBottleneckStage(b.stage);
                    if (onStageSelect) onStageSelect(b.stage);
                  }}
                  className="p-2.5 bg-slate-950 rounded-xl border border-rose-500/30 flex items-start justify-between gap-2 cursor-pointer hover:border-rose-400 transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-200 block truncate">
                      Stage {b.stageNumber}: {b.fullTitle}
                    </span>
                    <span className="text-[10px] text-rose-400 block mt-0.5">
                      Actual: {b.actualDays} days (Target: {b.estimatedDays} days) • +{b.variance}d delay
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 underline shrink-0">Inspect</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
