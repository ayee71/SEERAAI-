import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { MilestoneStage } from '../services/caseMilestoneService';
import { Language } from '../i18n/translations';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Scale, 
  Info, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw,
  Calendar,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface D3CaseTimelineChartProps {
  stages: MilestoneStage[];
  currentLang: Language;
  onStageSelect?: (stage: MilestoneStage) => void;
  selectedStageId?: string;
  className?: string;
}

interface ActiveTooltipData {
  stage: MilestoneStage;
  x: number;
  y: number;
  daysSpent: number;
  estimatedDays: number;
  variance: number;
  isOverdue: boolean;
  statusText: string;
}

// Ethiopian Court Standard Duration benchmarks (in days)
const BENCHMARK_DURATIONS: Record<string, { est: number; act: number }> = {
  '1': { est: 14, act: 8 },   // Initial Filing & Investigation
  '2': { est: 7, act: 7 },    // Summons & Service of Process
  '3': { est: 10, act: 18 },  // Formal Pleading & Framing Issues (Bottleneck)
  '4': { est: 20, act: 29 },  // Evidentiary Witness Hearing (Bottleneck)
  '5': { est: 15, act: 12 },  // Deliberation & Judgment Delivery
  '6': { est: 30, act: 22 },  // Execution of Decree or Appeal
};

