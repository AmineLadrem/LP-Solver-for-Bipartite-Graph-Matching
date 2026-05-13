# LP Solvers for Bipartite Graph Matching

This repository contains two independent parts for studying maximum-cardinality
bipartite matching (MCBP): a command-line benchmark layer that runs real solvers,
and a browser-only educational visualizer that explains the same mathematics
without requiring any backend.

---

## Project Overview

Maximum-cardinality bipartite matching is formulated as a linear program over a
bipartite graph `G = (U ∪ W, E)`. One continuous variable `x_e` is introduced
for each edge `e ∈ E`.

**LP formulation**

```text
maximize   Σ_{e ∈ E} x_e

subject to Σ_{e ∈ δ(u)} x_e ≤ 1    for every u ∈ U
           Σ_{e ∈ δ(w)} x_e ≤ 1    for every w ∈ W
           x_e ≥ 0                  for every e ∈ E
```

The vertex-edge incidence matrix `A_G` is **totally unimodular** (TU): every
edge-column contains exactly one 1 in the U-rows and one 1 in the W-rows. By
TU theory, the LP relaxation always has an integral optimal basic feasible
solution, so the LP optimum equals the maximum matching cardinality.

---

## Two Independent Modes

| | Benchmark layer | Web visualizer |
|---|---|---|
| **Location** | `src/`, `python/`, `results/`, `figures/` | `mcbp-visualizer/` |
| **Runtime** | Command line (Python / C++) | Browser only |
| **Solvers** | Gurobi, HiGHS, SciPy, LEMON (real) | In-browser Hopcroft-Karp simulation |
| **Output** | CSV results, benchmark plots | Interactive step-by-step animation |
| **Purpose** | Scientific benchmarking | Teaching and demos |
| **Backend** | Python + C++ binaries | None — fully client-side |

The two parts are **technically independent**: the visualizer has no connection
to the Python backend, no subprocess calls, and no dependency on any external
solver binary. They share the same mathematical formulation, the same solver
names, and the same conceptual explanation.

---

## Benchmark Mode

### Purpose

Run real solvers on generated bipartite graphs, record runtime and memory, and
plot ablation curves over graph size and density.

### Solvers

| Solver | Language | Type |
|---|---|---|
| Gurobi LP | Python + C++ | LP (commercial) |
| HiGHS LP | Python + C++ | LP (open-source) |
| SciPy linprog | Python | LP (open-source) |
| LEMON Hopcroft-Karp | C++ | Combinatorial |

### Dependencies

Python (see `requirements.txt`):

```powershell
python -m pip install -r requirements.txt
```

C++ (CMake 3.20+, C++17 compiler):

- LEMON graph library headers
- HiGHS C++ package (for `highs_lp`)
- Gurobi C API + valid license (for `gurobi_lp`)

### Build C++ Solvers

```powershell
cmake -B build -S . `
  -DLEMON_INCLUDE_DIR="C:/dev/lemon-src/include" `
  -DHIGHS_DIR="C:/dev/highs" `
  -DGUROBI_INCLUDE_DIR="C:/dev/gurobi_include" `
  -DGUROBI_LIB="C:/dev/gurobi130.lib" `
  -DGUROBI_DLL="C:/path/to/gurobi130.dll"

cmake --build build --config Release
```

Targets whose dependencies are missing are skipped. Binaries go to `bin/`.

### Generate Graphs

Default sweep: `n ∈ {64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384}`,
densities `{0.01, 0.025, 0.05, 0.075, 0.1}`, seeds `{0, 1, 2}`.

```powershell
python python/generate_graphs.py
```

Large dense instances are skipped when the target edge count exceeds
`--max-edges` (default: 5,000,000).

Useful variants:

```powershell
python python/generate_graphs.py --sizes 64 128 --densities 0.01 0.05
python python/generate_graphs.py --overwrite
python python/generate_graphs.py --output-dir build/smoke_graphs --sizes 64 --densities 0.01 --seeds 99
```

### Run Correctness Tests

```powershell
python python/test_solvers.py
```

Runs hand-crafted tiny graphs with known optima and a generated medium graph
if it exists.

### Run Experiments

Canonical output:

```powershell
python python/run_experiments.py
```

Smoke test without modifying the canonical CSV:

```powershell
python python/run_experiments.py `
  --sizes 64 --densities 0.01 --seeds 0 `
  --solvers-python lemon_hk gurobi_lp `
  --solvers-cpp lemon_hk gurobi_lp `
  --time-limit 30 `
  --output-csv build/smoke_results.csv `
  --overwrite
