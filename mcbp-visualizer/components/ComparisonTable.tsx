import type { AlgorithmName, AlgorithmResult } from "@/lib/types";

const LABELS: Record<AlgorithmName, string> = {
  greedy: "Greedy",
  hopcroftKarp: "Hopcroft-Karp",
  lp: "LP",
};

interface Props {
  results: AlgorithmResult[];
}

export function ComparisonTable({ results }: Props) {
  return (
    <section className="mt-5 border-t border-border pt-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        Results
      </h2>
      {results.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Completed runs will appear here. Change the graph to clear the table.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[340px] text-left text-sm">
            <thead className="bg-surface-raised text-xs uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="px-3 py-2">Algorithm</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Steps</th>
                <th className="px-3 py-2">Optimal?</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.algorithm} className="border-t border-border text-text-primary">
                  <td className="px-3 py-2">{LABELS[result.algorithm]}</td>
                  <td className="px-3 py-2 font-mono">{result.matchingSize}</td>
                  <td className="px-3 py-2 font-mono">{result.stepsTaken}</td>
                  <td className="px-3 py-2">
                    {result.optimal === "unknown"
                      ? "- Unknown"
                      : result.optimal
                        ? "OK Optimal"
                        : "Not optimal"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
