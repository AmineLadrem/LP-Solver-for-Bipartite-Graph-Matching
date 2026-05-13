

import argparse
import csv
import os
import re
import subprocess
import sys
import threading
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "python"))

from tqdm import tqdm

GRAPHS_DIR_DEFAULT  = PROJECT_ROOT / "graphs"
RESULTS_FILE_DEFAULT = PROJECT_ROOT / "results" / "results.csv"
BIN_DIR             = PROJECT_ROOT / "bin"

CSV_FIELDS = [
    "n", "n_left", "n_right", "density", "seed", "m",
    "solver", "language",
    "matching_size", "time_seconds", "peak_memory_mb",
    "status", "error_message",
]

ALL_SOLVERS_PYTHON = ["lemon_hk", "gurobi_lp", "highs_lp", "scipy_lp"]
ALL_SOLVERS_CPP    = ["lemon_hk", "gurobi_lp", "highs_lp"]


def parse_graph_name(fname: str):
    m = re.match(r"n(\d+)_d(\d+)_s(\d+)\.graph$", fname)
    if not m:
        return None
    n      = int(m.group(1))
    d      = int(m.group(2)) / 1000.0
    seed   = int(m.group(3))
    return n, d, seed


def get_m(path: Path) -> int:
    with open(path) as f:
        return int(f.readline().split()[2])


def load_done(csv_path: Path) -> set:
    
    done = set()
    if not csv_path.exists():
        return done
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
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


def make_cpp_solver(binary_name: str):
    
    import psutil

    exe_suffix = ".exe" if os.name == "nt" else ""
    exe = BIN_DIR / f"{binary_name}{exe_suffix}"

    def _poll(stop_event, peak_mb, pid_holder):
        while not stop_event.is_set():
            try:
                pid = pid_holder[0]
                if pid is not None:
                    mb = psutil.Process(pid).memory_info().rss / 1024 / 1024
                    if mb > peak_mb[0]:
                        peak_mb[0] = mb
            except Exception:
                pass
            time.sleep(0.05)

    def solve(graph_path: str, time_limit: float = 300.0) -> dict:
        if not exe.exists():
            return {
                "matching_size": -1, "time_seconds": 0.0, "peak_memory_mb": 0.0,
                "status": "error",
                "error_message": f"Binary not found: {exe}",
            }
        peak_mb    = [0.0]
        pid_holder = [None]
        stop_event = threading.Event()
        mon = threading.Thread(target=_poll,
                               args=(stop_event, peak_mb, pid_holder),
                               daemon=True)
        mon.start()
        t0 = time.perf_counter()
        try:
            proc = subprocess.Popen(
                [str(exe), str(graph_path), "--time-limit", str(time_limit)],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            )
            pid_holder[0] = proc.pid
            try:
                stdout, stderr = proc.communicate(timeout=time_limit + 30.0)
            except subprocess.TimeoutExpired:
                proc.kill(); proc.communicate()
                return {
                    "matching_size": -1,
                    "time_seconds": time.perf_counter() - t0,
                    "peak_memory_mb": peak_mb[0],
                    "status": "timeout",
                    "error_message": f"Parent killed {binary_name} after {time_limit}s",
                }
            elapsed = time.perf_counter() - t0

            parsed = {}
            status_line = None
            error_line = ""
            for line in stdout.splitlines():
                tokens = line.strip().split(maxsplit=1)
                if not tokens:
                    continue
                key = tokens[0]
                rest = tokens[1] if len(tokens) > 1 else ""
                if   key == "MATCHING_SIZE":   parsed["matching_size"]   = int(rest)
                elif key == "TIME_SECONDS":    parsed["time_seconds"]    = float(rest)
                elif key == "PEAK_MEMORY_MB":  parsed["peak_memory_mb"]  = float(rest)
                elif key == "STATUS":          status_line               = rest.strip()
                elif key == "ERROR_MESSAGE":   error_line                = rest.strip()

            if proc.returncode != 0 and status_line not in ("timeout", "skipped"):
                return {
                    "matching_size": -1,
                    "time_seconds": elapsed,
                    "peak_memory_mb": peak_mb[0],
                    "status": "error",
                    "error_message": (
                        error_line
                        or stderr.strip()
                        or f"{binary_name} exit {proc.returncode}"
                    ),
                }

            if status_line is None:
                return {
                    "matching_size": -1,
                    "time_seconds": elapsed,
                    "peak_memory_mb": peak_mb[0],
                    "status": "error",
                    "error_message": f"Missing STATUS line. stdout={stdout[:200]!r}",
                }

            return {
                "matching_size": parsed.get("matching_size", -1),
                "time_seconds": elapsed,    
                "peak_memory_mb": max(parsed.get("peak_memory_mb", 0.0), peak_mb[0]),
                "status": status_line,
                "error_message": error_line,
            }
        except Exception as e:
            return {
                "matching_size": -1,
                "time_seconds": time.perf_counter() - t0,
                "peak_memory_mb": peak_mb[0],
                "status": "error",
                "error_message": str(e),
            }
        finally:
            stop_event.set()
            mon.join(timeout=0.2)

    solve.__name__ = f"{binary_name}_cpp"
    return solve


