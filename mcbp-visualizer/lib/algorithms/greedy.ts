import type { BipartiteGraph } from "../graph";
import type { GreedyStatus, Step } from "../types";

function edgeLabel(graph: BipartiteGraph, u: string, w: string) {
  const uVertex = graph.vertices.find((vertex) => vertex.id === u);
  const wVertex = graph.vertices.find((vertex) => vertex.id === w);
  return `(${uVertex?.label ?? u}, ${wVertex?.label ?? w})`;
}

function statusRecord(graph: BipartiteGraph, defaultStatus: GreedyStatus = "pending") {
  return Object.fromEntries(
    graph.edges.map((edge) => [edge.id, defaultStatus])
  ) as Record<string, GreedyStatus>;
}

export function runGreedy(graph: BipartiteGraph): Step[] {
  const steps: Step[] = [
    {
      id: "greedy-start",
      algorithm: "greedy",
      description: "Greedy considers edges in deterministic seed order.",
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      greedyStatuses: statusRecord(graph),
    },
  ];

  const matchedU = new Set<string>();
  const matchedW = new Set<string>();
  const matchedEdgeIds: string[] = [];
  const greedyStatuses = statusRecord(graph);

  for (let i = 0; i < graph.edges.length; i++) {
    const edge = graph.edges[i];
    const canAdd = !matchedU.has(edge.u) && !matchedW.has(edge.w);

    if (canAdd) {
      matchedU.add(edge.u);
      matchedW.add(edge.w);
      matchedEdgeIds.push(edge.id);
      greedyStatuses[edge.id] = "added";
    } else {
      greedyStatuses[edge.id] = "skipped";
    }

    const reason = canAdd
      ? "neither endpoint was matched yet."
      : matchedU.has(edge.u) && matchedW.has(edge.w)
        ? "both endpoints are already matched."
        : matchedU.has(edge.u)
          ? `${graph.vertices.find((vertex) => vertex.id === edge.u)?.label ?? edge.u} is already matched.`
          : `${graph.vertices.find((vertex) => vertex.id === edge.w)?.label ?? edge.w} is already matched.`;

    steps.push({
      id: `greedy-edge-${i}`,
      algorithm: "greedy",
      description: `Edge ${edgeLabel(graph, edge.u, edge.w)} ${
        canAdd ? "selected" : "skipped"
      } - ${reason}`,
      matchedEdgeIds: [...matchedEdgeIds],
      highlightedVertexIds: [edge.u, edge.w],
      highlightedEdgeIds: [edge.id],
      dimmedEdgeIds: canAdd ? [] : [edge.id],
      consideredEdgeId: edge.id,
      greedyStatuses: { ...greedyStatuses },
    });
  }

  steps.push({
    id: "greedy-complete",
    algorithm: "greedy",
    description: `Greedy complete. Matching size: ${matchedEdgeIds.length}.`,
    matchedEdgeIds: [...matchedEdgeIds],
    highlightedVertexIds: [],
    highlightedEdgeIds: [...matchedEdgeIds],
    greedyStatuses: { ...greedyStatuses },
    isComplete: true,
  });

  return steps;
}
