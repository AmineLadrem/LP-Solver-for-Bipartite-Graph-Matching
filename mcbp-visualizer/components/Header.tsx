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
          Comparing greedy, Hopcroft&ndash;Karp, and linear programming approaches.
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
            Companion shell for the paper &quot;LP Solvers for Bipartite Graph Matching&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed text-text-secondary">
          <p>
            This companion demo visualizes maximum-cardinality bipartite matching
            approaches for lecture and paper discussion.
          </p>
          <div className="border-t border-border pt-2">
            <p className="text-xs text-text-secondary">
              Algorithm playback and theory notes will be added in the next confirmed steps.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
