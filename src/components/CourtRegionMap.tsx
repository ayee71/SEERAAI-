import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface RegionData {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

const regions: RegionData[] = [
  { id: 'oromia', name: 'Oromia', x: 200, y: 300, color: '#f59e0b' },
  { id: 'amhara', name: 'Amhara', x: 300, y: 150, color: '#ef4444' },
  { id: 'snnp', name: 'SNNP', x: 250, y: 450, color: '#10b981' },
  { id: 'tigray', name: 'Tigray', x: 350, y: 50, color: '#3b82f6' },
  { id: 'somali', name: 'Somali', x: 500, y: 350, color: '#8b5cf6' },
  { id: 'afar', name: 'Afar', x: 450, y: 200, color: '#f472b6' },
];

export const CourtRegionMap: React.FC<{ onRegionSelect: (regionId: string) => void }> = ({ onRegionSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.selectAll('circle')
      .data(regions)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 40)
      .attr('fill', d => d.color)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => onRegionSelect(d.id));

    svg.selectAll('text')
      .data(regions)
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + 5)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none')
      .text(d => d.name);
      
  }, [onRegionSelect]);

  return <svg ref={svgRef} width="600" height="500" />;
};
