

import argparse
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "python"))

from solvers import gurobi_lp, cplex_lp, highs_lp, scipy_lp, lemon_hk

ALL_SOLVERS = {
    "gurobi_lp": gurobi_lp,
    "cplex_lp":  cplex_lp,
    "highs_lp":  highs_lp,
    "scipy_lp":  scipy_lp,
    "lemon_hk":  lemon_hk,
}


def write_tmp_graph(n_left, n_right, edges) -> str:
    fd = tempfile.NamedTemporaryFile(mode="w", suffix=".graph",
                                     delete=False, encoding="utf-8")
    with fd as f:
        f.write(f"{n_left} {n_right} {len(edges)}\n")
        for u, w in edges:
            f.write(f"{u} {w}\n")
    return fd.name


def case_perfect_matching():
    
    n = 8
    edges = [(i, i) for i in range(n)]
    return ("perfect 8x8 identity matching", n, n, edges, n)


def case_disjoint_pairs():
    
    edges = [(0, 0), (0, 1), (1, 0), (1, 1)]
    return ("complete K(2,2)", 2, 2, edges, 2)


def case_one_to_many():
    
    edges = [(0, j) for j in range(10)]
    return ("star K(1,10)", 1, 10, edges, 1)


def case_path():
    
    edges = [(0, 0), (1, 0), (1, 1), (2, 1)]
    return ("path-shaped", 3, 2, edges, 2)


def case_empty():
    return ("empty graph", 5, 5, [], 0)


HAND_CASES = [
    case_perfect_matching(),
    case_disjoint_pairs(),
    case_one_to_many(),
    case_path(),
    case_empty(),
]


def run_solvers(solvers, graph_path, label, expected=None):
    print(f"\n--- {label} ---")
    sizes = {}
    failures = []
    for name, fn in solvers.items():
        try:
            r = fn(graph_path, time_limit=60.0)
        except Exception as e:
            failures.append(f"{name} crashed: {e}")
            print(f"  {name:<10}: CRASH {e}")
            continue
        st = r.get("status", "?")
        sz = r.get("matching_size", "?")
        t  = r.get("time_seconds", 0.0)
        m  = r.get("peak_memory_mb", 0.0)
        em = r.get("error_message", "")
        if st == "optimal":
            sizes[name] = sz
        elif expected is not None:
            failures.append(f"{name} returned status={st} on known case {label}")
        suffix = f" [{em}]" if em else ""
        print(f"  {name:<10}: status={st:<8} size={sz}  t={t:.4f}s  mem={m:.1f}MB{suffix}")

    if expected is not None:
        for name, sz in sizes.items():
            if sz != expected:
                failures.append(
                    f"{name} returned matching_size={sz}, expected {expected}"
                )
    if len(set(sizes.values())) > 1:
        failures.append(f"solvers disagree on matching size: {sizes}")
    if not sizes:
        failures.append("no solver returned an optimal result")
    return failures


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--solvers", nargs="+", default=list(ALL_SOLVERS),
                   choices=list(ALL_SOLVERS))
    p.add_argument("--medium-graph",
                   default=str(PROJECT_ROOT / "graphs" / "n01024_d050_s00.graph"),
                   help="Optional pre-generated medium graph for cross-solver test.")
    args = p.parse_args()

    chosen = {n: ALL_SOLVERS[n] for n in args.solvers}

    all_failures = []
    tmp_paths = []

    try:
        for label, n_left, n_right, edges, expected in HAND_CASES:
            path = write_tmp_graph(n_left, n_right, edges)
            tmp_paths.append(path)
            all_failures += run_solvers(chosen, path, label, expected=expected)

        med = Path(args.medium_graph)
        if med.exists():
            all_failures += run_solvers(chosen, str(med),
                                        f"medium graph {med.name}")
        else:
            print(f"\n[skip] medium graph not found: {med}")

    finally:
        for p in tmp_paths:
            try:
                Path(p).unlink()
            except OSError:
                pass

    print("\n=========================================================")
    if all_failures:
        print("FAIL")
        for line in all_failures:
            print("  -", line)
        sys.exit(1)
    print("OK - all solvers agree on every test case.")
    sys.exit(0)


if __name__ == "__main__":
    main()
