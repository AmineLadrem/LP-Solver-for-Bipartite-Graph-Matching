# LP Solvers for Bipartite Graph Matching

This project studies **maximum-cardinality bipartite matching**.

It has two independent parts:

1. **Benchmark tools** for running real solvers and saving results.
2. **Web visualizer** for explaining the matching problem in the browser.

---

## Problem

Given a bipartite graph, the goal is to find the largest set of edges where no two selected edges share a vertex.

This is called **maximum-cardinality bipartite matching**.

The problem can also be written as a linear program:

```text
maximize   sum of selected edges
subject to each vertex is used at most once
           each edge variable is non-negative
```

For bipartite graphs, the LP gives an integral solution. This means the LP answer matches the maximum matching answer.

---

## Project Structure

| Part | Folder | Purpose |
|---|---|---|
| Benchmark tools | `python/`, `src/` | Run solvers and measure time/memory |
| Web visualizer | `mcbp-visualizer/` | Show the algorithm step by step |

The visualizer is separate from the benchmark code. It does not use the Python or C++ backend.

---

## Benchmark Tools

Supported solvers:

- Gurobi LP
- HiGHS LP
- SciPy linprog
- LEMON Hopcroft-Karp

Install Python dependencies:

```powershell
python -m pip install -r requirements.txt
```

Build C++ solvers:

```powershell
cmake -B build -S .
cmake --build build --config Release
```

Some solvers need extra dependencies:

- Gurobi needs a valid license
- HiGHS needs the HiGHS C++ package
- LEMON needs the LEMON graph library

If a dependency is missing, that solver is skipped.

---

## Generate Graphs

```powershell
python python/generate_graphs.py
```

Example:

```powershell
python python/generate_graphs.py --sizes 64 128 --densities 0.01 0.05
```

Graphs are saved in `graphs/`.

---

## Run Tests

```powershell
python python/test_solvers.py
```

---

## Run Experiments

```powershell
python python/run_experiments.py
```

Results are saved in `results/results.csv`.

Small smoke test:

```powershell
python python/run_experiments.py `
  --sizes 64 `
  --densities 0.01 `
  --seeds 0 `
  --time-limit 30 `
  --output-csv build/smoke_results.csv `
  --overwrite
```

---

## Validate Results

```powershell
python python/validate_results.py
```

This checks for duplicate rows, missing results, and solver disagreements.

---

## Plot Results

```powershell
python python/plot_results.py
```

Plots are saved in `figures/`.

For only the main comparison plot:

```powershell
python python/plot_results.py --primary-only
```

---

## Web Visualizer

The visualizer is in `mcbp-visualizer/`.

Run it locally:

```powershell
cd mcbp-visualizer
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

The visualizer explains:

- bipartite matching
- the LP model
- the incidence matrix
- total unimodularity
- Hopcroft-Karp
- the final matching

The LP buttons are educational. They show the LP model, but the browser computes the final matching with Hopcroft-Karp.

---

## Main Folders

```text
src/                  C++ solver code
python/               Python scripts and solver wrappers
graphs/               Generated graph files
results/              Experiment CSV files
figures/              Generated plots
mcbp-visualizer/      Browser visualizer
presentation-slides/  Presentation material
```

---

## Notes

- Gurobi needs a valid license.
- Large dense graphs may be skipped to avoid creating too many edges.
- The visualizer is fully client-side and does not need Python, C++, or external solvers.

---

## Summary

Use the benchmark tools to compare solvers.

Use the web visualizer to understand the matching problem and the LP formulation.
