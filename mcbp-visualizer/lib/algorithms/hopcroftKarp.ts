import type { BipartiteGraph, Edge } from "../graph";
import type { Step } from "../types";

const INF = Number.POSITIVE_INFINITY;

interface HopcroftKarpCoreResult {
  matchingEdgeIds: string[];
  pairU: Map<string, string | null>;
  pairW: Map<string, string | null>;
}

function buildMaps(graph: BipartiteGraph) {
  const uVertices = graph.vertices.filter((vertex) => vertex.side === "U").map((v) => v.id);
  const wVertices = graph.vertices.filter((vertex) => vertex.side === "W").map((v) => v.id);
  const adj = new Map<string, string[]>();
  const edgeByPair = new Map<string, Edge>();

  for (const u of uVertices) adj.set(u, []);
  for (const edge of graph.edges) {
    adj.get(edge.u)?.push(edge.w);
    edgeByPair.set(`${edge.u}|${edge.w}`, edge);
  }

  return { uVertices, wVertices, adj, edgeByPair };
}

function getMatchingEdgeIds(pairU: Map<string, string | null>, edgeByPair: Map<string, Edge>) {
  const ids: string[] = [];
  for (const [u, w] of pairU.entries()) {
    if (w === null) continue;
    const edge = edgeByPair.get(`${u}|${w}`);
    if (edge) ids.push(edge.id);
  }
  return ids;
}

function pathToEdgeIds(path: string[], edgeByPair: Map<string, Edge>) {
  const edgeIds: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const edge = a.startsWith("u")
      ? edgeByPair.get(`${a}|${b}`)
      : edgeByPair.get(`${b}|${a}`);
    if (edge) edgeIds.push(edge.id);
  }
  return edgeIds;
}

export function computeHopcroftKarpMatching(graph: BipartiteGraph): HopcroftKarpCoreResult {
  const { uVertices, wVertices, adj, edgeByPair } = buildMaps(graph);
  const pairU = new Map<string, string | null>(uVertices.map((u) => [u, null]));
  const pairW = new Map<string, string | null>(wVertices.map((w) => [w, null]));
  const dist = new Map<string, number>();

  const bfs = () => {
    const queue: string[] = [];
    let found = false;

    for (const u of uVertices) {
      if (pairU.get(u) === null) {
        dist.set(u, 0);
        queue.push(u);
      } else {
        dist.set(u, INF);
      }
    }

    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      for (const w of adj.get(u) ?? []) {
        const nextU = pairW.get(w) ?? null;
        if (nextU === null) {
          found = true;
        } else if ((dist.get(nextU) ?? INF) === INF) {
          dist.set(nextU, (dist.get(u) ?? 0) + 1);
          queue.push(nextU);
        }
      }
    }

    return found;
  };

  const dfs = (u: string): boolean => {
    for (const w of adj.get(u) ?? []) {
      const nextU = pairW.get(w) ?? null;
      if (
        nextU === null ||
        ((dist.get(nextU) ?? INF) === (dist.get(u) ?? 0) + 1 && dfs(nextU))
      ) {
        pairU.set(u, w);
        pairW.set(w, u);
        return true;
      }
    }
    dist.set(u, INF);
    return false;
  };

  while (bfs()) {
    for (const u of uVertices) {
      if (pairU.get(u) === null) dfs(u);
    }
  }

  return {
    matchingEdgeIds: getMatchingEdgeIds(pairU, edgeByPair),
    pairU,
    pairW,
  };
}

