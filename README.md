# LP Solver for Bipartite Graph Matching

This repository contains experiments for the maximum-cardinality bipartite
matching problem (MCBP). The main comparison is between an LP formulation
solved by Gurobi/CPLEX and a combinatorial Hopcroft-Karp baseline implemented
with LEMON.

The experiment pipeline is:

1. Generate random bipartite graphs with controlled size and density.
2. Solve each graph with LP solvers and Hopcroft-Karp.
3. Record matching size, running time, memory usage, and status.
4. Plot ablations over graph size and density.

## Formulation

For a bipartite graph `G = (U, V, E)`, define one continuous variable `x_e`
for each edge `e in E`.

Maximize

```text
sum_{e in E} x_e
```

subject to

```text
sum_{e incident to u} x_e <= 1    for every u in U
sum_{e incident to v} x_e <= 1    for every v in V
0 <= x_e <= 1                    for every e in E
```

The bipartite matching polytope is integral, so the LP optimum should be an
integer maximum matching cardinality.

## Repository Layout

```text
python/generate_graphs.py     random bipartite graph generator
python/run_experiments.py     experiment runner and CSV writer
python/plot_results.py        ablation plots
python/test_solvers.py        deterministic correctness tests
python/validate_results.py    CSV validation and solver agreement checks
python/solvers/               Python solver wrappers
src/                          C++ solver binaries
graphs/                       generated graph files
results/results.csv           canonical experiment CSV
figures/                      generated plots
```

## Dependencies

Python dependencies are listed in `requirements.txt`:

```powershell
python -m pip install -r requirements.txt
```

The optional commercial solvers require working local installations/licenses:

- Gurobi / `gurobipy`
- IBM CPLEX / `cplex`

The C++ binaries require:

- CMake 3.20+
- a C++17 compiler
- LEMON headers
- HiGHS C++ package, if building `highs_lp`
- Gurobi C API, if building `gurobi_lp`
- CPLEX Studio, if building `cplex_lp`

## Build C++ Solvers

The CMake file exposes dependency paths as cache variables. Example on
Windows:

```powershell
cmake -B build -S . `
  -DLEMON_INCLUDE_DIR="C:/dev/lemon-src/include" `
  -DHIGHS_DIR="C:/dev/highs" `
  -DGUROBI_INCLUDE_DIR="C:/dev/gurobi_include" `
  -DGUROBI_LIB="C:/dev/gurobi130.lib" `
  -DGUROBI_DLL="C:/path/to/gurobi130.dll" `
  -DCPLEX_ROOT="C:/Program Files/IBM/ILOG/CPLEX_Studio_Community2212"

cmake --build build --config Release
```

Targets whose dependencies are missing are skipped with warnings. Binaries are
written to `bin/`.

## Generate Graphs

Default sweep:

- total vertices `n`: 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384
- densities: 0.01, 0.025, 0.05, 0.075, 0.1
- seeds: 0, 1, 2

```powershell
python python/generate_graphs.py
```

Large dense instances are skipped when their target edge count exceeds
`--max-edges` (default: 5,000,000). This keeps the largest `n=16384`,
`density>=0.075` instances from becoming intractable.

Useful variants:

```powershell
python python/generate_graphs.py --sizes 64 128 --densities 0.01 0.05
python python/generate_graphs.py --overwrite
python python/generate_graphs.py --output-dir build/smoke_graphs --sizes 64 --densities 0.01 --seeds 99
```

## Run Correctness Tests

```powershell
python python/test_solvers.py
```

This runs hand-crafted tiny graphs with known optima and a generated medium
graph if it exists. CPLEX may report `skipped` on instances above the CPLEX
Community Edition 1000-variable limit.

## Run Experiments

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
--solvers-python lemon_hk gurobi_lp cplex_lp highs_lp scipy_lp
--solvers-cpp lemon_hk gurobi_lp cplex_lp highs_lp
--solvers-python none
--solvers-cpp none
--overwrite
```

The stable CSV schema is:

```text
n,n_left,n_right,density,seed,m,solver,language,
matching_size,time_seconds,peak_memory_mb,status,error_message
```

Statuses are `optimal`, `timeout`, `skipped`, or `error`.

## Validate Results

```powershell
python python/validate_results.py
```

The validator checks for duplicate rows, missing graph/solver combinations, and
matching-size disagreements among solvers that finished optimally.

## Plot Results

```powershell
python python/plot_results.py
```

The default main plots include Gurobi, HiGHS, SciPy, and LEMON. To show only
the supervisor-required comparison:

```powershell
python python/plot_results.py --primary-only
```

Figures are saved to `figures/`:

- time vs `n` for fixed density
- memory vs `n` for fixed density
- time vs density for fixed `n`
- memory vs density for fixed `n`
- solver landscape at density 0.05
- small-instance CPLEX comparison

## Known Limitations

- CPLEX Community Edition is limited to 1000 variables, so many larger graphs
  are marked `skipped`.
- Gurobi and CPLEX require valid local licenses.
- C++ memory measurement uses Windows `PeakWorkingSetSize`; non-Windows builds
  currently report `0.0` from the child process, though the Python parent still
  polls subprocess RSS when experiments are run through `run_experiments.py`.
- The graph generator intentionally skips very large dense cases above the edge
  cap. This is part of the tractability policy described in the experiment.
