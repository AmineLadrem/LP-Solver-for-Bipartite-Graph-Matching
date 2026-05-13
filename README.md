# LP Solvers for Bipartite Graph Matching

This project studies **maximum-cardinality bipartite matching** using linear programming and matching algorithms.

It contains two main parts:

1. **Benchmark experiments** for comparing solvers.
2. **A web visualizer** for explaining the matching problem step by step.

---

## Project Overview

Given a bipartite graph, the goal is to find the largest set of edges where no two selected edges share a vertex.

This is called **maximum-cardinality bipartite matching**.

The problem can also be written as a linear program:

```text
maximize   sum of selected edges

subject to each vertex is used at most once
           each edge variable is non-negative
```

For bipartite graphs, the LP relaxation gives an integral solution because the incidence matrix is totally unimodular.
This means the LP optimum is equal to the maximum matching size.

---

## Project Parts

| Part | Folder | Purpose |
|---|---|---|
| Benchmark experiments | `python/`, `src/`, `results/`, `figures/` | Compare solver performance |
| Web visualizer | `mcbp-visualizer/` | Show the algorithms interactively |

The benchmark code and the visualizer are independent.

The visualizer does not use the Python or C++ backend.

---

## Solvers

The benchmark part compares these solvers:

| Solver | Type |
|---|---|
| Gurobi | LP solver |
| HiGHS | LP solver |
| SciPy linprog | LP solver |
| LEMON Hopcroft-Karp | Combinatorial matching algorithm |

---

## How to Run the Experiments

To run the full benchmark experiment, open and run this notebook:

```text
mcbp-experiment/run_full_benchmark.ipynb
```

Run all cells from top to bottom.

The notebook runs the experiment workflow, including graph generation, solver execution, validation, and plotting.

---

## Python Dependencies

Install the Python dependencies with:

```bash
python -m pip install -r requirements.txt
```

---

## C++ Solvers

Some solvers use C++ binaries.

Build them with:

```bash
cmake -B build -S .
cmake --build build --config Release
```

Some C++ solvers need extra dependencies:

- Gurobi needs a valid license
- HiGHS needs the HiGHS C++ package
- LEMON needs the LEMON graph library

If a dependency is missing, that solver is skipped.

---

## Outputs

The experiments create:

```text
results/results.csv    Experiment results
figures/               Generated plots
graphs/                Generated graph instances
```

The result CSV contains solver runtime, memory usage, matching size, status, and possible error messages.

---

## Web Visualizer

Open the visualizer here:

https://lp-solver-for-bipartite-graph-match.vercel.app/

The visualizer explains:

- bipartite matching
- the LP formulation
- the incidence matrix
- total unimodularity
- Hopcroft-Karp
- the final matching result

The LP buttons in the visualizer are educational.
They show the LP model, but the browser computes the final matching using Hopcroft-Karp.
This is valid because the bipartite matching LP has an integral optimum.

---

## Repository Layout

```text
src/                  C++ solver code
python/               Python scripts and solver wrappers
graphs/               Generated graph files
results/              Experiment CSV files
figures/              Generated plots
mcbp-visualizer/      Browser visualizer
presentation-slides/  Presentation material
```

Important Python scripts:

```text
python/generate_graphs.py     Generate random graphs
python/run_experiments.py     Run benchmark experiments
python/test_solvers.py        Test solver correctness
python/validate_results.py    Validate experiment results
python/plot_results.py        Create plots
```

---

## Notes

- Gurobi requires a valid local license.
- Large dense graph instances may be skipped to avoid creating too many edges.
- The web visualizer is fully client-side and does not need Python, C++, or external solvers.
- For the experiment workflow, use `mcbp-experiment/run_full_benchmark.ipynb` instead of running every script one by one.
