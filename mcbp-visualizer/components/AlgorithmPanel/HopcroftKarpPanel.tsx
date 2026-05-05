import type { BipartiteGraph } from "@/lib/graph";
import type { Step } from "@/lib/types";

interface Props {
  graph: BipartiteGraph;
  currentStep: Step | null;
}

export function HopcroftKarpPanel({ graph, currentStep }: Props) {
  const layers = currentStep?.bfsLayers ?? [];
  const paths = currentStep?.augmentingPaths ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="Phase" value={currentStep?.hkPhase ?? 0} />
        <Stat label="Matched" value={currentStep?.matchedEdgeIds.length ?? 0} />
        <Stat label="Vertices" value={graph.vertices.length} />
        <Stat label="Edges" value={graph.edges.length} />
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          BFS Layers
        </h3>
        {layers.length === 0 ? (
          <p className="text-sm text-text-secondary">Run or step to a BFS phase.</p>
        ) : (
          <div className="space-y-2">
            {layers.map((layer, index) => (
              <div key={`${index}-${layer.join("-")}`} className="rounded border border-border p-2">
                <div className="mb-1 text-xs text-text-secondary">L{index}</div>
                <div className="font-mono text-xs text-text-primary">
                  {layer.length > 0 ? layer.join(", ") : "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Augmenting Paths
        </h3>
        {paths.length === 0 ? (
          <p className="text-sm text-text-secondary">No paths highlighted in this step.</p>
        ) : (
          <div className="space-y-2">
            {paths.map((path, index) => (
              <div key={`${index}-${path.join("-")}`} className="font-mono text-xs text-text-primary">
                {path.join(" -> ")}
              </div>
            ))}
          </div>
        )}
      </section>
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
