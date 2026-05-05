

from __future__ import annotations

import argparse
import csv
import re
import sys
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
GRAPHS_DIR_DEFAULT = PROJECT_ROOT / "graphs"
RESULTS_CSV_DEFAULT = PROJECT_ROOT / "results" / "results.csv"

DEFAULT_SOLVERS = ["gurobi_lp", "cplex_lp", "highs_lp", "scipy_lp", "lemon_hk"]


def parse_graph_name(name: str):
    m = re.match(r"n(\d+)_d(\d+)_s(\d+)\.graph$", name)
    if not m:
        return None
    return int(m.group(1)), int(m.group(2)) / 1000.0, int(m.group(3))


def read_rows(path: Path) -> list[dict]:
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        if "density" not in row and "d" in row:
            row["density"] = row["d"]
        row["n"] = int(row["n"])
        row["density"] = float(row["density"])
        row["seed"] = int(row["seed"])
        row["m"] = int(row["m"])
        row["matching_size"] = int(row["matching_size"])
    return rows


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--graphs-dir", type=Path, default=GRAPHS_DIR_DEFAULT)
    p.add_argument("--results-csv", type=Path, default=RESULTS_CSV_DEFAULT)
    p.add_argument("--solvers", nargs="+", default=DEFAULT_SOLVERS)
    args = p.parse_args()

    failures = []
    if not args.results_csv.exists():
        print(f"Missing results CSV: {args.results_csv}", file=sys.stderr)
        sys.exit(1)

    graph_keys = []
    for path in sorted(args.graphs_dir.glob("*.graph")):
        parsed = parse_graph_name(path.name)
        if parsed:
            graph_keys.append(parsed)
    if not graph_keys:
        failures.append(f"No graph files found in {args.graphs_dir}")

    rows = read_rows(args.results_csv)
    by_key = defaultdict(list)
    by_graph = defaultdict(list)
    for row in rows:
        key = (
            row["n"], row["density"], row["seed"],
            row["solver"], row["language"],
        )
        by_key[key].append(row)
        by_graph[(row["n"], row["density"], row["seed"])].append(row)

    duplicates = {k: v for k, v in by_key.items() if len(v) > 1}
    if duplicates:
        failures.append(f"Duplicate result keys: {len(duplicates)}")

    missing = []
    for n, density, seed in graph_keys:
        for solver in args.solvers:
            key = (n, density, seed, solver, "python")
            if key not in by_key:
                missing.append(key)
    if missing:
        failures.append(f"Missing graph/solver rows: {len(missing)}")

    disagreements = []
    for graph_key, graph_rows in by_graph.items():
        optimal = {
            row["solver"]: row["matching_size"]
            for row in graph_rows
            if row["status"] == "optimal"
        }
        if len(set(optimal.values())) > 1:
            disagreements.append((graph_key, optimal))
    if disagreements:
        failures.append(f"Matching-size disagreements: {len(disagreements)}")

    print("=== Results validation ===")
    print(f"Graphs found: {len(graph_keys)}")
    print(f"Rows found: {len(rows)}")
    print("Status counts:")
    status_counts = defaultdict(int)
    for row in rows:
        status_counts[row["status"]] += 1
    for status in sorted(status_counts):
        print(f"  {status:<8} {status_counts[status]}")

    if missing:
        print("\nFirst missing rows:")
        for key in missing[:10]:
            print(" ", key)
    if disagreements:
        print("\nFirst disagreements:")
        for graph_key, sizes in disagreements[:10]:
            print(" ", graph_key, sizes)

    if failures:
        print("\nFAIL")
        for item in failures:
            print(" -", item)
        sys.exit(1)

    print("\nOK - no duplicates, no missing Python rows, and optimal solvers agree.")
    sys.exit(0)


if __name__ == "__main__":
    main()
