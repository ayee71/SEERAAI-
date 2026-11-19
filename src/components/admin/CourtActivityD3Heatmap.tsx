import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Language } from '../../i18n/translations';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Building2, 
  Calendar, 
  Activity, 
  ShieldCheck, 
  Filter, 
  Clock, 
  ChevronRight,
  Gavel,
  Scale,
  Sparkles,
  Info
} from 'lucide-react';
import { getLocalInstitutions } from '../../services/courtInstitutionService';
import { getLocalAdminActivityLogs } from '../../services/adminActivityLogService';

export interface HeatmapDayData {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ...
  displayDate: string;
  ethiopianDate: string;
  loginCount: number;
  documentCount: number;
  combinedScore: number;
  roleLogins: {
    judges: number;
    registrars: number;
    prosecutors: number;
    admins: number;
  };
  docActions: {
    filings: number;
    rulings: number;
    orders: number;
    evidences: number;
    transcripts: number;
  };
  topRecords: {
    id: string;
    type: 'login' | 'document';
    title: string;
    actor: string;
    role: string;
    courtName: string;
    timestamp: string;
  }[];
}

interface CourtActivityD3HeatmapProps {
  currentLang?: Language;
  initialCourtId?: string;
}

export const CourtActivityD3Heatmap: React.FC<CourtActivityD3HeatmapProps> = ({
  currentLang = 'om',
  initialCourtId = 'all',
}) => {
  const isOm = currentLang === 'om';
  const isAm = currentLang === 'am';

  const [metricMode, setMetricMode] = useState<'logins' | 'documents' | 'combined'>('logins');
  const [selectedCourtId, setSelectedCourtId] = useState<string>(initialCourtId);
  const [selectedDay, setSelectedDay] = useState<HeatmapDayData | null>(null);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDayData | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const institutions = useMemo(() => {
    return getLocalInstitutions();
  }, []);

  // Generate 30-day trailing activity dataset with real logs blended with deterministic court history
  const heatmapData: HeatmapDayData[] = useMemo(() => {
    const days: HeatmapDayData[] = [];
    const now = new Date();
    const realLogs = getLocalAdminActivityLogs();

    // Courts list for deterministic simulation matching institutions
    const courtNames = [
      'Mana Murtii Waliigalaa Oromiyaa',
      'Mana Murtii Aanaa Gurbicha',
      'Mana Murtii Olaanaa Jimmaa',
      'Mana Murtii Olaanaa Finfinnee',
      'Mana Murtii Aanaa Adaamaa'
    ];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();

      // Seed deterministic activity based on day of week and distance
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseMultiplier = isWeekend ? 0.35 : 1.0;
      const wave = Math.sin((30 - i) * 0.4) * 0.3 + 0.7; // periodic surge

      // Count actual real logs for this day if any
      const matchingRealLogs = realLogs.filter((l) => l.timestamp?.startsWith(dateStr));
      const realLoginBonus = matchingRealLogs.filter(
        (l) => l.actionType === 'user_verification' || l.actionType === 'court_approval'
      ).length * 4;
      const realDocBonus = matchingRealLogs.length * 3;

      const baseLogins = Math.round((14 + (i % 7) * 4 + wave * 18 + realLoginBonus) * baseMultiplier);
      const baseDocs = Math.round((28 + ((i * 3) % 11) * 5 + wave * 32 + realDocBonus) * baseMultiplier);

      // Role breakdowns
      const judges = Math.max(1, Math.round(baseLogins * 0.38));
      const registrars = Math.max(1, Math.round(baseLogins * 0.32));
      const prosecutors = Math.max(0, Math.round(baseLogins * 0.18));
      const admins = Math.max(1, baseLogins - judges - registrars - prosecutors);

      // Doc breakdowns
      const filings = Math.max(1, Math.round(baseDocs * 0.35));
      const rulings = Math.max(1, Math.round(baseDocs * 0.22));
      const orders = Math.max(1, Math.round(baseDocs * 0.20));
      const evidences = Math.max(1, Math.round(baseDocs * 0.15));
      const transcripts = Math.max(0, baseDocs - filings - rulings - orders - evidences);

      // Sample top records for the day
      const topRecords = [
        {
          id: `rec_${dateStr}_1`,
          type: 'document' as const,
          title: `Galmee Lakk. MM/OR-${202600 + i * 4}: Murtii Dhaddacha Ijibbaataa`,
          actor: 'Abbaa Seeraa Tolasaa Hundee',
          role: 'Judge',
          courtName: courtNames[i % courtNames.length],
          timestamp: `${dateStr} 09:30 AM`
        },
        {
          id: `rec_${dateStr}_2`,
          type: 'login' as const,
          title: 'Mirkaneessa Eenyummaa Biometric & Seensa Dhaddachaa',
          actor: 'Reejistiraara Caaltuu Damissee',
          role: 'Registrar',
          courtName: courtNames[(i + 1) % courtNames.length],
          timestamp: `${dateStr} 10:15 AM`
        },
        {
          id: `rec_${dateStr}_3`,
          type: 'document' as const,
          title: `Iyyannoo & Mormii Jalqabaa (Pleading) - Kwt. 244 Bu'uuraan`,
          actor: 'Abbaa Alangaa Lammaa Fayyisaa',
          role: 'Prosecutor',
          courtName: courtNames[(i + 2) % courtNames.length],
          timestamp: `${dateStr} 11:45 AM`
        },
        {
          id: `rec_${dateStr}_4`,
          type: 'document' as const,
          title: 'Waraabbii Sagalee Dhaddachaa & Transcript SHA-256 Galmaa\'e',
          actor: 'Qindeessaa Galmee Aadde Hawwii',
          role: 'Court Staff',
          courtName: courtNames[(i + 3) % courtNames.length],
          timestamp: `${dateStr} 02:20 PM`
        },
        {
          id: `rec_${dateStr}_5`,
          type: 'login' as const,
          title: 'Seensa Court Admin & Qorannoo Nageenya Iccitii',
          actor: 'Admin Mana Murtii Aanaa Gurbicha',
          role: 'Court Admin',
          courtName: 'Mana Murtii Aanaa Gurbicha',
          timestamp: `${dateStr} 04:10 PM`
        }
      ];

      // Format dates
      const monthNamesOm = ['Amajjii', 'Guraandhala', 'Bitooteessa', 'Elba', 'Caamsaa', 'Waxabajjii', 'Adooleessa', 'Hagayya', 'Fuulbana', 'Onkololeessa', 'Sadaasa', 'Muddee'];
      const displayDate = `${d.getDate()} ${monthNamesOm[d.getMonth()]} ${d.getFullYear()}`;
      
      // Approximate Ethiopian calendar for display
      const ethYear = d.getFullYear() - 8;
      const ethMonthIndex = (d.getMonth() + 4) % 12;
      const ethiopianDate = `${monthNamesOm[ethMonthIndex]} ${((d.getDate() + 20) % 30) + 1}, ${ethYear} E.C.`;

      days.push({
        date: dateStr,
        dayOfWeek,
        displayDate,
        ethiopianDate,
        loginCount: baseLogins,
        documentCount: baseDocs,
        combinedScore: baseLogins + Math.round(baseDocs * 0.8),
        roleLogins: { judges, registrars, prosecutors, admins },
        docActions: { filings, rulings, orders, evidences, transcripts },
        topRecords
      });
    }

    return days;
  }, []);

  // Filtered dataset based on selected court
  const filteredData = useMemo(() => {
    if (selectedCourtId === 'all') return heatmapData;
    // Scale proportionally for selected isolated court
    return heatmapData.map((d) => {
      const courtFactor = selectedCourtId.includes('gurbicha') ? 0.35 : 0.65;
      const scaledLogins = Math.max(1, Math.round(d.loginCount * courtFactor));
      const scaledDocs = Math.max(2, Math.round(d.documentCount * courtFactor));
      return {
        ...d,
        loginCount: scaledLogins,
        documentCount: scaledDocs,
        combinedScore: scaledLogins + Math.round(scaledDocs * 0.8),
        roleLogins: {
          judges: Math.max(1, Math.round(d.roleLogins.judges * courtFactor)),
          registrars: Math.max(1, Math.round(d.roleLogins.registrars * courtFactor)),
          prosecutors: Math.max(0, Math.round(d.roleLogins.prosecutors * courtFactor)),
          admins: Math.max(1, Math.round(d.roleLogins.admins * courtFactor)),
        },
        docActions: {
          filings: Math.max(1, Math.round(d.docActions.filings * courtFactor)),
          rulings: Math.max(1, Math.round(d.docActions.rulings * courtFactor)),
          orders: Math.max(1, Math.round(d.docActions.orders * courtFactor)),
          evidences: Math.max(0, Math.round(d.docActions.evidences * courtFactor)),
          transcripts: Math.max(0, Math.round(d.docActions.transcripts * courtFactor)),
        }
      };
    });
  }, [heatmapData, selectedCourtId]);

  // Overall 30-Day Aggregates
  const totalLogins = useMemo(() => filteredData.reduce((acc, curr) => acc + curr.loginCount, 0), [filteredData]);
  const totalDocs = useMemo(() => filteredData.reduce((acc, curr) => acc + curr.documentCount, 0), [filteredData]);
  const peakDay = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valA = metricMode === 'logins' ? a.loginCount : metricMode === 'documents' ? a.documentCount : a.combinedScore;
      const valB = metricMode === 'logins' ? b.loginCount : metricMode === 'documents' ? b.documentCount : b.combinedScore;
      return valB - valA;
    })[0];
  }, [filteredData, metricMode]);

  // Render D3 Heatmap SVG
  useEffect(() => {
    if (!svgRef.current || filteredData.length === 0) return;

    // Clear previous elements
    d3.select(svgRef.current).selectAll('*').remove();

    // Chart Dimensions
    const width = 860;
    const height = 230;
    const margin = { top: 32, right: 24, bottom: 36, left: 56 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', '100%')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Day of week labels: Monday through Sunday
    const dayLabelsOm = ['Wiixata (Mon)', 'Kibxata (Tue)', 'Roobii (Wed)', 'Kamisa (Thu)', 'Jimmata (Fri)', 'Sanbata (Sat)', 'Dilbata (Sun)'];
    const dayLabelsShort = ['Wiix', 'Kibx', 'Roob', 'Kami', 'Jimm', 'Sanb', 'Dilb'];

    // Map dayOfWeek: 1=Mon, ..., 0=Sun (adjust so Monday is index 0)
    const getAdjustedDayIndex = (dow: number) => (dow === 0 ? 6 : dow - 1);

    // Group 30 days into chronological columns (weeks)
    // First calculate which week column each day falls into
    const firstDate = new Date(filteredData[0].date);
    const firstDayAdj = getAdjustedDayIndex(firstDate.getDay());

    const daysWithGrid = filteredData.map((item, idx) => {
      const d = new Date(item.date);
      const dayIdx = getAdjustedDayIndex(d.getDay());
      // week index relative to start
      const weekIdx = Math.floor((idx + firstDayAdj) / 7);
      return {
        ...item,
        gridX: weekIdx,
        gridY: dayIdx,
      };
    });

    const maxWeek = d3.max(daysWithGrid, (d) => d.gridX) || 5;
    const numColumns = maxWeek + 1;

    // Grid sizes
    const cellSize = Math.min(innerWidth / numColumns - 6, innerHeight / 7 - 5);
    const cellRadius = 6;

    // Domain range
    const maxVal = d3.max(filteredData, (d) => {
      if (metricMode === 'logins') return d.loginCount;
      if (metricMode === 'documents') return d.documentCount;
      return d.combinedScore;
    }) || 10;

    // D3 Color Interpolator based on Metric Mode
    let colorScale: (val: number) => string;
    if (metricMode === 'logins') {
      // Emerald / Cyan legal security theme
      colorScale = (val: number) => {
        if (val === 0) return '#0f172a';
        const t = Math.min(1, Math.max(0.12, val / maxVal));
        return d3.interpolateRgb('#064e3b', '#34d399')(t);
      };
    } else if (metricMode === 'documents') {
      // Amber / Gold legal registry theme
      colorScale = (val: number) => {
        if (val === 0) return '#0f172a';
        const t = Math.min(1, Math.max(0.12, val / maxVal));
        return d3.interpolateRgb('#78350f', '#fbbf24')(t);
      };
    } else {
      // Cyan / Blue judiciary activity theme
      colorScale = (val: number) => {
        if (val === 0) return '#0f172a';
        const t = Math.min(1, Math.max(0.12, val / maxVal));
        return d3.interpolateRgb('#1e3a8a', '#38bdf8')(t);
      };
    }

    // Y Axis Labels (Days of Week)
    const yLabelsGroup = svg.append('g').attr('class', 'y-labels');
    for (let i = 0; i < 7; i++) {
      yLabelsGroup
        .append('text')
        .attr('x', -12)
        .attr('y', i * (cellSize + 5) + cellSize / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, monospace')
        .text(dayLabelsShort[i]);
    }

    // X Axis Header Labels (Week Indicators)
    const xLabelsGroup = svg.append('g').attr('class', 'x-labels');
    for (let c = 0; c < numColumns; c++) {
      const sampleInCol = daysWithGrid.find((d) => d.gridX === c);
      const labelText = sampleInCol
        ? `W${c + 1} (${sampleInCol.date.split('-')[2]})`
        : `W${c + 1}`;

      xLabelsGroup
        .append('text')
        .attr('x', c * (cellSize + 6) + cellSize / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .attr('font-size', '10px')
        .attr('font-mono', 'true')
        .text(labelText);
    }

    // Draw Heatmap Cell Rectangles
    const cellGroups = svg
      .append('g')
      .attr('class', 'cells')
      .selectAll('g')
      .data(daysWithGrid)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.gridX * (cellSize + 6)}, ${d.gridY * (cellSize + 5)})`)
      .style('cursor', 'pointer');

    // Cell Background Rect
    cellGroups
      .append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', cellRadius)
      .attr('ry', cellRadius)
      .attr('fill', (d) => {
        const val = metricMode === 'logins' ? d.loginCount : metricMode === 'documents' ? d.documentCount : d.combinedScore;
        return colorScale(val);
      })
      .attr('stroke', (d) => {
        if (selectedDay?.date === d.date) return '#f59e0b';
        return '#1e293b';
      })
      .attr('stroke-width', (d) => (selectedDay?.date === d.date ? 2.5 : 1))
      .attr('stroke-opacity', 0.9)
      .style('transition', 'all 0.15s ease-in-out')
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 2.5)
          .attr('filter', 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))');
        setHoveredDay(d);
      })
      .on('mouseleave', function (event, d) {
        if (selectedDay?.date !== d.date) {
          d3.select(this)
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 1)
            .attr('filter', null);
        } else {
          d3.select(this)
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 2.5)
            .attr('filter', null);
        }
        setHoveredDay(null);
      })
      .on('click', (event, d) => {
        setSelectedDay((prev) => (prev?.date === d.date ? null : d));
      });

    // Small numerical indicator inside cells with higher intensity
    cellGroups
      .append('text')
      .attr('x', cellSize / 2)
      .attr('y', cellSize / 2 + 3.5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .attr('opacity', (d) => {
        const val = metricMode === 'logins' ? d.loginCount : metricMode === 'documents' ? d.documentCount : d.combinedScore;
        return val > maxVal * 0.4 ? 0.9 : 0;
      })
      .text((d) => {
        const val = metricMode === 'logins' ? d.loginCount : metricMode === 'documents' ? d.documentCount : d.combinedScore;
        return val;
      });

    // Add D3 Legend at bottom right
    const legendWidth = 140;
    const legendHeight = 10;
    const legendX = innerWidth - legendWidth;
    const legendY = innerHeight + 16;

    const defs = svg.append('defs');
    const linearGradient = defs
      .append('linearGradient')
      .attr('id', 'heatmap-legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    linearGradient.append('stop').attr('offset', '0%').attr('stop-color', colorScale(0));
    linearGradient.append('stop').attr('offset', '50%').attr('stop-color', colorScale(maxVal * 0.5));
    linearGradient.append('stop').attr('offset', '100%').attr('stop-color', colorScale(maxVal));

    const legendGroup = svg.append('g').attr('class', 'legend');
    legendGroup
      .append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('rx', 4)
      .attr('fill', 'url(#heatmap-legend-gradient)')
      .attr('stroke', '#334155')
      .attr('stroke-width', 0.5);

    legendGroup
      .append('text')
      .attr('x', legendX - 6)
      .attr('y', legendY + 8)
      .attr('text-anchor', 'end')
      .attr('fill', '#64748b')
      .attr('font-size', '9px')
      .text('0');

    legendGroup
      .append('text')
      .attr('x', legendX + legendWidth + 6)
      .attr('y', legendY + 8)
      .attr('text-anchor', 'start')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .text(`${maxVal}+`);

    legendGroup
      .append('text')
      .attr('x', legendX + legendWidth / 2)
      .attr('y', legendY - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '8.5px')
      .text(isOm ? 'Sadarkaa Baay\'inaa (Intensity Scale)' : 'Activity Intensity Scale');
  }, [filteredData, metricMode, selectedDay, isOm]);

  // Set default selected day to today or peak day
  useEffect(() => {
    if (!selectedDay && filteredData.length > 0) {
      setSelectedDay(filteredData[filteredData.length - 1]);
    }
  }, [filteredData, selectedDay]);

  const activeInspectDay = hoveredDay || selectedDay || filteredData[filteredData.length - 1];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>D3 Activity Heatmap Engine • 30 Days</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Court Multi-Tenant Isolation</span>
            </span>
          </div>

          <h3 className="text-lg sm:text-2xl font-serif-legal font-bold text-white flex items-center gap-2">
            <span>{isOm ? 'Kaartaa Sochii Hojjattoota Mana Murtii (Last 30 Days Heatmap)' : isAm ? 'የፍርድ ቤት ሰራተኞች የ30 ቀናት የስራ እንቅስቃሴ ካርታ' : 'Court Personnel Activity Heatmap (Trailing 30 Days)'}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {isOm
              ? 'Baayyina seensa abbootii seeraa fi ogeessota mana murtii (Login Frequency) fi baayyina sanadoota qophaa\'anii fi dhiyaatanii (Document Management Volume) D3.js fayyadamuun kan qindaa\'e.'
              : 'D3 visualization showing judicial staff login frequencies and case document management volume across isolated court benches.'}
          </p>
        </div>

        {/* Court Isolation Filter & Mode Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Court Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-slate-900 text-white">
                {isOm ? 'Manneen Murtii Hunda (All Courts)' : 'ሁሉም ፍርድ ቤቶች'}
              </option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id} className="bg-slate-900 text-white">
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Switcher Pills */}
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMetricMode('logins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                metricMode === 'logins'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isOm ? 'Seensa (Logins)' : 'መግቢያዎች'}</span>
            </button>

            <button
              onClick={() => setMetricMode('documents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                metricMode === 'documents'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isOm ? 'Sanadoota (Docs)' : 'ሰነዶች'}</span>
            </button>

            <button
              onClick={() => setMetricMode('combined')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                metricMode === 'combined'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isOm ? 'Waliigala (Combined)' : 'አጠቃላይ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 30-Day Executive Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>30-Day Staff Logins</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">
            {totalLogins.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500">
            Abbootii Seeraa & Reejistiraara
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Documents Managed</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
            {totalDocs.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500">
            Filings, Orders & Rulings
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Peak Activity Day</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-sm sm:text-base font-bold text-sky-300 truncate font-mono">
            {peakDay?.displayDate || 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500">
            Peak: {metricMode === 'logins' ? `${peakDay?.loginCount} Logins` : `${peakDay?.documentCount} Docs`}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Avg Daily Velocity</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-300">
            {Math.round((totalLogins + totalDocs) / 30)}/day
          </div>
          <div className="text-[10px] text-slate-500">
            Bench Case Operations
          </div>
        </div>
      </div>

      {/* D3 Heatmap SVG Canvas Container */}
      <div 
        ref={containerRef}
        className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 sm:p-5 overflow-x-auto relative shadow-inner"
      >
        <div className="min-w-[760px]">
          <svg ref={svgRef} className="w-full select-none" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-900 mt-2 px-1">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isOm 
                ? 'Guyyaa tokko irratti tuquun bal\'ina seensaa fi galmeewwan dhiyaatan ilaalaa (Click any day cell).'
                : 'Click any day to inspect detailed role logins and case actions.'}
            </span>
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {metricMode.toUpperCase()} VIEW • 30 DAYS MATRIX
          </span>
        </div>
      </div>

      {/* Selected/Hovered Day Detail Breakdown Card */}
      {activeInspectDay && (
        <div className="bg-slate-950 border-2 border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-lg">
                📅
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm sm:text-base">
                    {activeInspectDay.displayDate}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                    {activeInspectDay.ethiopianDate}
                  </span>
                  {selectedDay?.date === activeInspectDay.date && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                      Selected Day
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isOm ? 'Gabaasa sochiilee guyyaa kana raawwatamanii' : 'Activity details for this specific calendar date'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                Logins: <strong>{activeInspectDay.loginCount}</strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                Documents: <strong>{activeInspectDay.documentCount}</strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Role Breakdown */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>Seensa Hojjattootaa (Personnel Logins)</span>
                <Users className="w-3.5 h-3.5 text-emerald-400" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Gavel className="w-3.5 h-3.5 text-amber-400" /> Abbootii Seeraa (Judges):
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    {activeInspectDay.roleLogins.judges}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" /> Reejistiraara (Registrars):
                  </span>
                  <span className="font-mono font-bold text-emerald-300">
                    {activeInspectDay.roleLogins.registrars}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-sky-400" /> Abbootii Alangaa (Prosecutors):
                  </span>
                  <span className="font-mono font-bold text-sky-300">
                    {activeInspectDay.roleLogins.prosecutors}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Admin & IT Staff:
                  </span>
                  <span className="font-mono font-bold text-purple-300">
                    {activeInspectDay.roleLogins.admins}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Document Volume Actions */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>Sanadoota & Galmee (Document Actions)</span>
                <FileText className="w-3.5 h-3.5 text-amber-400" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Iyyannoo & Falmii (Filings):</span>
                  <span className="font-mono font-bold text-amber-300">
                    {activeInspectDay.docActions.filings}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Murtiilee Dhaddachaa (Court Rulings):</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {activeInspectDay.docActions.rulings}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Ajajawwan Mana Murtii (Judicial Orders):</span>
                  <span className="font-mono font-bold text-sky-300">
                    {activeInspectDay.docActions.orders}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Ragaa & Waraabbii (Evidence & Transcripts):</span>
                  <span className="font-mono font-bold text-purple-300">
                    {activeInspectDay.docActions.evidences + activeInspectDay.docActions.transcripts}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top 5 Active Records of the Day */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
              <span>{isOm ? 'Gochaalee Ijoo Guyyaa Kanaa (Top Activity Records)' : 'Top Day Records'}</span>
              <span className="text-[11px] text-slate-500 font-normal">Audit Trace</span>
            </div>

            <div className="space-y-1.5">
              {activeInspectDay.topRecords.slice(0, 5).map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {rec.type === 'login' ? '🔐' : '📄'}
                    </span>
                    <div>
                      <span className="font-bold text-slate-200">{rec.title}</span>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {rec.actor} ({rec.role}) • <span className="text-amber-400/90">{rec.courtName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono shrink-0">
                    {rec.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
