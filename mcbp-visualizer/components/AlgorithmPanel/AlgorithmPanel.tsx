import { GreedyPanel } from "@/components/AlgorithmPanel/GreedyPanel";
import { HopcroftKarpPanel } from "@/components/AlgorithmPanel/HopcroftKarpPanel";
import { LPPanel } from "@/components/AlgorithmPanel/LPPanel";
import { ComparisonTable } from "@/components/ComparisonTable";
import type { BipartiteGraph } from "@/lib/graph";
import { isLPAlgorithm } from "@/lib/appState";
import type { AlgorithmName, AlgorithmResult, Step } from "@/lib/types";

interface Props {
  algorithm: AlgorithmName;
  graph: BipartiteGraph;
  currentStep: Step | null;
  statusMessage: string;
  warningMessage: string | null;
  stepMessage: string;
  results: AlgorithmResult[];
  restrictionMessage?: string | null;
}

const ALGORITHM_SECTION_LABELS: Record<AlgorithmName, string> = {
  greedy: "Greedy",
  hopcroftKarp: "Hopcroft-Karp",
  "lp-gurobi": "Gurobi LP Model",
  "lp-highs": "HiGHS LP Model",
  "lp-scipy": "SciPy linprog Model",
  "lp-lemon": "LEMON Hopcroft-Karp",
};

export function AlgorithmPanel({
  algorithm,
  graph,
  currentStep,
  statusMessage,
  warningMessage,
  stepMessage,
  results,
  restrictionMessage,
}: Props) {
  const isLP = isLPAlgorithm(algorithm);
  const isLemon = algorithm === "lp-lemon";
  const isHK = algorithm === "hopcroftKarp";

  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto bg-surface p-4 xl:p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {ALGORITHM_SECTION_LABELS[algorithm]}
      </h2>

      {algorithm === "greedy" && <GreedyPanel graph={graph} currentStep={currentStep} />}

      {(isHK || isLemon) && (
        <HopcroftKarpPanel graph={graph} currentStep={currentStep} algorithm={algorithm} />
      )}

      {isLP && !isLemon && (
        <LPPanel
          graph={graph}
          currentStep={currentStep}
          restrictionMessage={restrictionMessage}
        />
      )}

      <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm leading-relaxed text-text-secondary">
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Current Step
          </h3>
          <p className="text-text-primary">{stepMessage}</p>
        </div>
        <p>{statusMessage}</p>
        {warningMessage && <p className="text-[#fbbf24]">{warningMessage}</p>}
      </div>
      <ComparisonTable results={results} />
    </aside>
  );
}
