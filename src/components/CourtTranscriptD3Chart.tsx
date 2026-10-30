import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Language } from '../i18n/translations';
import { Activity, Radio, Volume2, ShieldCheck } from 'lucide-react';

interface TranscriptActivityPoint {
  timeIndex: string;
  speaker: string;
  activityIntensity: number; // 0 to 100 speaking volume / debate peak
  wordCount: number;
  sentiment: 'neutral' | 'objection' | 'evidence' | 'ruling';
}

interface CourtTranscriptD3ChartProps {
  currentLang?: Language;
  data?: TranscriptActivityPoint[];
  title?: string;
}

const DEFAULT_ACTIVITY_DATA: TranscriptActivityPoint[] = [
  { timeIndex: '09:00', speaker: 'Abbaa Seeraa', activityIntensity: 35, wordCount: 120, sentiment: 'neutral' },
  { timeIndex: '09:15', speaker: 'Himataa', activityIntensity: 65, wordCount: 340, sentiment: 'evidence' },
  { timeIndex: '09:30', speaker: 'Himatamaa', activityIntensity: 85, wordCount: 450, sentiment: 'objection' },
  { timeIndex: '09:45', speaker: 'Abbaa Alangaa', activityIntensity: 70, wordCount: 310, sentiment: 'evidence' },
  { timeIndex: '10:00', speaker: 'Abbaa Seeraa', activityIntensity: 95, wordCount: 520, sentiment: 'ruling' },
  { timeIndex: '10:15', speaker: 'Himataa', activityIntensity: 50, wordCount: 210, sentiment: 'neutral' },
  { timeIndex: '10:30', speaker: 'Himatamaa', activityIntensity: 90, wordCount: 480, sentiment: 'objection' },
  { timeIndex: '10:45', speaker: 'Abbaa Seeraa', activityIntensity: 40, wordCount: 150, sentiment: 'ruling' }
];

export const CourtTranscriptD3Chart: React.FC<CourtTranscriptD3ChartProps> = ({
  currentLang = 'om',
  data = DEFAULT_ACTIVITY_DATA,
  title,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous SVG render
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 600;
    const height = 260;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', '100%')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Scales
    const xScale = d3
      .scalePoint()
      .domain(data.map((d) => d.timeIndex))
      .range([0, innerWidth])
      .padding(0.5);

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    // Grid lines
    svg
      .append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data([25, 50, 75, 100])
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '4,4')
      .attr('stroke-opacity', 0.5);

    // Area generator for activity peaks
    const areaGenerator = d3
      .area<TranscriptActivityPoint>()
      .x((d) => xScale(d.timeIndex) || 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.activityIntensity))
      .curve(d3.curveMonotoneX);

    // Gradient fill for area
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'activity-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.6);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.0);

    // Append Area path
    svg
      .append('path')
      .datum(data)
      .attr('fill', 'url(#activity-gradient)')
      .attr('d', areaGenerator);

    // Line generator
    const lineGenerator = d3
      .line<TranscriptActivityPoint>()
      .x((d) => xScale(d.timeIndex) || 0)
      .y((d) => yScale(d.activityIntensity))
      .curve(d3.curveMonotoneX);

    // Append Line path
    svg
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 3)
      .attr('d', lineGenerator);

    // X Axis
    svg
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Y Axis
    svg
      .append('g')
      .call(d3.axisLeft(yScale).ticks(4))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Axis styling
    svg.selectAll('.domain').attr('stroke', '#475569');
    svg.selectAll('.tick line').attr('stroke', '#475569');

    // Interactive Data Points (Peaks)
    svg
      .selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.timeIndex) || 0)
      .attr('cy', (d) => yScale(d.activityIntensity))
      .attr('r', 5)
      .attr('fill', '#f59e0b')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).transition().attr('r', 8).attr('fill', '#ef4444');
      })
      .on('mouseout', function () {
        d3.select(this).transition().attr('r', 5).attr('fill', '#f59e0b');
      });

  }, [data]);

  return (
    <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-serif-legal">
              {title || (currentLang === 'om' ? 'Qabxii Hojii & Volume Dhaddachaa (D3 Activity Peaks)' : 'የችሎት ንግግር እና እንቅስቃሴ (D3 Peaks)')}
            </h3>
            <p className="text-[11px] text-slate-400">
              {currentLang === 'om'
                ? 'Sagalee, falmii fi yeroo falmiin jabaate (objection peaks) D3 real-time graph'
                : 'የችሎት ንግግር ከፍታ እና የክርክር ጊዜያት በ D3 ግራፍ'}
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
          <Radio className="w-3 h-3 animate-ping" />
          <span>D3 Live Stream</span>
        </span>
      </div>

      {/* SVG Chart Container */}
      <div className="w-full bg-slate-950 rounded-2xl p-3 border border-slate-800/80 overflow-hidden relative">
        <svg ref={svgRef} className="overflow-visible" />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
        <span>* Yeroo Dhaddachaa (Hearing Timeline)</span>
        <span className="text-amber-400 font-semibold">Peak Intensity: Objection / Evidence</span>
      </div>
    </div>
  );
};
export default CourtTranscriptD3Chart;
