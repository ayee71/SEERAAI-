import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { CassationPrecedent, CASSATION_PRECEDENTS_DATA } from '../data/cassationPrecedents';
import { Language } from '../i18n/translations';
import {
  buildCitationGraph,
  CitationNode,
  CitationLink,
  CitationGraphData,
} from '../services/citationNetworkService';

interface CassationCitationMapProps {
  currentLang: Language;
  selectedRuling: CassationPrecedent;
  onSelectRuling: (precedent: CassationPrecedent) => void;
  onSendToExplain?: (query: string) => void;
  onOpenPdf?: (precedent: CassationPrecedent) => void;
  onScrollToRulingCard?: (fileNumber: string) => void;
}

export const CassationCitationMap: React.FC<CassationCitationMapProps> = ({
  currentLang,
  selectedRuling,
  onSelectRuling,
  onSendToExplain,
  onOpenPdf,
  onScrollToRulingCard,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // View state & options
  const [showSharedStatutes, setShowSharedStatutes] = useState<boolean>(true);
  const [showStatuteNodes, setShowStatuteNodes] = useState<boolean>(true);
  const [hoveredNode, setHoveredNode] = useState<CitationNode | null>(null);
  const [inspectedNode, setInspectedNode] = useState<CitationNode | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Keep inspected node in sync with selectedRuling or clicked node
  useEffect(() => {
    // When selectedRuling changes, inspect it by default
    const isOromia =
      selectedRuling.courtJurisdiction === 'oromia' || selectedRuling.id.startsWith('oromia_');
    setInspectedNode({
      id: `case-${selectedRuling.fileNumber}`,
      type: 'selected',
      fileNumber: selectedRuling.fileNumber,
      title: `Lakk. ${selectedRuling.fileNumber}`,
      subtitle: `Jildii ${selectedRuling.volume} • ${isOromia ? 'Oromiyaa' : 'Federaalaa'}`,
      court: isOromia ? 'oromia' : 'federal',
      volume: selectedRuling.volume,
      yearEC: selectedRuling.yearEC,
      category: selectedRuling.category,
      precedent: selectedRuling,
      radius: 34,
      color: '#f59e0b',
      strokeColor: '#fbbf24',
      textColor: '#0f172a',
      emoji: isOromia ? '🔴' : '🟢',
    });
  }, [selectedRuling]);

  // Compute graph data
  const graphData: CitationGraphData = useMemo(() => {
    return buildCitationGraph(selectedRuling, CASSATION_PRECEDENTS_DATA, {
      includeSharedStatutes: showSharedStatutes,
      includeStatuteNodes: showStatuteNodes,
      includeCategoryPeers: true,
      maxPeers: 3,
    });
  }, [selectedRuling, showSharedStatutes, showStatuteNodes]);

  // Filtered precedent options for fast switching
  const filteredPrecedentOptions = useMemo(() => {
    if (!searchFilter.trim()) return CASSATION_PRECEDENTS_DATA;
    const q = searchFilter.toLowerCase().trim();
    return CASSATION_PRECEDENTS_DATA.filter(
      (c) =>
        c.fileNumber.includes(q) ||
        c.parties.om.toLowerCase().includes(q) ||
        c.parties.am.toLowerCase().includes(q) ||
        c.parties.en.toLowerCase().includes(q) ||
        c.legalIssue.om.toLowerCase().includes(q)
    );
  }, [searchFilter]);

  // D3 Zoom handler ref so toolbar buttons can zoom programmatically
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  // Initialize and update D3 Force Simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svgElement = svgRef.current;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = 480;

    // Clear previous SVG contents
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)
      .style('cursor', 'grab');

    // Create main zoomable group
    const g = svg.append('g').attr('class', 'citation-graph-content');

    // Define Arrow Marker definitions (Clean solid colors, no gradients)
    const defs = svg.append('defs');

    const markerTypes = [
      { id: 'arrow-affirms', color: '#10b981' },
      { id: 'arrow-cites', color: '#38bdf8' },
      { id: 'arrow-cited-by', color: '#10b981' },
      { id: 'arrow-statute', color: '#a78bfa' },
      { id: 'arrow-default', color: '#64748b' },
    ];

    markerTypes.forEach((m) => {
      defs
        .append('marker')
        .attr('id', m.id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28) // offset from target center based on node radius
        .attr('refY', 0)
        .attr('markerWidth', 7)
        .attr('markerHeight', 7)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L10,0L0,4')
        .attr('fill', m.color);
    });

    // Deep copy data for simulation to avoid D3 mutating original objects in state
    const nodes: CitationNode[] = graphData.nodes.map((d) => ({ ...d }));
    const links: CitationLink[] = graphData.links.map((d) => ({ ...d }));

    // Link layer
    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');

    // Setup Force Simulation
    const simulation = d3
      .forceSimulation<CitationNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<CitationNode, any>(links)
          .id((d) => d.id)
          .distance((d: any) => {
            if (d.relation === 'statute' || d.relation === 'shared_statute') return 110;
            return 140;
          })
          .strength((d: any) => d.strength || 0.7)
      )
      .force('charge', d3.forceManyBody().strength(-420))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide<CitationNode>().radius((d) => d.radius + 18)
      );

    // Render links
    const link = linkGroup
      .selectAll<SVGLineElement, any>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => d.color || '#64748b')
      .attr('stroke-width', (d) => (d.relation === 'affirms' || d.relation === 'cites' ? 2.5 : 1.5))
      .attr('stroke-dasharray', (d) => (d.dashed ? '4,4' : 'none'))
      .attr('stroke-opacity', 0.8)
      .attr('marker-end', (d) => {
        if (d.relation === 'affirms') return 'url(#arrow-affirms)';
        if (d.relation === 'cites') return 'url(#arrow-cites)';
        if (d.relation === 'cited_by') return 'url(#arrow-cited-by)';
        if (d.relation === 'shared_statute') return 'url(#arrow-statute)';
        return 'url(#arrow-default)';
      });

    // Render nodes
    const node = nodeGroup
      .selectAll<SVGGElement, CitationNode>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-item')
      .style('cursor', 'pointer');

    // Pulsing halo for central selected ruling
    node
      .filter((d) => d.type === 'selected')
      .append('circle')
      .attr('r', (d) => d.radius + 8)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', '4,3');

    // Main Circle
    node
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => d.strokeColor)
      .attr('stroke-width', (d) => (d.type === 'selected' ? 3.5 : 2))
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))');

    // Emoji icon inside node circle (top)
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.type === 'selected' ? '-4px' : d.type === 'statute' ? '4px' : '-2px'))
      .attr('font-size', (d) => (d.type === 'selected' ? '18px' : d.type === 'statute' ? '14px' : '13px'))
      .text((d) => d.emoji);

    // File Number / Short Title label inside or right under circle
    node
      .filter((d) => d.type !== 'statute')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.type === 'selected' ? '14px' : '12px'))
      .attr('font-size', (d) => (d.type === 'selected' ? '11px' : '10px'))
      .attr('font-weight', 'bold')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('fill', (d) => d.textColor)
      .text((d) => d.fileNumber || '');

    // Outer subtitle label underneath node
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.radius + 15)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#cbd5e1')
      .attr('class', 'node-label-sub')
      .text((d) => {
        if (d.type === 'selected') return '⭐ Murtii Filatame';
        if (d.type === 'cites') return '⬅️ Waraabe';
        if (d.type === 'cited_by') return '➡️ Waraabameera';
        if (d.type === 'statute') return d.title;
        return d.title;
      });

    // Zoom & Pan setup
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2.5])
      .on('zoom', (event) => {
        zoomTransformRef.current = event.transform;
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Node Drag behavior
    const drag = d3
      .drag<SVGGElement, CitationNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        svg.style('cursor', 'grabbing');
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        svg.style('cursor', 'grab');
      });

    node.call(drag as any);

    // Node Interactions (Click & Hover)
    node
      .on('mouseenter', (_event, d) => {
        setHoveredNode(d);
        // Highlight connected links
        link
          .attr('stroke-opacity', (l: any) =>
            l.source.id === d.id || l.target.id === d.id ? 1 : 0.15
          )
          .attr('stroke-width', (l: any) =>
            l.source.id === d.id || l.target.id === d.id ? 3 : 1
          );

        // Dim non-connected nodes slightly
        node.attr('opacity', (n) => {
          if (n.id === d.id) return 1;
          const isConnected = links.some(
            (l: any) =>
              (l.source.id === d.id && l.target.id === n.id) ||
              (l.target.id === d.id && l.source.id === n.id)
          );
          return isConnected ? 1 : 0.35;
        });
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        link.attr('stroke-opacity', 0.8).attr('stroke-width', (d) =>
          d.relation === 'affirms' || d.relation === 'cites' ? 2.5 : 1.5
        );
        node.attr('opacity', 1);
      })
      .on('click', (_event, d) => {
        if (d.precedent) {
          setInspectedNode(d);
          // If user clicked a different precedent node, switch the selected ruling!
          if (d.fileNumber !== selectedRuling.fileNumber) {
            onSelectRuling(d.precedent);
          }
        } else if (d.type === 'statute') {
          setInspectedNode(d);
        }
      });

    // Tick update
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, selectedRuling, onSelectRuling]);

  // Toolbar Actions: Zoom In, Zoom Out, Reset, Center
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.7);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(350)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const handleCopyCitation = async (c: CassationPrecedent) => {
    const isOromia = c.courtJurisdiction === 'oromia' || c.id.startsWith('oromia_');
    const courtTitle = isOromia
      ? `Mana Murtii Waliigalaa Oromiyaa Dhaddacha Ijibbaataa Lakk. Galmee ${c.fileNumber} (Jildii ${c.volume})`
      : `Mana Murtii Waliigalaa Federaalaa Dhaddacha Ijibbaataa Lakk. Galmee ${c.fileNumber} (Jildii ${c.volume})`;

    await navigator.clipboard.writeText(courtTitle);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTriggerAI = (c: CassationPrecedent) => {
    const query = `Murtii Dhaddacha Ijoo Lakk. Galmee ${c.fileNumber} (Jildii ${c.volume}): ${c.parties.om} - Qajeeltoo seeraa fi waraabbii isaa bal'inaan ibsi.`;
    if (onSendToExplain) onSendToExplain(query);
  };

  // Precedent currently inspected (either hovered, clicked, or root selected)
  const activeDetailPrecedent = inspectedNode?.precedent || selectedRuling;
  const isActiveDetailOromia =
    activeDetailPrecedent.courtJurisdiction === 'oromia' ||
    activeDetailPrecedent.id.startsWith('oromia_');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Top Header: Title, Breadcrumbs, Selection Picker */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5">
              <span>🗺️</span>
              <span>Visual Citation Map (D3.js)</span>
            </span>

            <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-950 text-slate-300 font-mono font-bold border border-slate-800">
              Lakk. Galmee: <strong className="text-amber-400">{selectedRuling.fileNumber}</strong>
            </span>

            <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-950 text-slate-400 font-mono border border-slate-800">
              Jildii {selectedRuling.volume}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold font-serif-legal text-slate-100 flex items-center gap-2 pt-1">
            <span>Kartaa Walitti Dhufeenya Murteewwanii (Citation Network)</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Murtiin kun murteewwan dhimma seeraa walfakkaataa qaban kamiin akka waraabame (cites), kamtu isa waraabbate (cited by), fi seera kam waliin akka wal-qabatu D3.js tiin qoradhaa.
          </p>
        </div>

        {/* Quick Ruler Switcher Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 block">
              Murtii Biros Filadhaa (Switch Ruling):
            </label>
            <select
              value={selectedRuling.fileNumber}
              onChange={(e) => {
                const found = CASSATION_PRECEDENTS_DATA.find((c) => c.fileNumber === e.target.value);
                if (found) onSelectRuling(found);
              }}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500 max-w-xs cursor-pointer"
            >
              {CASSATION_PRECEDENTS_DATA.map((c) => {
                const isOr = c.courtJurisdiction === 'oromia' || c.id.startsWith('oromia_');
                return (
                  <option key={c.id} value={c.fileNumber}>
                    {isOr ? '🔴 Oromiyaa' : '🟢 Federaalaa'} | Lakk. {c.fileNumber} (Jildii {c.volume})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Network Controls Bar & Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80">
        {/* Graph Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-slate-400">Mallattoolee (Legend):</span>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-300 inline-block shadow-xs"></span>
            <span className="text-amber-300 font-bold">Murtii Filatame</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-3.5 h-3.5 rounded-full bg-sky-500 border border-sky-300 inline-block shadow-xs"></span>
            <span className="text-sky-300 font-bold">Waraabe (Cites)</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-300 inline-block shadow-xs"></span>
            <span className="text-emerald-300 font-bold">Waraabameera (Cited By)</span>
          </div>

          {showStatuteNodes && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-3.5 h-3.5 rounded-full bg-violet-600 border border-violet-400 inline-block shadow-xs"></span>
              <span className="text-violet-300 font-bold">Keeyyata Seeraa (Statute)</span>
            </div>
          )}
        </div>

        {/* Graph Option Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSharedStatutes((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showSharedStatutes
                ? 'bg-slate-900 border-amber-500/50 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚖️</span>
            <span>{showSharedStatutes ? 'Seera Waliinii: On' : 'Seera Waliinii: Off'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStatuteNodes((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showStatuteNodes
                ? 'bg-slate-900 border-violet-500/50 text-violet-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📜</span>
            <span>{showStatuteNodes ? 'Node Keeyyattootaa: On' : 'Node Keeyyattootaa: Off'}</span>
          </button>
        </div>
      </div>

      {/* Main D3 Graph Visualization Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[480px] bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden shadow-inner flex flex-col"
      >
        {/* Floating Zoom & Canvas Controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-sm font-bold flex items-center justify-center transition-all cursor-pointer"
            title="Dhiheessi (Zoom In)"
          >
            <span>➕</span>
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-sm font-bold flex items-center justify-center transition-all cursor-pointer"
            title="Fageessi (Zoom Out)"
          >
            <span>➖</span>
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
            title="Gara Jalqabaatti Deebisi (Reset View)"
          >
            <span>🔄</span>
          </button>
        </div>

        {/* Floating Metrics Badge in Canvas Top-Left */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono shadow-md">
          <span>📊 Node: <strong className="text-amber-400">{graphData.nodes.length}</strong></span>
          <span className="text-slate-600">•</span>
          <span>Hidda: <strong className="text-sky-400">{graphData.links.length}</strong></span>
          <span className="text-slate-600">•</span>
          <span>Waraabbii: <strong className="text-emerald-400">{graphData.stats.citedCount + graphData.stats.citingCount}</strong></span>
        </div>

        {/* Hovered Node Tooltip floating at bottom center of canvas */}
        {hoveredNode && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-md z-10 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 shadow-2xl text-xs space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{hoveredNode.emoji}</span>
                <span className="font-bold text-slate-100 font-mono">{hoveredNode.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-amber-300 font-bold border border-slate-800">
                  {hoveredNode.subtitle}
                </span>
              </div>
              <span className="text-[10px] text-amber-400 font-bold uppercase">
                {hoveredNode.type === 'selected'
                  ? 'Murtii Ijoo'
                  : hoveredNode.type === 'cites'
                  ? '⬅️ Kan Waraabe'
                  : hoveredNode.type === 'cited_by'
                  ? '➡️ Kan Waraabame'
                  : '🔗 Wal-qabate'}
              </span>
            </div>

            {hoveredNode.precedent ? (
              <>
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                  <strong>Falmii:</strong> {hoveredNode.precedent.parties.om}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  <strong>Qajeeltoo:</strong> {hoveredNode.precedent.bindingPrinciple.om}
                </p>
                <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                  <span>Tuqi: Murtii kanatti jijjiiri</span>
                  <span className="text-amber-400 font-semibold font-mono">Bara {hoveredNode.precedent.yearEC} B.A.</span>
                </div>
              </>
            ) : (
              <p className="text-[11px] text-violet-300">
                Tumoota Seeraa: {hoveredNode.statuteName || hoveredNode.title}
              </p>
            )}
          </div>
        )}

        {/* SVG Node Graph */}
        <svg ref={svgRef} className="w-full h-full select-none" />
      </div>

      {/* Selected Precedent Detailed Inspector Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] px-3 py-1 rounded-xl font-bold uppercase border ${
                isActiveDetailOromia
                  ? 'bg-red-950 text-red-300 border-red-500/40'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isActiveDetailOromia ? '🔴 Oromiyaa Cassation' : '🟢 Federal Cassation'}
            </span>

            <span className="text-xs px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-mono font-bold shadow-xs">
              Lakk. Galmee: {activeDetailPrecedent.fileNumber}
            </span>

            <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-900 text-amber-300 font-mono font-bold border border-slate-800">
              Jildii {activeDetailPrecedent.volume}
            </span>

            <span className="text-xs text-slate-400 font-mono">
              Bara {activeDetailPrecedent.yearEC} B.A. ({activeDetailPrecedent.yearGC} G.C.)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleCopyCitation(activeDetailPrecedent)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{copiedId === activeDetailPrecedent.id ? '✓ Waraabame!' : '📋 Waraabi'}</span>
            </button>

            {onOpenPdf && (
              <button
                type="button"
                onClick={() => onOpenPdf(activeDetailPrecedent)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>📥 PDF</span>
              </button>
            )}

            {onScrollToRulingCard && (
              <button
                type="button"
                onClick={() => onScrollToRulingCard(activeDetailPrecedent.fileNumber)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-300 text-xs font-semibold border border-sky-500/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>📜 Kaardii Murtii</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleTriggerAI(activeDetailPrecedent)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🤖</span>
              <span>AI'n Ibsi</span>
            </button>
          </div>
        </div>

        {/* Parties */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Qaamolee Falmii (Parties):
          </div>
          <div className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
            <span>{activeDetailPrecedent.parties.om}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-ethiopic">{activeDetailPrecedent.parties.am}</span>
          </div>
        </div>

        {/* Legal Issue & Binding Ratio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-1">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span>📌</span>
              <span>Gaaffii Seeraa Ijoo:</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeDetailPrecedent.legalIssue.om}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-1">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>📜</span>
              <span>Qajeeltoo Seeraa Dirqisiisaa (Binding Ratio):</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {activeDetailPrecedent.bindingPrinciple.om}
            </p>
          </div>
        </div>

        {/* Connected Precedents Quick Jump Pills */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Murteewwan Hidda Qaban (Connected Citations in Graph):</span>
            <span className="text-slate-500 text-[10px]">Tuqi: Murtii filadhu</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {graphData.nodes
              .filter((n) => n.precedent && n.fileNumber !== activeDetailPrecedent.fileNumber)
              .map((node) => {
                const isOr = node.court === 'oromia';
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => {
                      if (node.precedent) onSelectRuling(node.precedent);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      node.type === 'cites'
                        ? 'bg-sky-950 text-sky-200 border-sky-500/40 hover:bg-sky-900'
                        : node.type === 'cited_by'
                        ? 'bg-emerald-950 text-emerald-200 border-emerald-500/40 hover:bg-emerald-900'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>{node.emoji}</span>
                    <span className="font-mono font-bold">{node.title}</span>
                    <span className="text-[10px] text-slate-400">
                      ({node.type === 'cites' ? 'Waraabe' : node.type === 'cited_by' ? 'Waraabame' : 'Seera'})
                    </span>
                  </button>
                );
              })}

            {graphData.nodes.filter((n) => n.precedent && n.fileNumber !== activeDetailPrecedent.fileNumber).length === 0 && (
              <span className="text-xs text-slate-500 italic">
                Murtiin kun hidda waraabbii dabalataa hin qabu.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
