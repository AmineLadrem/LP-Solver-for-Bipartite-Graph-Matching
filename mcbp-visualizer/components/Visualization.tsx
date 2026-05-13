"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BipartiteGraph } from "@/lib/graph";
import { computeLayout, edgePath } from "@/lib/layout";
import type { Step } from "@/lib/types";

const COLORS = {
  edgeDefault: "#3f3f46",
  edgeMatched: "#00d9ff",
  edgeComplete: "#22c55e",
  vertexCompleteFill: "#12351f",
  edgeHighlighted: "#fbbf24",
  edgeDimmed: "#27272a",
  vertexFill: "#1f1f23",
  vertexBorder: "#3f3f46",
  vertexHighlight: "#00d9ff",
  vertexAugment: "#a78bfa",
  bfsLayerLine: "#2a2a30",
};

interface Props {
  graph: BipartiteGraph;
  currentStep: Step | null;
}

export function Visualization({ graph, currentStep }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 560 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resize = () => {
      const rect = element.getBoundingClientRect();
      setDimensions({
        width: Math.max(320, Math.floor(rect.width)),
        height: Math.max(360, Math.floor(rect.height)),
      });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => computeLayout(graph, dimensions.width, Math.max(312, dimensions.height - 48)),
    [graph, dimensions.height, dimensions.width]
  );
  const graphHeight = Math.max(312, dimensions.height - 48);

  const matchedEdgeIds = useMemo(() => new Set(currentStep?.matchedEdgeIds ?? []), [currentStep]);
  const isCompleteStep = currentStep?.isComplete ?? false;
  const highlightedEdgeIds = useMemo(
    () => new Set(currentStep?.highlightedEdgeIds ?? []),
    [currentStep]
  );
  const dimmedEdgeIds = useMemo(
    () => new Set(currentStep?.dimmedEdgeIds ?? []),
    [currentStep]
  );
  const highlightedVertexIds = useMemo(
    () => new Set(currentStep?.highlightedVertexIds ?? []),
    [currentStep]
  );
  const augmentingPathIds = useMemo(
    () => new Set(currentStep?.augmentingPaths?.flat() ?? []),
    [currentStep]
  );
  const leftColumnX = layout.vertices.get("u0")?.x ?? 32;
  const rightColumnX = layout.vertices.get("w0")?.x ?? dimensions.width - 32;
  const vertexYs = graph.vertices
    .map((vertex) => layout.vertices.get(vertex.id)?.y)
    .filter((y) => y !== undefined);
  const firstVertexY = vertexYs.length > 0 ? Math.min(...vertexYs) : 32;
  const columnLabelY = Number.isFinite(firstVertexY) ? Math.max(28, firstVertexY - 34) : 32;

  return (
    <div
      ref={containerRef}
      className="relative grid h-full w-full grid-rows-[48px_minmax(0,1fr)] overflow-hidden bg-background"
    >
      <div className="row-start-1 flex items-center justify-center border-b border-border bg-background px-4 text-xs text-text-secondary">
        <div className="flex items-center gap-6 rounded-md border border-border bg-surface-raised px-3 py-2">
          <span className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 bg-[#3f3f46]" />
            edge
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-[3px] w-4 bg-accent" />
            matched
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-[2.5px] w-4 bg-[#fbbf24]" />
            exploring
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-[3px] w-4 bg-[#22c55e]" />
            final
          </span>
        </div>
      </div>
      <svg
        width={dimensions.width}
        height={graphHeight}
        viewBox={`0 0 ${dimensions.width} ${graphHeight}`}
        className="row-start-2"
        role="img"
        aria-label={`Bipartite graph with ${graph.uSize} left vertices, ${graph.wSize} right vertices, and ${graph.edges.length} edges`}
      >
        <text
          x={leftColumnX}
          y={columnLabelY}
          fill="#a1a1aa"
          fontSize={12}
          fontWeight={600}
          textAnchor="middle"
        >
          U
        </text>
        <text
          x={rightColumnX}
          y={columnLabelY}
          fill="#a1a1aa"
          fontSize={12}
          fontWeight={600}
          textAnchor="middle"
        >
          W
        </text>

        {(currentStep?.bfsLayers ?? []).map((layer, layerIdx) => {
          const layerVertices = layer
            .map((id) => layout.vertices.get(id))
            .filter((vertex) => vertex !== undefined);
          if (layerVertices.length === 0) return null;

          const ys = layerVertices.map((vertex) => vertex.y);
          const midY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
          return (
            <g key={`layer-${layerIdx}`}>
              <line
                x1={32}
                y1={midY - 30}
                x2={dimensions.width - 32}
                y2={midY - 30}
                stroke={COLORS.bfsLayerLine}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text x={38} y={midY - 38} fontSize={10} fill="#71717a">
                L{layerIdx}
              </text>
            </g>
          );
        })}

        <g>
          {graph.edges.map((edge) => {
            const uLayout = layout.vertices.get(edge.u);
            const wLayout = layout.vertices.get(edge.w);
            if (!uLayout || !wLayout) return null;

            const isMatched = matchedEdgeIds.has(edge.id);
            const isHighlighted = highlightedEdgeIds.has(edge.id);
            const isConsidered = currentStep?.consideredEdgeId === edge.id;
            const isDimmed = dimmedEdgeIds.has(edge.id);
            const stroke =
              isCompleteStep && isMatched
                ? COLORS.edgeComplete
                : isHighlighted
                  ? COLORS.edgeHighlighted
                  : isMatched
                    ? COLORS.edgeMatched
                    : isDimmed
                      ? COLORS.edgeDimmed
                      : COLORS.edgeDefault;

            return (
              <path
                key={edge.id}
                d={edgePath(uLayout.x, uLayout.y, wLayout.x, wLayout.y)}
                fill="none"
                stroke={stroke}
                strokeWidth={isMatched ? 3 : isHighlighted || isConsidered ? 2.5 : 1.5}
                opacity={isDimmed ? 0.25 : isConsidered ? 1 : 0.9}
              />
            );
          })}
        </g>

        <g>
          {graph.vertices.map((vertex) => {
            const vLayout = layout.vertices.get(vertex.id);
            if (!vLayout) return null;

            const isHighlighted = highlightedVertexIds.has(vertex.id);
            const isInPath = augmentingPathIds.has(vertex.id);
            const isMatched =
              graph.edges.some(
                (edge) =>
                  matchedEdgeIds.has(edge.id) && (edge.u === vertex.id || edge.w === vertex.id)
              );
            const stroke = isHighlighted
              ? COLORS.vertexHighlight
              : isInPath
                ? COLORS.vertexAugment
                : isMatched
                  ? isCompleteStep
                    ? COLORS.edgeComplete
                    : COLORS.edgeMatched
                  : COLORS.vertexBorder;
            const fill =
              isCompleteStep && isMatched ? COLORS.vertexCompleteFill : COLORS.vertexFill;

            return (
              <g key={vertex.id}>
                {isHighlighted && (
                  <circle
                    cx={vLayout.x}
                    cy={vLayout.y}
                    r={vLayout.radius + 6}
                    fill="none"
                    stroke={COLORS.vertexHighlight}
                    strokeWidth={1.5}
                    opacity={0.45}
                  />
                )}
                <circle
                  cx={vLayout.x}
                  cy={vLayout.y}
                  r={vLayout.radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isHighlighted || isMatched ? 2 : 1.5}
                />
                <text
                  x={vLayout.x}
                  y={vLayout.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(9, vLayout.radius * 0.65)}
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  fill={isHighlighted || isMatched ? "#e5e5e5" : "#a1a1aa"}
                  pointerEvents="none"
                >
                  {vertex.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

    </div>
  );
}
