import type { BipartiteGraph } from "./graph";

export interface VertexLayout {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  side: "U" | "W";
}

export interface GraphLayout {
  vertices: Map<string, VertexLayout>;
  width: number;
  height: number;
}

const MIN_RADIUS = 12;
const MAX_RADIUS = 24;

export function computeLayout(
  graph: BipartiteGraph,
  width: number,
  height: number
): GraphLayout {
  const maxSideCount = Math.max(graph.uSize, graph.wSize);
  const radius = Math.max(
    MIN_RADIUS,
    Math.min(MAX_RADIUS, Math.floor(MAX_RADIUS - Math.max(0, maxSideCount - 6) * 0.5))
  );

  const verticalPadding = Math.max(56, radius * 2.5);
  const availableHeight = Math.max(1, height - verticalPadding * 2);
  const spacing = maxSideCount > 1 ? availableHeight / (maxSideCount - 1) : 0;
  const horizontalPadding =
    width >= 720 ? 200 : Math.max(64, Math.min(140, width * 0.22));

  const leftX = horizontalPadding;
  const rightX = width - horizontalPadding;
  const uTotalHeight = (graph.uSize - 1) * spacing;
  const wTotalHeight = (graph.wSize - 1) * spacing;
  const uStartY = (height - uTotalHeight) / 2;
  const wStartY = (height - wTotalHeight) / 2;
  const vertexLayouts = new Map<string, VertexLayout>();

  for (const vertex of graph.vertices) {
    const y =
      vertex.side === "U"
        ? uStartY + vertex.index * spacing
        : wStartY + vertex.index * spacing;

    vertexLayouts.set(vertex.id, {
      id: vertex.id,
      x: vertex.side === "U" ? leftX : rightX,
      y,
      radius,
      label: vertex.label,
      side: vertex.side,
    });
  }

  return { vertices: vertexLayouts, width, height };
}

export function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const cx1 = x1 + (x2 - x1) * 0.4;
  const cy1 = y1;
  const cx2 = x1 + (x2 - x1) * 0.6;
  const cy2 = y2;
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}
