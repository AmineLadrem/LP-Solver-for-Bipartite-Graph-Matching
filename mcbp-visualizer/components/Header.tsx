"use client";

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
    <header className="flex h-[72px] shrink-0 items-center border-b border-border bg-surface px-4 md:px-6">
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-base font-semibold leading-tight text-text-primary">
          Bipartite Matching Visualizer
        </h1>
        <p className="truncate text-xs text-text-secondary">
          Educational browser demo &mdash; LP formulation &amp; Hopcroft&ndash;Karp algorithm.
          No backend required.
        </p>
      </div>
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
            <pre className="rounded border border-border bg-surface-raised p-2 font-mono leading-relaxed">
{`maximize   Σ x_e
subject to Σ_{e∈δ(u)} x_e ≤ 1  ∀ u ∈ U
           Σ_{e∈δ(w)} x_e ≤ 1  ∀ w ∈ W
           x_e ≥ 0              ∀ e ∈ E`}
            </pre>
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
