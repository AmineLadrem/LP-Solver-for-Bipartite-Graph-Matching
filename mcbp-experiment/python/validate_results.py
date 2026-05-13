import argparse
import csv
import re
import sys
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT        = Path(__file__).parent.parent
GRAPHS_DIR_DEFAULT  = PROJECT_ROOT / "graphs"
RESULTS_CSV_DEFAULT = PROJECT_ROOT / "results" / "results.csv"
DEFAULT_SOLVERS     = ["gurobi_lp", "highs_lp", "scipy_lp", "lemon_hk"]


def parse_graph_name(name):
    m = re.match(r"n(\d+)_d(\d+)_s(\d+)\.graph$", name)
    if not m:
        return None
    return int(m.group(1)), int(m.group(2)) / 1000.0, int(m.group(3))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--graphs-dir",  type=Path, default=GRAPHS_DIR_DEFAULT)
    p.add_argument("--results-csv", type=Path, default=RESULTS_CSV_DEFAULT)
    p.add_argument("--solvers",     nargs="+", default=DEFAULT_SOLVERS)
    args = p.parse_args()

    if not args.results_csv.exists():
        print(f"Missing results CSV: {args.results_csv}", file=sys.stderr)
        sys.exit(1)

    graph_keys = [
        parse_graph_name(p.name)
        for p in sorted(args.graphs_dir.glob("*.graph"))
        if parse_graph_name(p.name)
    ]

    with open(args.results_csv, newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        if "density" not in row and "d" in row:
            row["density"] = row["d"]
        row["n"]            = int(row["n"])
        row["density"]      = float(row["density"])
        row["seed"]         = int(row["seed"])
        row["matching_size"] = int(row["matching_size"])

    by_key   = defaultdict(list)
    by_graph = defaultdict(list)
    for row in rows:
        key = (row["n"], row["density"], row["seed"], row["solver"], row["language"])
        by_key[key].append(row)
        by_graph[(row["n"], row["density"], row["seed"])].append(row)

    failures = []

    duplicates = [k for k, v in by_key.items() if len(v) > 1]
    if duplicates:
        failures.append(f"Duplicate rows: {len(duplicates)}")

    missing = [
        (n, d, s, solver)
        for n, d, s in graph_keys
        for solver in args.solvers
        if (n, d, s, solver, "python") not in by_key
    ]
    if missing:
        failures.append(f"Missing rows: {len(missing)}")

    disagreements = []
    for gk, grows in by_graph.items():
        sizes = {r["solver"]: r["matching_size"] for r in grows if r["status"] == "optimal"}
        if len(set(sizes.values())) > 1:
            disagreements.append((gk, sizes))
    if disagreements:
        failures.append(f"Matching-size disagreements: {len(disagreements)}")

    status_counts = defaultdict(int)
    for row in rows:
        status_counts[row["status"]] += 1

    print(f"Graphs: {len(graph_keys)}  Rows: {len(rows)}")
    for s in sorted(status_counts):
        print(f"  {s:<10} {status_counts[s]}")

    if missing:
        print("First missing:", missing[:5])
    if disagreements:
        print("First disagreements:", disagreements[:5])

    if failures:
        print("FAIL:", failures)
        sys.exit(1)
    print("OK")


if __name__ == "__main__":
    main()
