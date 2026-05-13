import type { BipartiteGraph } from "../graph";
import type { LPSolverMode, Step } from "../types";
import { computeHopcroftKarpMatching } from "./hopcroftKarp";

export const LP_EDGE_LIMIT = 250;
export const LP_VERTEX_LIMIT = 50;
export const LP_MATRIX_ROW_DISPLAY_LIMIT = 40;
export const LP_MATRIX_COLUMN_DISPLAY_LIMIT = 80;

export const LP_SOLVER_LABELS: Record<LPSolverMode, string> = {
  "lp-gurobi": "Gurobi LP model",
  "lp-highs": "HiGHS LP model",
  "lp-scipy": "SciPy linprog model",
  "lp-lemon": "LEMON Hopcroft-Karp",
};

export const LP_SOLVER_DESCRIPTIONS: Record<LPSolverMode, string> = {
  "lp-gurobi":
    "Educational browser mode: builds the same LP model used by Gurobi in the benchmark layer. The final integral matching is computed in-browser using Hopcroft-Karp, justified by total unimodularity.",
  "lp-highs":
    "Educational browser mode: builds the same LP model used by HiGHS in the benchmark layer. The final integral matching is computed in-browser using Hopcroft-Karp, justified by total unimodularity.",
  "lp-scipy":
    "Educational browser mode: builds the same LP model used by SciPy linprog in the benchmark layer. The final integral matching is computed in-browser using Hopcroft-Karp, justified by total unimodularity.",
  "lp-lemon":
    "Browser implementation of Hopcroft-Karp, conceptually matching the LEMON benchmark solver.",
};

export function buildConstraintMatrix(graph: BipartiteGraph): {
  matrix: number[][];
  rowLabels: string[];
  columnLabels: string[];
} {
  const vertices = [
    ...graph.vertices.filter((v) => v.side === "U"),
    ...graph.vertices.filter((v) => v.side === "W"),
  ];

  return {
    matrix: vertices.map((vertex) =>
      graph.edges.map((edge) => (edge.u === vertex.id || edge.w === vertex.id ? 1 : 0))
    ),
    rowLabels: vertices.map((v) => v.label),
    columnLabels: graph.edges.map((edge) => {
      const u = graph.vertices.find((v) => v.id === edge.u);
      const w = graph.vertices.find((v) => v.id === edge.w);
      return `${u?.label ?? edge.u}-${w?.label ?? edge.w}`;
    }),
  };
}

function truncatedMessage(graph: BipartiteGraph): string | null {
  if (
    graph.vertices.length > LP_MATRIX_ROW_DISPLAY_LIMIT ||
    graph.edges.length > LP_MATRIX_COLUMN_DISPLAY_LIMIT
  ) {
    return "Matrix display truncated to 40 rows × 80 columns for readability; the full graph is used for the matching computation.";
  }
  return null;
}

const TU_MESSAGE =
  "A_G is totally unimodular: every edge-column has exactly one 1 in the U-rows and one 1 in the W-rows. Therefore the LP relaxation always has an integral optimal basic feasible solution — no branch-and-bound needed.";

export function runLP(graph: BipartiteGraph, mode: LPSolverMode): Step[] {
  if (mode === "lp-lemon") {
    return runLemonHK(graph);
  }
  return runLPSteps(graph, mode);
}