export const D3CaseTimelineChart: React.FC<D3CaseTimelineChartProps> = ({
  stages,
  currentLang,
  onStageSelect,
  selectedStageId,
  className = '',
}) => {
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltipData | null>(null);
  const [zoomLevelPercent, setZoomLevelPercent] = useState<number>(100);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // Calculate days spent for a given milestone
  const getStageDaysMetrics = useCallback((stage: MilestoneStage) => {
    const fallback = BENCHMARK_DURATIONS[stage.stageNumber.toString()] || { est: 14, act: 14 };
    const est = stage.estimatedDays ?? fallback.est;
    const act = stage.actualDays ?? (stage.status === 'pending' ? 0 : fallback.act);
    const variance = act - est;
    const isOverdue = (act > est && stage.status !== 'pending') || stage.status === 'flagged';

    return { daysSpent: act, estimatedDays: est, variance, isOverdue };
  }, []);

  // Total litigation metrics
  const totalDaysSpent = stages.reduce((acc, curr) => acc + getStageDaysMetrics(curr).daysSpent, 0);
  const totalTargetDays = stages.reduce((acc, curr) => acc + getStageDaysMetrics(curr).estimatedDays, 0);

  // Zoom-to-Fit action
  const handleZoomToFit = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);

    svg
      .transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);

    setZoomLevelPercent(100);
    setIsZoomed(false);
  }, []);

  // Zoom In action
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.25);
  }, []);

  // Zoom Out action
  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.8);
  }, []);

  // Main D3 Rendering Effect
  useEffect(() => {
    if (!svgRef.current || !stages || stages.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous renders

    const containerWidth = containerRef.current?.clientWidth || 780;
    const margin = { top: 45, right: 60, bottom: 65, left: 60 };
    const width = Math.max(700, containerWidth - margin.left - margin.right);
    const height = 185;
    const totalViewWidth = width + margin.left + margin.right;
    const totalViewHeight = height + margin.top + margin.bottom;

    svg
      .attr('viewBox', `0 0 ${totalViewWidth} ${totalViewHeight}`)
      .attr('width', '100%')
      .attr('height', totalViewHeight)
      .style('cursor', 'grab');

    // Root zoom container
    const g = svg
      .append('g')
      .attr('class', 'd3-timeline-main-group')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    gGroupRef.current = g;

    // Attach d3.zoom Behavior for pan & zoom capability
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        const pct = Math.round(event.transform.k * 100);
        setZoomLevelPercent(pct);
        setIsZoomed(pct !== 100 || event.transform.x !== 0 || event.transform.y !== 0);
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Double-click resets zoom to natural fit
    svg.on('dblclick.zoom', handleZoomToFit);

    // X scale mapping stage index to horizontal positions
    const xScale = d3
      .scalePoint<number>()
      .domain(stages.map((_, idx) => idx))
      .range([0, width])
      .padding(0.12);

    const yCenter = 52;

    // SVG Gradients & Filters
    const defs = svg.append('defs');

    // Completed track linear gradient
    const trackGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-completed-track-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    trackGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b');
    trackGradient.append('stop').attr('offset', '100%').attr('stop-color', '#10b981');

    // Glow filter effect
    const filter = defs.append('filter').attr('id', 'd3-glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Calculate completed index
    let lastCompletedIdx = -1;
    stages.forEach((s, idx) => {
      if (s.status === 'completed') lastCompletedIdx = idx;
    });

    // 1. Draw Background Track (Upcoming Remaining Pipeline)
    g.append('line')
      .attr('x1', 0)
      .attr('y1', yCenter)
      .attr('x2', width)
      .attr('y2', yCenter)
      .attr('stroke', '#1e293b') // slate-800
      .attr('stroke-width', 8)
      .attr('stroke-linecap', 'round');

    // Subtle track boundary tick lines
    stages.forEach((_, idx) => {
      const x = xScale(idx) || 0;
      g.append('line')
        .attr('x1', x)
        .attr('y1', yCenter - 14)
        .attr('x2', x)
        .attr('y2', yCenter + 14)
        .attr('stroke', '#334155')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2,2');
    });

    // 2. Draw Active Completed Track Progress Bar with Transition
    const completedX = lastCompletedIdx >= 0 ? (xScale(lastCompletedIdx) || 0) : 0;
    const progressTrack = g
      .append('line')
      .attr('x1', 0)
      .attr('y1', yCenter)
      .attr('x2', 0)
      .attr('y2', yCenter)
      .attr('stroke', 'url(#d3-completed-track-gradient)')
      .attr('stroke-width', 8)
      .attr('stroke-linecap', 'round')
      .attr('filter', 'url(#d3-glow)');

    progressTrack
      .transition()
      .duration(850)
      .ease(d3.easeCubicOut)
      .attr('x2', completedX);

    // 3. Render Milestone Node Groups
    const nodeGroups = g
      .selectAll('.milestone-node-group')
      .data(stages)
      .enter()
      .append('g')
      .attr('class', 'milestone-node-group')
      .attr('transform', (_, idx) => `translate(${xScale(idx) || 0}, ${yCenter})`)
      .style('cursor', 'pointer');

    // Interaction Handlers (Click & Hover)
    nodeGroups
      .on('click', (_, stage) => {
        if (onStageSelect) onStageSelect(stage);
      })
      .on('mouseenter', function (event, stage) {
        const metrics = getStageDaysMetrics(stage);
        const containerRect = containerRef.current?.getBoundingClientRect();
        const nodeRect = this.getBoundingClientRect();

        let posX = 0;
        let posY = 0;
        if (containerRect) {
          posX = nodeRect.left - containerRect.left + nodeRect.width / 2;
          posY = nodeRect.top - containerRect.top;
        }

        let statusText = 'Upcoming';
        if (stage.status === 'completed') statusText = 'Completed';
        else if (stage.status === 'in_progress') statusText = 'Active / In Progress';
        else if (stage.status === 'flagged') statusText = 'Flagged Bottleneck';

        setActiveTooltip({
          stage,
          x: posX,
          y: posY,
          daysSpent: metrics.daysSpent,
          estimatedDays: metrics.estimatedDays,
          variance: metrics.variance,
          isOverdue: metrics.isOverdue,
          statusText,
        });

        // Hover scale on node
        d3.select(this)
          .select('.node-circle-main')
          .transition()
          .duration(200)
          .attr('r', 24);
      })
      .on('mouseleave', function () {
        setActiveTooltip(null);
        d3.select(this)
          .select('.node-circle-main')
          .transition()
          .duration(200)
          .attr('r', (d: any) => (d.id === selectedStageId ? 22 : 19));
      });

    // Outer Selection Glow Circle
    nodeGroups
      .append('circle')
      .attr('r', (d) => (d.id === selectedStageId ? 30 : 25))
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        if (d.id === selectedStageId) return '#ffffff';
        if (d.status === 'completed') return '#10b981';
        if (d.status === 'in_progress') return '#f59e0b';
        if (d.status === 'flagged') return '#f43f5e';
        return 'transparent';
      })
      .attr('stroke-width', (d) => (d.id === selectedStageId ? 3 : 1.5))
      .attr('stroke-dasharray', (d) => (d.status === 'in_progress' ? '4,4' : 'none'))
      .attr('opacity', 0.85);

    // Main Inner Node Circle
    nodeGroups
      .append('circle')
      .attr('class', 'node-circle-main')
      .attr('r', (d) => (d.id === selectedStageId ? 22 : 19))
      .attr('fill', (d) => {
        if (d.status === 'completed') return '#10b981';
        if (d.status === 'in_progress') return '#f59e0b';
        if (d.status === 'flagged') return '#f43f5e';
        return '#0f172a'; // slate-900
      })
      .attr('stroke', (d) => {
        if (d.status === 'completed') return '#34d399';
        if (d.status === 'in_progress') return '#fbbf24';
        if (d.status === 'flagged') return '#fb7185';
        return '#475569';
      })
      .attr('stroke-width', 2.5)
      .attr('filter', (d) => (d.status === 'in_progress' || d.status === 'completed' ? 'url(#d3-glow)' : 'none'));

    // Node Stage Number or Check Icon
    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', (d) => (d.status === 'pending' ? '#94a3b8' : '#020617'))
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'ui-monospace, SFMono-Regular, monospace')
      .text((d) => (d.status === 'completed' ? '✓' : d.status === 'flagged' ? '!' : d.stageNumber));

    // Status Pill Tag Above Node
    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -34)
      .attr('fill', (d) => {
        if (d.status === 'completed') return '#10b981';
        if (d.status === 'in_progress') return '#f59e0b';
        if (d.status === 'flagged') return '#f43f5e';
        return '#64748b';
      })
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'ui-monospace, monospace')
      .text((d) => {
        if (d.status === 'completed') return 'COMPLETED';
        if (d.status === 'in_progress') return 'ACTIVE';
        if (d.status === 'flagged') return 'OVERDUE';
        return 'UPCOMING';
      });

    // EXACT DAYS SPENT BADGE CHIP DIRECTLY ON SVG (Under Node)
    const daysBadgeGroup = nodeGroups
      .append('g')
      .attr('transform', 'translate(0, 36)');

    // Days pill background
    daysBadgeGroup
      .append('rect')
      .attr('x', -26)
      .attr('y', -9)
      .attr('width', 52)
      .attr('height', 18)
      .attr('rx', 9)
      .attr('fill', (d) => {
        const metrics = getStageDaysMetrics(d);
        if (d.status === 'completed') {
          return metrics.isOverdue ? '#4c0519' : '#064e3b';
        }
        if (d.status === 'in_progress') return '#451a03';
        if (d.status === 'flagged') return '#4c0519';
        return '#1e293b';
      })
      .attr('stroke', (d) => {
        const metrics = getStageDaysMetrics(d);
        if (d.status === 'completed') {
          return metrics.isOverdue ? '#f43f5e' : '#10b981';
        }
        if (d.status === 'in_progress') return '#f59e0b';
        if (d.status === 'flagged') return '#f43f5e';
        return '#334155';
      })
      .attr('stroke-width', 1);

    // Days text
    daysBadgeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', (d) => {
        const metrics = getStageDaysMetrics(d);
        if (d.status === 'completed') {
          return metrics.isOverdue ? '#fda4af' : '#6ee7b7';
        }
        if (d.status === 'in_progress') return '#fcd34d';
        if (d.status === 'flagged') return '#fda4af';
        return '#94a3b8';
      })
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'ui-monospace, monospace')
      .text((d) => {
        const metrics = getStageDaysMetrics(d);
        return `${metrics.daysSpent}d spent`;
      });

    // Stage Title Label (Below Days Badge)
    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 60)
      .attr('fill', (d) => {
        if (d.id === selectedStageId) return '#ffffff';
        if (d.status === 'in_progress') return '#f59e0b';
        if (d.status === 'completed') return '#34d399';
        return '#94a3b8';
      })
      .attr('font-size', '11px')
      .attr('font-weight', (d) => (d.id === selectedStageId || d.status === 'in_progress' ? 'bold' : 'normal'))
      .text((d) => {
        const fullTitle = d.title[currentLang] || d.title.om;
        return fullTitle.length > 17 ? `${fullTitle.substring(0, 15)}…` : fullTitle;
      });

  }, [stages, currentLang, selectedStageId, onStageSelect, getStageDaysMetrics, handleZoomToFit]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden select-none ${className}`}
    >
      {/* Top Header with Title, Metrics, and ZOOM-TO-FIT Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3 mb-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider block">
              {isOm ? 'D3 Visual Case Pipeline & Yeroo Dhaddachaa' : 'D3 Visual Case Milestone Pipeline'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {isOm 
                ? `Waliigala Guyyoota: ${totalDaysSpent} Guyyoota (Qajeelfama: ${totalTargetDays}d)`
                : `Total Duration: ${totalDaysSpent} exact days spent (Benchmark: ${totalTargetDays}d)`}
            </span>
          </div>
        </div>

        {/* D3 ZOOM CONTROLS (Zoom In, Zoom Out, Zoom to Fit) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5 shadow-inner">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            
            <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

            {/* ZOOM TO FIT BUTTON */}
            <button
              type="button"
              onClick={handleZoomToFit}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isZoomed
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Zoom to Fit: Center and fit entire milestone timeline to view"
            >
              <Maximize2 className="w-3 h-3 text-amber-400" />
              <span>Zoom to Fit</span>
              <span className="text-[9px] text-slate-400 font-normal">({zoomLevelPercent}%)</span>
            </button>

            {isZoomed && (
              <button
                type="button"
                onClick={handleZoomToFit}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
                title="Reset View (100%)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SVG Container with D3 Visual Pipeline */}
      <div className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-800 py-1">
        <svg ref={svgRef} className="min-w-[700px] w-full" />
      </div>

      {/* INTERACTIVE FLOATING TOOLTIP DISPLAYING EXACT DAYS SPENT AT THIS PROCEDURAL STAGE */}
      {activeTooltip && (
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            left: `${Math.max(160, Math.min(activeTooltip.x, (containerRef.current?.clientWidth || 700) - 160))}px`,
            top: `${Math.max(60, activeTooltip.y - 145)}px`,
          }}
        >
          <div className="bg-slate-950/95 border-2 border-amber-500/60 rounded-2xl p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl w-72 text-xs space-y-2 text-slate-100 font-sans">
            {/* Tooltip Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-mono font-bold text-amber-400 flex items-center gap-1 text-[11px]">
                <Scale className="w-3 h-3 text-amber-400" />
                <span>Stage #{activeTooltip.stage.stageNumber}</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                  activeTooltip.stage.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : activeTooltip.stage.status === 'in_progress'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : activeTooltip.stage.status === 'flagged'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {activeTooltip.statusText}
              </span>
            </div>

            {/* Title */}
            <h5 className="font-bold text-white text-xs leading-snug font-serif-legal">
              {activeTooltip.stage.title[currentLang] || activeTooltip.stage.title.om}
            </h5>

            {/* EXACT DAYS SPENT HIGHLIGHT BOX */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{isOm ? 'Yeroo Qabatamaa (Exact Days Spent):' : 'Exact Days Spent:'}</span>
                </span>
                <span className="text-sm font-bold font-mono text-amber-300">
                  {activeTooltip.daysSpent} {isOm ? 'Guyyoota' : 'Days'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800 text-[10px] font-mono">
                <div>
                  <span className="text-slate-500 block text-[9px]">Target Standard:</span>
                  <span className="text-slate-300 font-bold">{activeTooltip.estimatedDays} Days</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Variance:</span>
                  <span
                    className={`font-bold ${
                      activeTooltip.variance > 0
                        ? 'text-rose-400'
                        : activeTooltip.variance < 0
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {activeTooltip.variance > 0 ? `+${activeTooltip.variance}d delay ⚠️` : `${activeTooltip.variance}d ahead ✓`}
                  </span>
                </div>
              </div>
            </div>

            {/* Legal Grounds & Action Prompt */}
            <div className="text-[10px] text-slate-400 space-y-0.5">
              <p className="line-clamp-2">
                <strong className="text-slate-300 font-mono">Grounds: </strong>
                {activeTooltip.stage.proceduralGrounds[currentLang] || activeTooltip.stage.proceduralGrounds.om}
              </p>
              <p className="text-[9px] text-amber-400/80 italic pt-1">
                {isOm ? 'Bal\'ina arguuf tuqaa (Click node to inspect)' : 'Click node to inspect stage details'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Helper Legend Footnote */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-850/80 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Completed
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" /> Active Stage
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Delay Bottleneck
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-700 inline-block" /> Upcoming
          </span>
        </div>

        <span className="text-slate-500 italic">
          {isOm 
            ? 'Garee D3 sochoosuuf harkisaa; deebisuuf "Zoom to Fit" fayyadamaa.'
            : 'Drag canvas to pan; click "Zoom to Fit" or double-click to center.'}
        </span>
      </div>
    </div>
  );
};
