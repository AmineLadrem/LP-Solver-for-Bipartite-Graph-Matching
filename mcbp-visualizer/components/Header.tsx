"use client";

import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-surface px-4 md:px-6">
      <h1 className="truncate text-sm font-semibold text-text-primary">
        Maximum-Cardinality Bipartite Matching Visualizer
      </h1>
      <div className="ml-auto">
        <AboutDialog />
      </div>
    </header>
  );
}

function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger className="rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent">
        About
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>About this visualizer</DialogTitle>
          <DialogDescription>
            Educational companion to &ldquo;LP Solvers for Bipartite Graph Matching&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
          <p>
            This visualizer demonstrates maximum-cardinality bipartite matching through two
            lenses: the LP relaxation formulation and the Hopcroft&ndash;Karp combinatorial
            algorithm. It is designed for teaching and interactive exploration.
          </p>

          <div className="rounded-md border border-[#1d3a5c] bg-[#0d1f33] p-3 text-xs leading-relaxed text-[#93c5fd]">
            <p className="mb-2 font-semibold text-[#bfdbfe]">Browser-only — no external solvers</p>
            <p>
              This tool does not run Gurobi, HiGHS, SciPy, or LEMON. The LP solver buttons
              (Gurobi LP, HiGHS LP, SciPy linprog) show the same mathematical model used in
              the benchmark layer and compute the final matching in-browser using
              Hopcroft&ndash;Karp. This is mathematically valid because the bipartite matching
              LP is integral by total unimodularity — the LP optimum equals the combinatorial
              optimum.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-semibold text-text-primary">LP formulation (all LP modes)</p>
            <KatexBlock math={String.raw`\begin{aligned}
\max \quad & \sum_{e \in E} x_e \\
\text{s.t.} \quad & \sum_{e \in \delta(u)} x_e \leq 1 & \forall\, u \in U \\
& \sum_{e \in \delta(w)} x_e \leq 1 & \forall\, w \in W \\
& x_e \geq 0 & \forall\, e \in E
\end{aligned}`} />
          </div>

          <div className="space-y-1 text-xs">
            <p className="font-semibold text-text-primary">Two independent modes</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <span className="text-text-primary">Benchmark layer</span> (Python/C++, command-line):
                real solvers, real timings, real memory measurements.
              </li>
              <li>
                <span className="text-text-primary">This visualizer</span> (browser-only):
                educational step-by-step walkthrough, same math, no runtime data.
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KatexBlock({ math }: { math: string }) {
  return (
    <div className="rounded border border-border bg-surface-raised p-3 [&_.katex]:text-text-primary [&_.katex-display]:my-0">
      <BlockMath math={math} />
    </div>
  );
}