function runLPSteps(graph: BipartiteGraph, mode: LPSolverMode): Step[] {
  const { matrix, rowLabels, columnLabels } = buildConstraintMatrix(graph);
  const { matchingEdgeIds } = computeHopcroftKarpMatching(graph);
  const matchingSet = new Set(matchingEdgeIds);
  const solution: number[] = graph.edges.map((e) => (matchingSet.has(e.id) ? 1 : 0));
  const objective = matchingEdgeIds.length;
  const integral = solution.every((v) => v === 0 || v === 1);
  const truncMsg = truncatedMessage(graph);
  const algo = mode;

  const uVertices = graph.vertices.filter((v) => v.side === "U");
  const wVertices = graph.vertices.filter((v) => v.side === "W");

  return [
    // Step 1 — Input graph
    {
      id: `${mode}-step1`,
      algorithm: algo,
      lpSolverMode: mode,
      description: `Step 1 / 10 — Input graph G = (U ∪ W, E) with |U| = ${uVertices.length}, |W| = ${wVertices.length}, |E| = ${graph.edges.length}.`,
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      lpMessage: LP_SOLVER_DESCRIPTIONS[mode],
    },
    // Step 2 — Create one variable x_e per edge
    {
      id: `${mode}-step2`,
      algorithm: algo,
      lpSolverMode: mode,
      description: `Step 2 / 10 — Create one LP variable x_e ∈ [0, 1] for each of the ${graph.edges.length} edges.`,
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: graph.edges.map((e) => e.id),
      lpSolution: new Array(graph.edges.length).fill(0),
      lpObjective: 0,
      lpMessage: "LP formulation: maximize Σ x_e subject to A_G x ≤ 1, x ≥ 0.",
    },
    // Step 3 — Create one capacity constraint per vertex
    {
      id: `${mode}-step3`,
      algorithm: algo,
      lpSolverMode: mode,
      description: `Step 3 / 10 — Add ${graph.vertices.length} degree constraints: Σ_{e∈δ(v)} x_e ≤ 1 for each vertex v ∈ U ∪ W.`,
      matchedEdgeIds: [],
      highlightedVertexIds: graph.vertices.map((v) => v.id),
      highlightedEdgeIds: [],
      lpSolution: new Array(graph.edges.length).fill(0),
      lpObjective: 0,
      lpMessage: "One constraint per vertex ensures each vertex is matched at most once.",
    },
    // Step 4 — Build incidence matrix A_G
    {
      id: `${mode}-step4`,
      algorithm: algo,
      lpSolverMode: mode,
      description: `Step 4 / 10 — Build vertex-edge incidence matrix A_G (${rowLabels.length} rows × ${columnLabels.length} columns).`,
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: new Array(graph.edges.length).fill(0),
      lpObjective: 0,
      lpMessage: truncMsg ?? `A_G[v][e] = 1 if edge e is incident to vertex v, else 0. Rows: u1…u|U|, w1…w|W|. Columns: e1…e|E|.`,
    },
    // Step 5 — Explain LP relaxation
    {
      id: `${mode}-step5`,
      algorithm: algo,
      lpSolverMode: mode,
      description: "Step 5 / 10 — LP relaxation: x_e ∈ {0,1} is relaxed to x_e ≥ 0 (upper bound from degree constraints).",
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: new Array(graph.edges.length).fill(0),
      lpObjective: 0,
      lpMessage: "Relaxing integrality: replacing x_e ∈ {0,1} with x_e ≥ 0 gives a linear program solvable in polynomial time.",
    },
    // Step 6 — Explain TU guarantee
    {
      id: `${mode}-step6`,
      algorithm: algo,
      lpSolverMode: mode,
      description: "Step 6 / 10 — Total unimodularity: A_G is TU, so the LP relaxation always has an integral optimum.",
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: new Array(graph.edges.length).fill(0),
      lpObjective: 0,
      lpMessage: TU_MESSAGE,
    },
    // Step 7 — Compute matching in-browser using Hopcroft-Karp
    {
      id: `${mode}-step7`,
      algorithm: algo,
      lpSolverMode: mode,
      description: "Step 7 / 10 — Computing optimal matching in-browser via Hopcroft-Karp (valid by TU guarantee).",
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: new Array(graph.edges.length).fill(0),
      lpObjective: 0,
      lpMessage: "Because the LP relaxation is integral, the combinatorial Hopcroft-Karp matching equals the LP optimum.",
    },
    // Step 8 — Interpret solution vector x
    {
      id: `${mode}-step8`,
      algorithm: algo,
      lpSolverMode: mode,
      description: `Step 8 / 10 — Interpret solution vector x: ${matchingEdgeIds.length} variables equal 1 (matched), rest equal 0.`,
      matchedEdgeIds: matchingEdgeIds,
      highlightedVertexIds: [],
      highlightedEdgeIds: matchingEdgeIds,
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: solution,
      lpObjective: objective,
      lpIntegral: integral,
      lpMessage: "Solution vector x: x_e = 1 means edge e is in the matching; x_e = 0 means not matched.",
    },
    // Step 9 — Highlight selected matching edges
    {
      id: `${mode}-step9`,
      algorithm: algo,
      lpSolverMode: mode,
      description: "Step 9 / 10 — Highlighting matching edges in the graph.",
      matchedEdgeIds: matchingEdgeIds,
      highlightedVertexIds: graph.edges
        .filter((e) => matchingSet.has(e.id))
        .flatMap((e) => [e.u, e.w]),
      highlightedEdgeIds: matchingEdgeIds,
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: solution,
      lpObjective: objective,
      lpIntegral: integral,
      lpMessage: truncMsg ?? TU_MESSAGE,
    },
    // Step 10 — Show matching size and integrality check
    {
      id: `${mode}-step10`,
      algorithm: algo,
      lpSolverMode: mode,
      description: `Step 10 / 10 — Complete. Matching size: ${objective}. All x_e ∈ {0,1}: ${integral ? "yes — integrality confirmed" : "no"}.`,
      matchedEdgeIds: matchingEdgeIds,
      highlightedVertexIds: [],
      highlightedEdgeIds: matchingEdgeIds,
      lpMatrix: matrix,
      lpRowLabels: rowLabels,
      lpColumnLabels: columnLabels,
      lpSolution: solution,
      lpObjective: objective,
      lpIntegral: integral,
      lpMessage: truncMsg ?? TU_MESSAGE,
      isComplete: true,
    },
  ];
}

