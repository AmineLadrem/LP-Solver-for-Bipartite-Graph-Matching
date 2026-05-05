import type { BipartiteGraph } from "@/lib/graph";
import type { Step } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  graph: BipartiteGraph;
  currentStep: Step | null;
}

export function GreedyPanel({ graph, currentStep }: Props) {
  const statuses = currentStep?.greedyStatuses ?? {};

  return (
    <div>
      <p className="mb-3 text-sm text-text-secondary">
        Greedy scans edges in deterministic order and keeps an edge only when both
        endpoints are free.
      </p>
      <div className="max-h-[300px] overflow-y-auto rounded-md border border-border">
        {graph.edges.length === 0 ? (
          <div className="p-3 text-sm text-text-secondary">No edges to consider.</div>
        ) : (
          graph.edges.map((edge, index) => {
            const u = graph.vertices.find((vertex) => vertex.id === edge.u);
            const w = graph.vertices.find((vertex) => vertex.id === edge.w);
            const status = statuses[edge.id] ?? "pending";
            const isCurrent = currentStep?.consideredEdgeId === edge.id;

            return (
              <div
                key={edge.id}
                className={cn(
                  "flex items-center justify-between border-b border-border px-3 py-2 text-xs last:border-b-0",
                  isCurrent && "bg-surface-raised"
                )}
              >
                <span className="font-mono text-text-primary">
                  {index + 1}. {u?.label}-{w?.label}
                </span>
                <span
                  className={cn(
                    "rounded px-2 py-0.5",
                    status === "added" && "bg-accent text-background",
                    status === "skipped" && "bg-[#3f1f1f] text-[#fca5a5]",
                    status === "pending" && "text-text-secondary"
                  )}
                >
                  {status}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
