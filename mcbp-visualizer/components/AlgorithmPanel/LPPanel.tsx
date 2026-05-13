import type { BipartiteGraph } from "@/lib/graph";
import {
  LP_MATRIX_COLUMN_DISPLAY_LIMIT,
  LP_MATRIX_ROW_DISPLAY_LIMIT,
  LP_SOLVER_DESCRIPTIONS,
  LP_SOLVER_LABELS,
} from "@/lib/algorithms/lp";
import type { LPSolverMode, Step } from "@/lib/types";

interface Props {
  graph: BipartiteGraph;
  currentStep: Step | null;
  restrictionMessage?: string | null;
}

const HONESTY_MESSAGE =
  "The web visualizer is browser-only. It does not run external solvers such as Gurobi, HiGHS, SciPy, or LEMON. It mirrors the same formulations and algorithms used in the benchmark layer. LP modes show model construction and solution interpretation; the final matching is computed with an in-browser Hopcroft-Karp implementation, which is valid here because the bipartite matching LP is integral by total unimodularity.";

const TU_EXPLANATION =
  "A_G is totally unimodular because each column has exactly one 1 in the U-rows and one 1 in the W-rows. Then the LP relaxation always has an integral optimal basic feasible solution.";

export function LPPanel({ graph, currentStep, restrictionMessage }: Props) {
  const matrix = currentStep?.lpMatrix;
  const rowLabels = currentStep?.lpRowLabels ?? [];
  const columnLabels = currentStep?.lpColumnLabels ?? [];
  const solution = currentStep?.lpSolution ?? [];
  const solverMode = currentStep?.lpSolverMode as LPSolverMode | undefined;
  const displayedRows = matrix?.slice(0, LP_MATRIX_ROW_DISPLAY_LIMIT) ?? [];
  const displayedColumns = columnLabels.slice(0, LP_MATRIX_COLUMN_DISPLAY_LIMIT);
  const truncated =
    rowLabels.length > LP_MATRIX_ROW_DISPLAY_LIMIT ||
    columnLabels.length > LP_MATRIX_COLUMN_DISPLAY_LIMIT;

  const uVertices = graph.vertices.filter((v) => v.side === "U");
  const wVertices = graph.vertices.filter((v) => v.side === "W");

  return (
    <div className="space-y-4">
      {/* Honesty banner */}
      <div className="rounded-md border border-[#1d3a5c] bg-[#0d1f33] p-3 text-xs leading-relaxed text-[#93c5fd]">
        {HONESTY_MESSAGE}
      </div>

      {/* Solver description */}
      {solverMode && (
        <div className="rounded-md border border-border bg-surface-raised p-3">
          <p className="mb-1 text-xs font-semibold text-text-secondary">
            {LP_SOLVER_LABELS[solverMode]}
          </p>
          <p className="text-xs leading-relaxed text-text-secondary">
            {LP_SOLVER_DESCRIPTIONS[solverMode]}
          </p>
        </div>
      )}

      {restrictionMessage && (
        <div className="rounded-md border border-[#7c2d12] bg-[#2a160f] p-3 text-sm text-[#fdba74]">
          {restrictionMessage}
        </div>
      )}

      {/* LP formulation */}
      <div className="rounded-md border border-border bg-surface-raised p-3 font-mono text-xs leading-relaxed text-text-secondary">
        <p className="mb-1 font-semibold text-text-primary">LP formulation</p>
        <p>maximize &nbsp; &Sigma; x&#8321;...x&#8346; &nbsp; (one per edge)</p>
        <p>subject to &Sigma;&#8202;&#8202;&#8202;x_e &le; 1 &nbsp; for all u &isin; U</p>
        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &Sigma;&#8202;&#8202;&#8202;x_e &le; 1 &nbsp; for all w &isin; W</p>
        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; x_e &ge; 0 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; for all e &isin; E</p>
      </div>

      {/* TU explanation */}
      <div className="rounded-md border border-[#1a3a2a] bg-[#0a1f14] p-3 text-xs leading-relaxed text-[#86efac]">
        <p className="mb-1 font-semibold">Total Unimodularity Guarantee</p>
        {TU_EXPLANATION}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Objective" value={currentStep?.lpObjective ?? "-"} />
        <Stat
          label="Integral"
          value={
            currentStep?.lpIntegral === undefined
              ? "-"
              : currentStep.lpIntegral
                ? "yes"
                : "no"
          }
        />
        <Stat label="|U|" value={uVertices.length} />
        <Stat label="|W|" value={wVertices.length} />
        <Stat label="|E|" value={graph.edges.length} />
        <Stat label="Vertices" value={graph.vertices.length} />
      </div>

      {/* Step message */}
      {currentStep?.lpMessage && (
        <div className="rounded-md border border-border bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary">
          {currentStep.lpMessage}
        </div>
      )}

      {/* Matrix A_G */}
      {matrix ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Incidence Matrix A_G
          </h3>
          <p className="mb-1 text-xs text-text-secondary">
            Rows: u1…u|U|, w1…w|W| &nbsp;|&nbsp; Columns: e1…e|E|
          </p>
          {truncated && (
            <p className="mb-2 text-xs text-[#fbbf24]">
              Display truncated to {LP_MATRIX_ROW_DISPLAY_LIMIT} rows ×{" "}
              {LP_MATRIX_COLUMN_DISPLAY_LIMIT} columns; the full graph is used for computation.
            </p>
          )}
          <div className="max-h-[260px] max-w-full overflow-auto rounded border border-border">
            <table className="border-collapse font-mono text-[10px]">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 border-b border-r border-border bg-surface-raised p-1 text-text-secondary">
                    v\e
                  </th>
                  {displayedColumns.map((label) => (
                    <th
                      key={label}
                      className="sticky top-0 border-b border-border bg-surface-raised p-1 text-text-secondary"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, rowIndex) => (
                  <tr key={rowLabels[rowIndex] ?? rowIndex}>
                    <th className="sticky left-0 border-r border-border bg-surface-raised p-1 text-text-secondary">
                      {rowLabels[rowIndex]}
                    </th>
                    {row.slice(0, LP_MATRIX_COLUMN_DISPLAY_LIMIT).map((cell, colIndex) => (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        className="border-b border-r border-border px-1.5 py-1 text-center text-text-primary"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="text-sm text-text-secondary">Run LP to build the incidence matrix.</p>
      )}

      {/* Solution vector x */}
      {solution.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Solution vector x
          </h3>
          <div className="max-h-24 overflow-y-auto rounded border border-border p-2 font-mono text-xs text-text-primary">
            {solution.slice(0, 120).map((value, index) => (
              <span key={index} className="mr-3 inline-block">
                x{index + 1}={value}
              </span>
            ))}
            {solution.length > 120 && <span className="text-text-secondary">…</span>}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-surface-raised p-2.5">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="mt-1 font-mono text-base text-text-primary">{value}</dd>
    </div>
  );
}