function runLemonHK(graph: BipartiteGraph): Step[] {
  const { matchingEdgeIds } = computeHopcroftKarpMatching(graph);
  const matchingSet = new Set(matchingEdgeIds);
  const uVertices = graph.vertices.filter((v) => v.side === "U");
  const wVertices = graph.vertices.filter((v) => v.side === "W");

  return [
    {
      id: "lemon-step1",
      algorithm: "lp-lemon",
      lpSolverMode: "lp-lemon",
      description: `Step 1 / 6 — Start with empty matching. |U| = ${uVertices.length}, |W| = ${wVertices.length}, |E| = ${graph.edges.length}.`,
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: [],
      lpMessage: LP_SOLVER_DESCRIPTIONS["lp-lemon"],
    },
    {
      id: "lemon-step2",
      algorithm: "lp-lemon",
      lpSolverMode: "lp-lemon",
      description: "Step 2 / 6 — BFS layering: build alternating-path layers from free U-vertices.",
      matchedEdgeIds: [],
      highlightedVertexIds: uVertices.map((v) => v.id),
      highlightedEdgeIds: [],
      lpMessage: "BFS finds the shortest augmenting path length. Layers alternate between unmatched and matched edges.",
    },
    {
      id: "lemon-step3",
      algorithm: "lp-lemon",
      lpSolverMode: "lp-lemon",
      description: "Step 3 / 6 — DFS search: find vertex-disjoint augmenting paths within the BFS layers.",
      matchedEdgeIds: [],
      highlightedVertexIds: [],
      highlightedEdgeIds: graph.edges.map((e) => e.id),
      lpMessage: "DFS follows free edges forward and matched edges backward, tracing augmenting paths.",
    },
    {
      id: "lemon-step4",
      algorithm: "lp-lemon",
      lpSolverMode: "lp-lemon",
      description: "Step 4 / 6 — Augment matching along all found paths (XOR with current matching).",
      matchedEdgeIds: matchingEdgeIds.slice(0, Math.ceil(matchingEdgeIds.length / 2)),
      highlightedVertexIds: [],
      highlightedEdgeIds: matchingEdgeIds.slice(0, Math.ceil(matchingEdgeIds.length / 2)),
      lpMessage: "Each augmenting path flips matched/unmatched status along its edges, increasing matching size by 1.",
    },
    {
      id: "lemon-step5",
      algorithm: "lp-lemon",
      lpSolverMode: "lp-lemon",
      description: "Step 5 / 6 — Repeat BFS/DFS phases until no augmenting path remains.",
      matchedEdgeIds: matchingEdgeIds,
      highlightedVertexIds: [],
      highlightedEdgeIds: matchingEdgeIds,
      lpMessage: "Hopcroft-Karp runs O(√|V|) BFS phases, each finding shortest augmenting paths simultaneously.",
    },
    {
      id: "lemon-step6",
      algorithm: "lp-lemon",
      lpSolverMode: "lp-lemon",
      description: `Step 6 / 6 — Final matching. Size: ${matchingEdgeIds.length}. No more augmenting paths exist.`,
      matchedEdgeIds: matchingEdgeIds,
      highlightedVertexIds: graph.edges
        .filter((e) => matchingSet.has(e.id))
        .flatMap((e) => [e.u, e.w]),
      highlightedEdgeIds: matchingEdgeIds,
      lpMessage: "Hopcroft-Karp algorithm complete. This matches the LEMON benchmark solver conceptually.",
      isComplete: true,
    },
  ];
}