export function runHopcroftKarp(graph: BipartiteGraph): Step[] {
  const { uVertices, wVertices, adj, edgeByPair } = buildMaps(graph);
  const pairU = new Map<string, string | null>(uVertices.map((u) => [u, null]));
  const pairW = new Map<string, string | null>(wVertices.map((w) => [w, null]));
  const dist = new Map<string, number>();
  const steps: Step[] = [
    {
      id: "hk-start",
      algorithm: "hopcroftKarp",
      description:
        "Hopcroft-Karp repeatedly builds BFS layers and augments along shortest vertex-disjoint paths.",
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      bfsLayers: [],
      hkPhase: 0,
    },
  ];

  if (graph.edges.length === 0) {
    steps.push({
      id: "hk-complete",
      algorithm: "hopcroftKarp",
      description: "Hopcroft-Karp complete. Maximum matching size: 0.",
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      bfsLayers: [],
      hkPhase: 0,
      isComplete: true,
    });
    return steps;
  }

  let phase = 0;
  let finalMatching: string[] = [];

  const bfs = () => {
    const queue: string[] = [];
    let shortestFreeWDistance = INF;

    for (const u of uVertices) {
      if (pairU.get(u) === null) {
        dist.set(u, 0);
        queue.push(u);
      } else {
        dist.set(u, INF);
      }
    }

    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      const uDistance = dist.get(u) ?? INF;
      if (uDistance >= shortestFreeWDistance) continue;

      for (const w of adj.get(u) ?? []) {
        const nextU = pairW.get(w) ?? null;
        if (nextU === null) {
          shortestFreeWDistance = uDistance + 1;
        } else if ((dist.get(nextU) ?? INF) === INF) {
          dist.set(nextU, uDistance + 1);
          queue.push(nextU);
        }
      }
    }

    const layerMap = new Map<number, string[]>();
    for (const [u, distance] of dist.entries()) {
      if (distance !== INF && distance < shortestFreeWDistance) {
        layerMap.set(distance, [...(layerMap.get(distance) ?? []), u]);
      }
    }

    const freeWLayer =
      shortestFreeWDistance === INF
        ? []
        : wVertices.filter((w) => pairW.get(w) === null);
    const bfsLayers = [...Array.from(layerMap.keys()).sort((a, b) => a - b).map((key) => layerMap.get(key) ?? [])];
    if (freeWLayer.length > 0) bfsLayers.push(freeWLayer);

    return { found: shortestFreeWDistance !== INF, shortestFreeWDistance, bfsLayers };
  };

  const dfs = (u: string, path: string[]): string[] | null => {
    for (const w of adj.get(u) ?? []) {
      const nextU = pairW.get(w) ?? null;
      if (nextU === null) {
        pairU.set(u, w);
        pairW.set(w, u);
        return [...path, w];
      }
      if ((dist.get(nextU) ?? INF) === (dist.get(u) ?? 0) + 1) {
        const result = dfs(nextU, [...path, w, nextU]);
        if (result) {
          pairU.set(u, w);
          pairW.set(w, u);
          return result;
        }
      }
    }
    dist.set(u, INF);
    return null;
  };

  while (true) {
    phase++;
    steps.push({
      id: `hk-phase-${phase}-start`,
      algorithm: "hopcroftKarp",
      description: `BFS phase ${phase} starting from all unmatched U vertices.`,
      matchedEdgeIds: getMatchingEdgeIds(pairU, edgeByPair),
      highlightedVertexIds: uVertices.filter((u) => pairU.get(u) === null),
      highlightedEdgeIds: [],
      hkPhase: phase,
    });

    const { found, shortestFreeWDistance, bfsLayers } = bfs();
    steps.push({
      id: `hk-phase-${phase}-bfs`,
      algorithm: "hopcroftKarp",
      description: found
        ? `BFS phase ${phase} complete. Shortest augmenting paths have length ${
            shortestFreeWDistance * 2 - 1
          }.`
        : "No augmenting path remains. The matching is maximum.",
      matchedEdgeIds: getMatchingEdgeIds(pairU, edgeByPair),
      highlightedVertexIds: bfsLayers.flat(),
      highlightedEdgeIds: [],
      bfsLayers,
      hkPhase: phase,
    });

    if (!found) break;

    const paths: string[][] = [];
    for (const u of uVertices) {
      if (pairU.get(u) === null) {
        const path = dfs(u, [u]);
        if (path) paths.push(path);
      }
    }

    const highlightedEdgeIds = paths.flatMap((path) => pathToEdgeIds(path, edgeByPair));
    finalMatching = getMatchingEdgeIds(pairU, edgeByPair);

    steps.push({
      id: `hk-phase-${phase}-augment`,
      algorithm: "hopcroftKarp",
      description: `Found ${paths.length} vertex-disjoint augmenting path${
        paths.length === 1 ? "" : "s"
      }. Augmenting now. Matching size is ${finalMatching.length}.`,
      matchedEdgeIds: finalMatching,
      highlightedVertexIds: Array.from(new Set(paths.flat())),
      highlightedEdgeIds,
      bfsLayers,
      hkPhase: phase,
      augmentingPaths: paths,
    });
  }

  finalMatching = getMatchingEdgeIds(pairU, edgeByPair);
  steps.push({
    id: "hk-complete",
    algorithm: "hopcroftKarp",
    description: `Hopcroft-Karp complete. Maximum matching size: ${finalMatching.length}.`,
    matchedEdgeIds: finalMatching,
    highlightedVertexIds: [],
    highlightedEdgeIds: finalMatching,
    hkPhase: Math.max(0, phase - 1),
    isComplete: true,
  });

  return steps;
}