def build_solver_list(want_python, want_cpp):
    
    import importlib

    solvers = []
    if want_python is None:
        want_python = ALL_SOLVERS_PYTHON
    if want_cpp is None:
        want_cpp = ALL_SOLVERS_CPP

    for name in want_python:
        try:
            mod = importlib.import_module(f"solvers.{name}")
        except Exception as e:
            print(f"[warn] Python solver '{name}' import failed: {e}", file=sys.stderr)
            continue
        solvers.append((name, "python", mod.solve))

    exe_suffix = ".exe" if os.name == "nt" else ""
    for name in want_cpp:
        exe = BIN_DIR / f"{name}{exe_suffix}"
        if exe.exists():
            solvers.append((f"{name}_cpp", "cpp", make_cpp_solver(name)))
        else:
            print(f"[warn] C++ binary not found, skipping: {exe}", file=sys.stderr)
    return solvers


def parse_args():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--graphs-dir", type=Path, default=GRAPHS_DIR_DEFAULT)
    p.add_argument("--output-csv", type=Path, default=RESULTS_FILE_DEFAULT,
                   help="Append to this CSV (default: results/results.csv).")
    p.add_argument("--solvers-python", nargs="+", default=None,
                   choices=ALL_SOLVERS_PYTHON + ["none"],
                   help="Subset of Python solvers to run.")
    p.add_argument("--solvers-cpp", nargs="+", default=None,
                   choices=ALL_SOLVERS_CPP + ["none"],
                   help="Subset of C++ solvers to run.")
    p.add_argument("--sizes", type=int, nargs="+", default=None,
                   help="Restrict to these n values.")
    p.add_argument("--densities", type=float, nargs="+", default=None,
                   help="Restrict to these density values.")
    p.add_argument("--seeds", type=int, nargs="+", default=None,
                   help="Restrict to these seeds.")
    p.add_argument("--time-limit", type=float, default=300.0,
                   help="Per-run time limit in seconds (default: 300).")
    p.add_argument("--limit", type=int, default=None,
                   help="Stop after running this many (graph, solver) pairs.")
    p.add_argument("--overwrite", action="store_true",
                   help="Re-run rows even if already present in the CSV.")
    return p.parse_args()


def main():
    args = parse_args()
    args.output_csv.parent.mkdir(parents=True, exist_ok=True)

    graph_files = sorted(
        args.graphs_dir.glob("*.graph"),
        key=lambda p: parse_graph_name(p.name) or (10**9, 1.0, 0),
    )
    if not graph_files:
        print(f"No graph files in {args.graphs_dir}. Run generate_graphs.py first.")
        return

    if args.sizes is not None:
        keep_sizes = set(args.sizes)
        graph_files = [p for p in graph_files
                       if parse_graph_name(p.name)
                       and parse_graph_name(p.name)[0] in keep_sizes]
    if args.densities is not None:
        keep_d = [round(d, 6) for d in args.densities]
        graph_files = [p for p in graph_files
                       if parse_graph_name(p.name)
                       and round(parse_graph_name(p.name)[1], 6) in keep_d]
    if args.seeds is not None:
        keep_seeds = set(args.seeds)
        graph_files = [p for p in graph_files
                       if parse_graph_name(p.name)
                       and parse_graph_name(p.name)[2] in keep_seeds]

    sp = args.solvers_python
    sc = args.solvers_cpp
    if sp is not None and sp == ["none"]:
        sp = []
    if sc is not None and sc == ["none"]:
        sc = []
    solvers = build_solver_list(sp, sc)
    if not solvers:
        print("No solvers selected - nothing to do.")
        return

    done = set() if args.overwrite else load_done(args.output_csv)
    write_header = (
        not args.output_csv.exists() or args.output_csv.stat().st_size == 0
    )

    with open(args.output_csv, "a", newline="") as csvf:
        writer = csv.DictWriter(csvf, fieldnames=CSV_FIELDS)
        if write_header:
            writer.writeheader()
            csvf.flush()

        tasks = [(gf, sname, lang, sfn)
                 for gf in graph_files
                 for sname, lang, sfn in solvers]
        if args.limit:
            tasks = tasks[:args.limit]

        for gf, sname, lang, sfn in tqdm(tasks, desc="Experiments"):
            parsed = parse_graph_name(gf.name)
            if not parsed:
                continue
            n, d, seed = parsed
            key = (n, d, seed, sname, lang)
            if key in done:
                continue
            m = get_m(gf)
            n_left = n // 2
            n_right = n // 2

            try:
                result = sfn(str(gf), time_limit=args.time_limit)
            except TypeError:
                result = sfn(str(gf))

            row = {
                "n": n, "n_left": n_left, "n_right": n_right,
                "density": d, "seed": seed, "m": m,
                "solver": sname, "language": lang,
                "matching_size": result.get("matching_size", -1),
                "time_seconds":  result.get("time_seconds", 0.0),
                "peak_memory_mb": result.get("peak_memory_mb", 0.0),
                "status":        result.get("status", "error"),
                "error_message": result.get("error_message", "") or "",
            }
            writer.writerow(row); csvf.flush()
            done.add(key)


if __name__ == "__main__":
    main()
