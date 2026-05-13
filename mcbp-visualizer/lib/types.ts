export type AlgorithmName =
  | "hopcroftKarp"
  | "lp-gurobi"
  | "lp-highs"
  | "lp-scipy"
  | "lp-lemon";

export type LPSolverMode = "lp-gurobi" | "lp-highs" | "lp-scipy" | "lp-lemon";

export interface Step {
  id: string;
  algorithm: AlgorithmName;
  description: string;
  matchedEdgeIds: string[];
  highlightedVertexIds?: string[];
  highlightedEdgeIds?: string[];
  dimmedEdgeIds?: string[];
  consideredEdgeId?: string;
  bfsLayers?: string[][];
  hkPhase?: number;
  augmentingPaths?: string[][];
  lpMatrix?: number[][];
  lpRowLabels?: string[];
  lpColumnLabels?: string[];
  lpSolution?: number[];
  lpObjective?: number;
  lpIntegral?: boolean;
  lpMessage?: string;
  lpSolverMode?: LPSolverMode;
  isComplete?: boolean;
}

export interface AlgorithmResult {
  algorithm: AlgorithmName;
  matchingSize: number;
  stepsTaken: number;
  optimal: boolean | "unknown";
}

export interface RunValidation {
  allowed: boolean;
  reason?: string;
}
