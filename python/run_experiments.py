import argparse
import csv
import importlib
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "python"))

from tqdm import tqdm

GRAPHS_DIR_DEFAULT   = PROJECT_ROOT / "graphs"
RESULTS_FILE_DEFAULT = PROJECT_ROOT / "results" / "results.csv"

CSV_FIELDS = [
    "n", "n_left", "n_right", "density", "seed", "m",
    "solver", "language",
    "matching_size", "time_seconds", "peak_memory_mb",
    "status", "error_message",
]

ALL_SOLVERS_PYTHON = ["lemon_hk", "gurobi_lp", "highs_lp", "scipy_lp"]


def parse_graph_name(fname):
    m = re.match(r"n(\d+)_d(\d+)_s(\d+)\.graph$", fname)
    if not m:
        return None
    return int(m.group(1)), int(m.group(2)) / 1000.0, int(m.group(3))


def get_m(path):
    with open(path) as f:
        return int(f.readline().split()[2])


def load_done(csv_path):
    done = set()
    if not csv_path.exists():
        return done
    with open(csv_path, newline="") as f:
        for row in csv.DictReader(f):
            try:
                done.add((
                    int(row["n"]),
                    float(row.get("density", row.get("d", 0))),
                    int(row["seed"]),
                    row["solver"],
                    row["language"],
                ))
            except Exception:
                continue
    return done


def build_solver_list(want):
    solvers = []
    for name in (want or ALL_SOLVERS_PYTHON):
        try:
            mod = importlib.import_module(f"solvers.{name}")
            solvers.append((name, "python", mod.solve))
        except Exception as e:
            print(f"[warn] solver '{name}' skipped: {e}", file=sys.stderr)
    return solvers


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--graphs-dir",     type=Path, default=GRAPHS_DIR_DEFAULT)
    p.add_argument("--output-csv", "--results-csv", type=Path, default=RESULTS_FILE_DEFAULT, dest="output_csv")
    p.add_argument("--solvers-python", nargs="+",   default=None, choices=ALL_SOLVERS_PYTHON + ["none"])
    p.add_argument("--solvers-cpp",    nargs="+",   default=None)
    p.add_argument("--sizes",          type=int,    nargs="+", default=None)
    p.add_argument("--densities",      type=float,  nargs="+", default=None)
    p.add_argument("--seeds",          type=int,    nargs="+", default=None)
    p.add_argument("--time-limit",     type=float,  default=300.0)
    p.add_argument("--limit", "--max-graphs", type=int, default=None, dest="limit")
    p.add_argument("--overwrite", "--force",  action="store_true", dest="overwrite")
    args = p.parse_args()

    args.output_csv.parent.mkdir(parents=True, exist_ok=True)

    graph_files = sorted(
        args.graphs_dir.glob("*.graph"),
        key=lambda p: parse_graph_name(p.name) or (10**9, 1.0, 0),
    )
    if not graph_files:
        print(f"No graph files in {args.graphs_dir}.")
        return

    if args.sizes:
        graph_files = [p for p in graph_files if parse_graph_name(p.name) and parse_graph_name(p.name)[0] in set(args.sizes)]
    if args.densities:
        keep_d = [round(d, 6) for d in args.densities]
        graph_files = [p for p in graph_files if parse_graph_name(p.name) and round(parse_graph_name(p.name)[1], 6) in keep_d]
    if args.seeds:
        graph_files = [p for p in graph_files if parse_graph_name(p.name) and parse_graph_name(p.name)[2] in set(args.seeds)]

    sp = [] if args.solvers_python == ["none"] else args.solvers_python
    solvers = build_solver_list(sp)
    if not solvers:
        print("No solvers available.")
        return

    done = set() if args.overwrite else load_done(args.output_csv)
    write_header = not args.output_csv.exists() or args.output_csv.stat().st_size == 0

    with open(args.output_csv, "a", newline="") as csvf:
        writer = csv.DictWriter(csvf, fieldnames=CSV_FIELDS)
        if write_header:
            writer.writeheader()
            csvf.flush()

        tasks = [(gf, sname, lang, sfn) for gf in graph_files for sname, lang, sfn in solvers]
        if args.limit:
            tasks = tasks[:args.limit]

        for gf, sname, lang, sfn in tqdm(tasks, desc="Experiments"):
            parsed = parse_graph_name(gf.name)
            if not parsed:
                continue
            n, d, seed = parsed
            if (n, d, seed, sname, lang) in done:
                continue
            m = get_m(gf)
            try:
                result = sfn(str(gf), time_limit=args.time_limit)
            except TypeError:
                result = sfn(str(gf))
            row = {
                "n": n, "n_left": n // 2, "n_right": n // 2,
                "density": d, "seed": seed, "m": m,
                "solver": sname, "language": lang,
                "matching_size": result.get("matching_size", -1),
                "time_seconds":  result.get("time_seconds", 0.0),
                "peak_memory_mb": result.get("peak_memory_mb", 0.0),
                "status":        result.get("status", "error"),
                "error_message": result.get("error_message", "") or "",
            }
            writer.writerow(row)
            csvf.flush()
            done.add((n, d, seed, sname, lang))


if __name__ == "__main__":
    main()
