"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface GraphNode {
  name: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  memoryTitle?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalNodes: number;
  totalEdges: number;
  cogneeAvailable: boolean;
}

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Array<GraphNode & { x: number; y: number; vx: number; vy: number }>>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/graph");
      const data = await res.json();
      setGraphData(data);

      // Initialize node positions
      if (data.nodes.length > 0) {
        const canvas = canvasRef.current;
        const w = canvas?.width || 800;
        const h = canvas?.height || 600;

        nodesRef.current = data.nodes.map((node: GraphNode, i: number) => ({
          ...node,
          x: w / 2 + (Math.random() - 0.5) * 300,
          y: h / 2 + (Math.random() - 0.5) * 300,
          vx: 0,
          vy: 0,
        }));

        startSimulation(data.edges);
      }
    } catch (err) {
      console.error("Failed to fetch graph:", err);
    } finally {
      setLoading(false);
    }
  };

  const startSimulation = useCallback((edges: GraphEdge[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const nodes = nodesRef.current;

    const edgeMap = edges.map(e => ({
      source: e.source,
      target: e.target,
      relationship: e.relationship,
    }));

    const simulate = () => {
      // Force simulation
      for (let iter = 0; iter < 3; iter++) {
        // Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 5000 / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }

        // Attraction along edges
        for (const edge of edgeMap) {
          const sourceNode = nodes.find(n => n.name === edge.source);
          const targetNode = nodes.find(n => n.name === edge.target);
          if (!sourceNode || !targetNode) continue;

          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 120) * 0.01;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          sourceNode.vx += fx;
          sourceNode.vy += fy;
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }

        // Center gravity
        for (const node of nodes) {
          node.vx += (width / 2 - node.x) * 0.001;
          node.vy += (height / 2 - node.y) * 0.001;
          node.vx *= 0.9;
          node.vy *= 0.9;
          node.x += node.vx;
          node.y += node.vy;
          // Keep in bounds
          node.x = Math.max(80, Math.min(width - 80, node.x));
          node.y = Math.max(40, Math.min(height - 40, node.y));
        }
      }

      // Draw
      ctx.clearRect(0, 0, width, height);

      // Draw edges
      for (const edge of edgeMap) {
        const sourceNode = nodes.find(n => n.name === edge.source);
        const targetNode = nodes.find(n => n.name === edge.target);
        if (!sourceNode || !targetNode) continue;

        const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.strokeStyle = isHighlighted
          ? "rgba(99, 102, 241, 0.7)"
          : "rgba(99, 102, 241, 0.15)";
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.stroke();

        // Draw relationship label on edge
        if (isHighlighted) {
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          ctx.font = "10px system-ui";
          ctx.fillStyle = "rgba(165, 180, 252, 0.8)";
          ctx.textAlign = "center";
          ctx.fillText(edge.relationship, midX, midY - 5);
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const isHovered = hoveredNode === node.name;
        const isConnected = edgeMap.some(
          e => (e.source === hoveredNode && e.target === node.name) ||
               (e.target === hoveredNode && e.source === node.name)
        );
        const isHighlighted = isHovered || isConnected;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, isHovered ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = isHovered
          ? "#818cf8"
          : isHighlighted
          ? "#6366f1"
          : "#4338ca";
        ctx.fill();

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Node label
        ctx.font = isHighlighted ? "bold 11px system-ui" : "10px system-ui";
        ctx.fillStyle = isHighlighted ? "#e0e7ff" : "#94a3b8";
        ctx.textAlign = "center";
        ctx.fillText(node.name, node.x, node.y - 14);
      }

      animFrameRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [hoveredNode]);

  // Handle canvas mouse events
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const node = nodesRef.current.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    setHoveredNode(node?.name || null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !graphData) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const node = nodesRef.current.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    if (node) {
      const edge = graphData.edges.find(
        e => e.source === node.name || e.target === node.name
      );
      setSelectedEdge(edge || null);
    } else {
      setSelectedEdge(null);
    }
  }, [graphData]);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Knowledge Graph</h1>
            <p className="text-slate-400 text-sm">
              Visualize connections between entities in your memory.
            </p>
          </div>
          <button
            onClick={fetchGraph}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Graph Stats */}
        {graphData && (
          <div className="flex gap-4 mb-6">
            <div className="glass-card rounded-lg px-4 py-2 text-sm">
              <span className="text-slate-400">Nodes: </span>
              <span className="text-white font-semibold">{graphData.totalNodes}</span>
            </div>
            <div className="glass-card rounded-lg px-4 py-2 text-sm">
              <span className="text-slate-400">Edges: </span>
              <span className="text-white font-semibold">{graphData.totalEdges}</span>
            </div>
            <div className={`rounded-lg px-4 py-2 text-sm ${
              graphData.cogneeAvailable
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-amber-500/10 border border-amber-500/20"
            }`}>
              <span className={graphData.cogneeAvailable ? "text-emerald-400" : "text-amber-400"}>
                Cognee {graphData.cogneeAvailable ? "Active" : "Offline"}
              </span>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-3" />
                <p className="text-slate-300">Loading knowledge graph...</p>
              </div>
            </div>
          ) : graphData && graphData.nodes.length > 0 ? (
            <canvas
              ref={canvasRef}
              width={1200}
              height={600}
              onMouseMove={handleCanvasMouseMove}
              onClick={handleCanvasClick}
              className="w-full cursor-pointer"
              style={{ height: "600px" }}
            />
          ) : (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <div className="text-4xl mb-3">🕸️</div>
                <p className="text-slate-300 font-medium">No knowledge graph yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Add memories with entities and relationships to build your graph.
                </p>
                <Link
                  href="/add"
                  className="inline-block mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors"
                >
                  Add a Memory
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Selected Edge Details */}
        {selectedEdge && (
          <div className="glass-card rounded-xl p-4 mt-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-brand-400 mb-2">Edge Details</h3>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="px-2 py-1 bg-brand-500/20 rounded">{selectedEdge.source}</span>
              <span className="text-brand-400">→ {selectedEdge.relationship} →</span>
              <span className="px-2 py-1 bg-brand-500/20 rounded">{selectedEdge.target}</span>
            </div>
            {selectedEdge.memoryTitle && (
              <p className="text-xs text-slate-500 mt-2">Source: {selectedEdge.memoryTitle}</p>
            )}
          </div>
        )}

        {/* Edge List */}
        {graphData && graphData.edges.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-white mb-4">All Relationships</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {graphData.edges.slice(0, 30).map((edge, i) => (
                <div
                  key={i}
                  className="glass-card glass-card-hover rounded-lg p-3 transition-all duration-200 text-sm"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-brand-300 font-medium">{edge.source}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-slate-400 italic">{edge.relationship}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-emerald-300 font-medium">{edge.target}</span>
                  </div>
                  {edge.memoryTitle && (
                    <p className="text-xs text-slate-600 mt-1 truncate">from: {edge.memoryTitle}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Sidebar() {
  const links = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    { href: "/add", label: "Add Memory", icon: "✏️" },
    { href: "/ask", label: "Ask LifeOS", icon: "🔍" },
    { href: "/graph", label: "Knowledge Graph", icon: "🕸️" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-slate-950 border-r border-slate-800 p-6 flex flex-col shrink-0">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <span className="text-white text-sm font-bold">L</span>
        </div>
        <span className="text-lg font-bold text-white">LifeOS</span>
      </div>
      <nav className="space-y-1 flex-1">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              link.href === "/graph"
                ? "text-white bg-brand-600/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <span className="text-base">{link.icon}</span>
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-slate-800">
        <div className="text-xs text-slate-500">
          <p>Cognee Hackathon 2026</p>
        </div>
      </div>
    </aside>
  );
}
