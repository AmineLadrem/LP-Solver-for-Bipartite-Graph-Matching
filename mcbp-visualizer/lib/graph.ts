export interface Vertex {
  id: string;
  side: "U" | "W";
  index: number;
  label: string;
}

export interface Edge {
  id: string;
  u: string;
  w: string;
}

export interface BipartiteGraph {
  vertices: Vertex[];
  edges: Edge[];
  uSize: number;
  wSize: number;
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateGraph(
  uSize: number,
  wSize: number,
  density: number,
  seed: number
): BipartiteGraph {
  const rand = mulberry32(seed);
  const clampedDensity = Math.max(0, Math.min(1, density));

  const vertices: Vertex[] = [];
  for (let i = 0; i < uSize; i++) {
    vertices.push({
      id: `u${i}`,
      side: "U",
      index: i,
      label: `u${i + 1}`,
    });
  }
  for (let i = 0; i < wSize; i++) {
    vertices.push({
      id: `w${i}`,
      side: "W",
      index: i,
      label: `w${i + 1}`,
    });
  }

  const edges: Edge[] = [];
  for (let i = 0; i < uSize; i++) {
    for (let j = 0; j < wSize; j++) {
      if (rand() < clampedDensity) {
        edges.push({
          id: `e_u${i}_w${j}`,
          u: `u${i}`,
          w: `w${j}`,
        });
      }
    }
  }

  return { vertices, edges, uSize, wSize };
}

export function getVertex(graph: BipartiteGraph, id: string): Vertex | undefined {
  return graph.vertices.find((v) => v.id === id);
}

export function getEdgesForVertex(graph: BipartiteGraph, vertexId: string): Edge[] {
  return graph.edges.filter((e) => e.u === vertexId || e.w === vertexId);
}

export function getNeighbors(graph: BipartiteGraph, vertexId: string): string[] {
  return graph.edges
    .filter((e) => e.u === vertexId || e.w === vertexId)
    .map((e) => (e.u === vertexId ? e.w : e.u));
}