```

Common options:

```text
--time-limit SECONDS
--sizes 64 128 256
--densities 0.01 0.05
--seeds 0 1 2
--solvers-python lemon_hk gurobi_lp highs_lp scipy_lp
--solvers-cpp lemon_hk gurobi_lp highs_lp
--solvers-python none
--solvers-cpp none
--overwrite
```

CSV schema:

```text
n, n_left, n_right, density, seed, m, solver, language,
matching_size, time_seconds, peak_memory_mb, status, error_message
```

Statuses: `optimal`, `timeout`, `skipped`, `error`.

### Validate Results

```powershell
python python/validate_results.py
```

Checks for duplicate rows, missing graph/solver combinations, and
matching-size disagreements among solvers that finished optimally.

### Plot Results

```powershell
python python/plot_results.py
```

To show only the primary comparison:

```powershell
python python/plot_results.py --primary-only
```

Figures saved to `figures/`:

- Time vs `n` for fixed densities
- Memory vs `n` for fixed densities
- Time vs density for fixed `n`
- Memory vs density for fixed `n`
- Solver landscape at density 0.05

---

## Web Visualizer Mode

### Purpose

An interactive educational tool for teaching LP formulation and Hopcroft-Karp
algorithm step-by-step. Runs entirely in the browser with no backend.

### Location

`mcbp-visualizer/` — Next.js 14 + React 18 + TypeScript + Tailwind CSS.

### Run Locally

```powershell
cd mcbp-visualizer
npm install
npm run dev
```

Open `http://localhost:3000`.

### Solver Buttons in the UI

The visualizer offers the same four solver names used in the benchmark layer.
Their browser behavior is explicitly educational:

| UI button | What it does in the browser |
|---|---|
| **Gurobi LP model** | Builds the same LP model used by Gurobi. Final matching computed in-browser via Hopcroft-Karp (valid by TU). |
| **HiGHS LP model** | Builds the same LP model used by HiGHS. Final matching computed in-browser via Hopcroft-Karp (valid by TU). |
| **SciPy linprog model** | Builds the same LP model used by SciPy linprog. Final matching computed in-browser via Hopcroft-Karp (valid by TU). |
| **LEMON Hopcroft-Karp** | Runs Hopcroft-Karp in the browser, conceptually matching the LEMON benchmark solver. |

The LP modes animate 10 steps:

1. Input graph G = (U ∪ W, E)
2. Create one variable x_e per edge
3. Create one capacity constraint per vertex
4. Build incidence matrix A_G
5. Explain LP relaxation
6. Explain TU guarantee
7. Compute matching in-browser using Hopcroft-Karp
8. Interpret solution vector x
9. Highlight selected matching edges
10. Show matching size and integrality check

The LEMON mode animates 6 Hopcroft-Karp steps:

1. Start with empty matching
2. BFS layering
3. DFS search for augmenting paths
4. Augment matching
5. Repeat until no augmenting path remains
6. Show final matching

### Why the Web LP Modes are Educationally Valid

The bipartite matching LP has an integral optimal solution by the **total
unimodularity** of `A_G`. This means:

- The LP optimum is always achieved at an integer point (0/1 values).
- The LP optimum equals the maximum matching cardinality.
- Computing the matching with Hopcroft-Karp gives the same solution the LP
  would return.

Therefore the browser can show the correct LP model, the correct constraint
matrix, and the correct integral solution — all without running a real LP solver.
The visualizer is honest about this: every LP mode panel states clearly that the
browser does not run the external solver engine.

### Difference Between Benchmark Solvers and Visualizer Solvers

| Aspect | Benchmark layer | Web visualizer |
|---|---|---|
| Gurobi | Real Gurobi engine, license required | Educational LP model, in-browser HK |
| HiGHS | Real HiGHS library | Educational LP model, in-browser HK |
| SciPy | Real SciPy linprog | Educational LP model, in-browser HK |
| LEMON HK | Real LEMON C++ library | TypeScript HK implementation |
| Timing | Actual wall-clock measurements | No timing (not a benchmark) |
| Memory | Actual peak memory measurements | No memory tracking |

---

## Repository Layout

```text
src/                          C++ solver binaries (lemon_hk, highs_lp, gurobi_lp)
python/                       Python solver wrappers and experiment pipeline
  generate_graphs.py          Random bipartite graph generator
  run_experiments.py          Experiment runner and CSV writer
  plot_results.py             Ablation plots
  test_solvers.py             Deterministic correctness tests
  validate_results.py         CSV validation and solver agreement
  solvers/                    Python solver wrappers
graphs/                       Generated graph files
results/results.csv           Canonical experiment CSV
figures/                      Generated plots
mcbp-visualizer/              Browser-only educational visualizer (Next.js)
  lib/algorithms/lp.ts        LP step generation (10-step sequence per solver mode)
  lib/algorithms/hopcroftKarp.ts  Hopcroft-Karp implementation
  lib/algorithms/greedy.ts    Greedy matching
  lib/types.ts                Shared TypeScript types
  lib/appState.ts             State management
  components/                 React components
presentation-slides/          Presentation materials
```

---

## Troubleshooting

**Gurobi license error**
Gurobi requires a valid local license. Academic licenses are available at
gurobi.com. Without a license, the `gurobi_lp` solver will fail; all other
solvers continue to work.

**C++ build: missing dependency**
If a dependency (LEMON, HiGHS, Gurobi) is not found, CMake skips that target
with a warning. Only the targets with all dependencies present are built.

**C++ memory on non-Windows**
The C++ binaries measure memory using Windows `PeakWorkingSetSize`. On
non-Windows platforms, memory is reported as 0.0 from the binary itself; the
Python runner polls subprocess RSS as a fallback.

**Web visualizer LP size limit**
The LP mode is limited to 50 vertices and 250 edges in the browser. Reduce
graph size or density to enable it.

**Web visualizer: no backend needed**
The visualizer is fully client-side. It does not need Python, C++ binaries, or
any network connection. Run it with `npm run dev` inside `mcbp-visualizer/` and
open the browser.
