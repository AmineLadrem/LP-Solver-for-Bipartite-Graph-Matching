"use client";

import {
  Dialog,
  DialogContent,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>About this visualizer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
          <p>
            Fully implemented by{" "}
            <span className="text-text-primary font-medium">Abd-Ul-Haq Amine Ladrem</span>.
          </p>
          <p>
            Project for the seminar{" "}
            <span className="text-text-primary font-medium">
              &ldquo;Knowledge, Reasoning and Planning 2026&rdquo;
            </span>{" "}
            , University of Basel.
          </p>
          <p>
            Want to try the real benchmark layer with Gurobi, HiGHS, SciPy, and LEMON?{" "}
            <a
              href="https://github.com/AmineLadrem/LP-Solver-for-Bipartite-Graph-Matching"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Check the GitHub repo.
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
