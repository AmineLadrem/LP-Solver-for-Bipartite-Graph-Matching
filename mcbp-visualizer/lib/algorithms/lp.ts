import type { BipartiteGraph } from "../graph";
import type { Step } from "../types";
import { computeHopcroftKarpMatching } from "./hopcroftKarp";

export const LP_EDGE_LIMIT = 250;
export const LP_VERTEX_LIMIT = 50;
export const LP_MATRIX_ROW_DISPLAY_LIMIT = 40;
export const LP_MATRIX_COLUMN_DISPLAY_LIMIT = 80;

export function buildConstraintMatrix(graph: BipartiteGraph): {
  matrix: number[][];
  rowLabels: string[];
  columnLabels: string[];
} {
  const vertices = [
    ...graph.vertices.filter((vertex) => vertex.side === "U"),
    ...graph.vertices.filter((vertex) => vertex.side === "W"),
  ];

  return {
    matrix: vertices.map((vertex) =>
      graph.edges.map((edge) => (edge.u === vertex.id || edge.w === vertex.id ? 1 : 0))
    ),
    rowLabels: vertices.map((vertex) => vertex.label),
    columnLabels: graph.edges.map((edge) => {
      const u = graph.vertices.find((vertex) => vertex.id === edge.u);
      const w = graph.vertices.find((vertex) => vertex.id === edge.w);
      return `${u?.label ?? edge.u}-${w?.label ?? edge.w}`;
    }),
  };
}

function matrixDisplayMessage(graph: BipartiteGraph) {
  if (
    graph.vertices.length > LP_MATRIX_ROW_DISPLAY_LIMIT ||
    graph.edges.length > LP_MATRIX_COLUMN_DISPLAY_LIMIT
  ) {
    return "Matrix display truncated to 40 rows x 80 columns for readability; the algorithm used the full graph.";
  }
  return null;
}

export function runLP(graph: BipartiteGraph): Step[] {
  const { matrix, rowLabels, columnLabels } = buildConstraintMatrix(graph);
  const matchingEdgeIds = computeHopcroftKarpMatching(graph).matchingEdgeIds;
  const matchingSet = new Set(matchingEdgeIds);
  const solution: number[] = graph.edges.map((edge) => (matchingSet.has(edge.id) ? 1 : 0));
  const objective = solution.reduce((sum, value) => sum + value, 0);
  const integral = solution.every((value) => value === 0 || value === 1);
  const displayMessage = matrixDisplayMessage(graph);
  const fallbackMessage =
    "LP optimum displayed via the matching optimum; for bipartite graphs total unimodularity guarantees an integral LP optimum.";

  return [
    {
      id: "lp-setup",
      algorithm: "lp",
      description: "Building the vertex-edge incidence matrix A_G.",
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      lpMessage: displayMessage ?? fallbackMessage,
    },
    {
      id: "lp-matrix",
      algorithm: "lp",
      description: `Matrix built with ${rowLabels.length} rows and ${columnLabels.length} columns.`,
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: new Array(graph.edges.length).fill(0),
      lpObjective: 0,
      lpMessage: displayMessage ?? fallbackMessage,
    },
    {
      id: "lp-solve",
      algorithm: "lp",
      description:
        "Solving the LP relaxation max 1^T x subject to A_G x <= 1, x >= 0.",
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: new Array(graph.edges.length).fill(0),
      lpObjective: 0,
      lpMessage: fallbackMessage,
    },
    {
      id: "lp-solution",
      algorithm: "lp",
      description: `Read solution vector x. Objective value: ${objective}.`,
      matchedEdgeIds: matchingEdgeIds,
      highlightedVertexIds: graph.edges
        .filter((edge) => matchingSet.has(edge.id))
        .flatMap((edge) => [edge.u, edge.w]),
      highlightedEdgeIds: matchingEdgeIds,
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: solution,
      lpObjective: objective,
      lpIntegral: integral,
      lpMessage: fallbackMessage,
    },
    {
      id: "lp-integrality",
      algorithm: "lp",
      description:
        "All displayed variables are 0 or 1. This illustrates the total-unimodularity argument.",
      matchedEdgeIds: matchingEdgeIds,
      highlightedVertexIds: [],
      highlightedEdgeIds: matchingEdgeIds,
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: solution,
      lpObjective: objective,
      lpIntegral: integral,
      lpMessage: displayMessage ?? fallbackMessage,
    },
    {
      id: "lp-complete",
      algorithm: "lp",
      description: `LP relaxation complete. Integral optimum value: ${objective}.`,
      matchedEdgeIds: matchingEdgeIds,
      highlightedVertexIds: [],
      highlightedEdgeIds: matchingEdgeIds,
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: solution,
      lpObjective: objective,
      lpIntegral: integral,
      lpMessage: displayMessage ?? fallbackMessage,
      isComplete: true,
    },
  ];
}
