import type { BipartiteGraph } from "@/lib/graph";
import {
  LP_MATRIX_COLUMN_DISPLAY_LIMIT,
  LP_MATRIX_ROW_DISPLAY_LIMIT,
} from "@/lib/algorithms/lp";
import type { Step } from "@/lib/types";

interface Props {
  graph: BipartiteGraph;
  currentStep: Step | null;
  restrictionMessage?: string | null;
}

export function LPPanel({ graph, currentStep, restrictionMessage }: Props) {
  const matrix = currentStep?.lpMatrix;
  const rowLabels = currentStep?.lpRowLabels ?? [];
  const columnLabels = currentStep?.lpColumnLabels ?? [];
  const solution = currentStep?.lpSolution ?? [];
  const displayedRows = matrix?.slice(0, LP_MATRIX_ROW_DISPLAY_LIMIT) ?? [];
  const displayedColumns = columnLabels.slice(0, LP_MATRIX_COLUMN_DISPLAY_LIMIT);
  const truncated =
    rowLabels.length > LP_MATRIX_ROW_DISPLAY_LIMIT ||
    columnLabels.length > LP_MATRIX_COLUMN_DISPLAY_LIMIT;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        LP view demonstrates max 1^T x subject to A_G x &lt;= 1 and x &gt;= 0.
      </p>
      {restrictionMessage && (
        <div className="rounded-md border border-[#7c2d12] bg-[#2a160f] p-3 text-sm text-[#fdba74]">
          {restrictionMessage}
        </div>
      )}
      {currentStep?.lpMessage && (
        <div className="rounded-md border border-border bg-surface-raised p-3 text-sm text-text-secondary">
          {currentStep.lpMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Objective" value={currentStep?.lpObjective ?? "-"} />
        <Stat
          label="Integral"
          value={currentStep?.lpIntegral === undefined ? "-" : currentStep.lpIntegral ? "yes" : "no"}
        />
        <Stat label="Vertices" value={graph.vertices.length} />
        <Stat label="Edges" value={graph.edges.length} />
      </div>

      {matrix ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Matrix A_G
          </h3>
          {truncated && (
            <p className="mb-2 text-xs text-[#fbbf24]">
              Matrix display truncated to 40 rows x 80 columns for readability; the
              algorithm used the full graph.
            </p>
          )}
          <div className="max-h-[260px] max-w-full overflow-auto rounded border border-border">
            <table className="border-collapse font-mono text-[10px]">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 border-b border-r border-border bg-surface-raised p-1 text-text-secondary">
                    v/e
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
        <p className="text-sm text-text-secondary">Run LP to build the matrix.</p>
      )}

      {solution.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Solution x
          </h3>
          <div className="max-h-24 overflow-y-auto rounded border border-border p-2 font-mono text-xs text-text-primary">
            {solution.slice(0, 120).map((value, index) => (
              <span key={index} className="mr-3 inline-block">
                x{index + 1}={value}
              </span>
            ))}
            {solution.length > 120 && <span className="text-text-secondary">...</span>}
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
