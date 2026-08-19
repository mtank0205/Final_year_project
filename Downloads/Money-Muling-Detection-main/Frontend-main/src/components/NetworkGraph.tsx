import { useCallback, useEffect, useRef, useMemo, forwardRef, useImperativeHandle, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceManyBody, forceCollide, forceX, forceY } from 'd3-force';
import type { GraphData, MuleNode } from '../types';
import { Layers, ShieldAlert, Eye } from 'lucide-react';

interface NetworkGraphProps {
  graphData: GraphData;
  onNodeClick: (node: MuleNode) => void;
  width: number;
  height: number;
}

export interface NetworkGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
}

type FilterMode = 'all' | 'rings' | 'mules';

const NetworkGraph = forwardRef<NetworkGraphHandle, NetworkGraphProps>(({ graphData, onNodeClick, width, height }, ref) => {
  const graphRef = useRef<any>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (graphRef.current) {
        const currentZoom = graphRef.current.zoom();
        graphRef.current.zoom(currentZoom * 1.5, 400);
      }
    },
    zoomOut: () => {
      if (graphRef.current) {
        const currentZoom = graphRef.current.zoom();
        graphRef.current.zoom(currentZoom / 1.5, 400);
      }
    },
    fitToScreen: () => {
      if (graphRef.current) {
        graphRef.current.zoomToFit(400, 20);
      }
    }
  }));

  // Filter graph data based on selected view mode
  const filteredData = useMemo(() => {
    if (filterMode === 'rings') {
      const ringNodeIds = new Set(
        graphData.nodes.filter(n => n.type === 'ring' || n.type === 'mule').map(n => n.id)
      );
      // Include ring nodes + their immediate neighbors
      const neighborIds = new Set(ringNodeIds);
      graphData.links.forEach(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        if (ringNodeIds.has(s)) neighborIds.add(t);
        if (ringNodeIds.has(t)) neighborIds.add(s);
      });

      const nodes = graphData.nodes.filter(n => neighborIds.has(n.id)).map(n => ({ ...n }));
      const links = graphData.links.filter(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return neighborIds.has(s) && neighborIds.has(t);
      }).map(l => ({ ...l }));

      return { nodes, links };
    } else if (filterMode === 'mules') {
      const muleNodeIds = new Set(
        graphData.nodes.filter(n => n.type === 'mule' || n.type === 'ring' || n.riskScore > 0).map(n => n.id)
      );
      const nodes = graphData.nodes.filter(n => muleNodeIds.has(n.id)).map(n => ({ ...n }));
      const links = graphData.links.filter(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return muleNodeIds.has(s) && muleNodeIds.has(t);
      }).map(l => ({ ...l }));

      return { nodes, links };
    }

    return {
      nodes: graphData.nodes.map(n => ({ ...n })),
      links: graphData.links.map(l => ({ ...l })),
    };
  }, [graphData, filterMode]);

  // Unique graph key to re-initialize simulation on dataset or filter change
  const graphKey = useMemo(() => {
    return `${filterMode}-${graphData.nodes.length}-${graphData.links.length}`;
  }, [graphData, filterMode]);

  // D3 force layout tuning for clean, un-cluttered visual separation
  useEffect(() => {
    if (graphRef.current) {
      const fg = graphRef.current;
      
      // Pull toward center softly
      fg.d3Force('x', forceX(width / 2).strength(0.12));
      fg.d3Force('y', forceY(height / 2).strength(0.12));
      
      // Strong repulsion to spread nodes out and remove hairball effect
      fg.d3Force('charge', forceManyBody().strength(-140));
      
      // Collision buffer
      fg.d3Force('collide', forceCollide(18));
      
      // Link distance
      fg.d3Force('link')?.distance(55).strength(1);
      
      fg.d3Force('center', null);
      fg.d3ReheatSimulation();
    }
  }, [graphKey, width, height]);

  // Paint Node function with Level-Of-Detail (LOD) label hiding
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name || node.id;
    const fontSize = Math.max(9 / globalScale, 3);
    
    const isMule = node.type === 'mule';
    const isRing = node.type === 'ring';
    const isNormal = node.type === 'normal';
    
    const nodeRadius = (isMule || isRing) ? 8 : 4;
    
    let fillColor, glowColor;
    if (isRing) {
      fillColor = '#f59e0b';  // Amber/Orange for fraud rings
      glowColor = '#f59e0b';
    } else if (isMule) {
      fillColor = '#ef4444';  // Red for mules
      glowColor = '#ef4444';
    } else {
      fillColor = '#3b82f6';  // Blue for normal accounts
      glowColor = '#3b82f6';
    }

    // Outer glow ring for flagged accounts
    if (isMule || isRing) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius + 5, 0, 2 * Math.PI);
      ctx.fillStyle = `${glowColor}25`;
      ctx.fill();
    }

    // Neon glow effect
    ctx.shadowBlur = (isMule || isRing) ? 18 : 6;
    ctx.shadowColor = glowColor;

    // Main node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Inner highlight
    ctx.beginPath();
    ctx.arc(node.x - nodeRadius * 0.2, node.y - nodeRadius * 0.2, nodeRadius * 0.4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    // Reset shadow for text
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Node border
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = `${glowColor}90`;
    ctx.lineWidth = 1 / globalScale;
    ctx.stroke();

    // =========================================================================
    // LEVEL-OF-DETAIL (LOD): Hide text labels for normal nodes unless zoomed in
    // =========================================================================
    const shouldShowLabel = isRing || isMule || globalScale >= 2.0;

    if (shouldShowLabel) {
      // Truncate long labels for readability
      const displayLabel = label.length > 12 ? `${label.substring(0, 8)}...` : label;
      
      ctx.font = `${fontSize}px 'Inter', sans-serif`;
      const textWidth = ctx.measureText(displayLabel).width;
      const bgPadding = 2 / globalScale;

      ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
      ctx.beginPath();
      ctx.roundRect(
        node.x - textWidth / 2 - bgPadding,
        node.y + nodeRadius + 2 - bgPadding,
        textWidth + bgPadding * 2,
        fontSize + bgPadding * 2,
        2 / globalScale,
      );
      ctx.fill();

      ctx.fillStyle = isNormal ? '#94a3b8' : glowColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(displayLabel, node.x, node.y + nodeRadius + 2);
    }

    // Risk score badge for flagged nodes
    if ((isMule || isRing) && node.riskScore > 0) {
      const badgeText = `${node.riskScore}`;
      const badgeFontSize = Math.max(9 / globalScale, 3);
      ctx.font = `bold ${badgeFontSize}px 'JetBrains Mono', monospace`;
      const badgeWidth = ctx.measureText(badgeText).width + 6 / globalScale;

      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.beginPath();
      ctx.roundRect(
        node.x - badgeWidth / 2,
        node.y - nodeRadius - badgeFontSize - 4 / globalScale,
        badgeWidth,
        badgeFontSize + 3 / globalScale,
        2 / globalScale,
      );
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(badgeText, node.x, node.y - nodeRadius - badgeFontSize - 2 / globalScale);
    }
  }, []);

  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const sourceIsRing = link.source.type === 'ring';
    const targetIsRing = link.target.type === 'ring';
    const sourceIsMule = link.source.type === 'mule';
    const targetIsMule = link.target.type === 'mule';
    const isRingConnection = link.isRingConnection;
    const bothNormal = link.source.type === 'normal' && link.target.type === 'normal';

    let color, lineWidth, shouldAnimate;
    
    if (isRingConnection) {
      color = '#ec4899b0';  // Bright Pink/Magenta for ring cycles
      lineWidth = 3;
      shouldAnimate = true;
    } else if ((sourceIsRing && (targetIsMule || targetIsRing)) || (targetIsRing && (sourceIsMule || sourceIsRing))) {
      color = '#f59e0b80';  // Amber
      lineWidth = 2.5;
      shouldAnimate = true;
    } else if (sourceIsMule || targetIsMule) {
      color = '#ef444470';  // Red
      lineWidth = 2;
      shouldAnimate = sourceIsMule && targetIsMule;
    } else if (bothNormal) {
      color = '#94a3b815';  // Subtle gray for normal connections
      lineWidth = 0.8;
      shouldAnimate = false;
    } else {
      color = '#00E5FF20';
      lineWidth = 1;
      shouldAnimate = false;
    }

    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Animated particles on flagged ring connections
    if (shouldAnimate) {
      const t = (Date.now() % 2000) / 2000;
      const px = link.source.x + (link.target.x - link.source.x) * t;
      const py = link.source.y + (link.target.y - link.source.y) * t;

      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
      const particleColor = isRingConnection ? '#ec4899' : '#ef4444';
      ctx.fillStyle = particleColor;
      ctx.shadowBlur = 8;
      ctx.shadowColor = particleColor;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, []);

  return (
    <div className="force-graph-container w-full h-full relative">
      {/* View Filter Controls Bar */}
      <div className="absolute top-12 left-4 z-10 flex items-center gap-1 bg-algo-dark/90 backdrop-blur-md rounded-lg p-1 border border-algo-border/40 shadow-lg">
        <button
          onClick={() => setFilterMode('all')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
            filterMode === 'all'
              ? 'bg-algo-teal/20 text-algo-teal border border-algo-teal/40 font-semibold'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>All ({graphData.nodes.length})</span>
        </button>

        <button
          onClick={() => setFilterMode('rings')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
            filterMode === 'rings'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Fraud Rings Subgraph</span>
        </button>

        <button
          onClick={() => setFilterMode('mules')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
            filterMode === 'mules'
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 font-semibold'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          <span>Flagged Mules</span>
        </button>
      </div>

      <ForceGraph2D
        key={graphKey}
        ref={graphRef}
        graphData={filteredData}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        onNodeClick={(node: any) => onNodeClick(node as MuleNode)}
        cooldownTicks={200}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.35}
        linkDistance={55}
        linkStrength={1}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
      />
    </div>
  );
});

export default NetworkGraph;
