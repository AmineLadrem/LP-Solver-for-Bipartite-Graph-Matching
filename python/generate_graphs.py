

import argparse
import os
import random
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent

DEFAULT_N      = [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384]
DEFAULT_D      = [0.01, 0.025, 0.05, 0.075, 0.1]
DEFAULT_SEEDS  = [0, 1, 2]
DEFAULT_MAX_EDGES = 5_000_000


def generate_graph(n: int, d: float, seed: int, max_edges: int):
    
    if n % 2 != 0:
        raise ValueError("n must be even")
    n_left = n // 2
    n_right = n // 2
    m = round(d * n_left * n_right)
    if m > max_edges:
        return None
    rng = random.Random(seed)
    if m == 0:
        return n_left, n_right, []
    if m / (n_left * n_right) < 0.3:
        chosen = set()
        while len(chosen) < m:
            chosen.add((rng.randrange(n_left), rng.randrange(n_right)))
        edges = list(chosen)
    else:
        all_edges = [(u, w) for u in range(n_left) for w in range(n_right)]
        rng.shuffle(all_edges)
        edges = all_edges[:m]
    return n_left, n_right, edges


def write_graph(path: Path, n_left: int, n_right: int, edges):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        f.write(f"{n_left} {n_right} {len(edges)}\n")
        for u, w in edges:
            f.write(f"{u} {w}\n")


def graph_filename(n: int, d: float, seed: int) -> str:
    return f"n{n:05d}_d{int(round(d * 1000)):03d}_s{seed:02d}.graph"


def parse_args():
    p = argparse.ArgumentParser(description="Generate random bipartite graphs.")
    p.add_argument("--output-dir", type=Path,
                   default=PROJECT_ROOT / "graphs",
                   help="Directory to write graph files into.")
    p.add_argument("--sizes", type=int, nargs="+", default=DEFAULT_N,
                   help="List of total-vertex counts (n).")
    p.add_argument("--densities", type=float, nargs="+", default=DEFAULT_D,
                   help="List of densities (d in [0,1]).")
    p.add_argument("--seeds", type=int, nargs="+", default=DEFAULT_SEEDS,
                   help="List of random seeds.")
    p.add_argument("--max-edges", type=int, default=DEFAULT_MAX_EDGES,
                   help="Skip instances whose edge count exceeds this cap.")
    p.add_argument("--overwrite", action="store_true",
                   help="Regenerate files even if they already exist.")
    return p.parse_args()


def main():
    args = parse_args()
    out_dir = args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    from tqdm import tqdm
    total = len(args.sizes) * len(args.densities) * len(args.seeds)
    bar = tqdm(total=total, desc="Generating graphs")
    written = 0
    skipped = 0
    existing = 0

    for n in args.sizes:
        for d in args.densities:
            for seed in args.seeds:
                fname = graph_filename(n, d, seed)
                fpath = out_dir / fname
                if fpath.exists() and not args.overwrite:
                    existing += 1
                    bar.update(1)
                    continue
                result = generate_graph(n, d, seed, args.max_edges)
                if result is None:
                    n_left = n // 2
                    m_would_be = round(d * n_left * n_left)
                    print(
                        f"\nSKIP n={n} d={d} seed={seed}: "
                        f"m={m_would_be} > {args.max_edges} (max-edges)",
                        file=sys.stderr,
                    )
                    skipped += 1
                    bar.update(1)
                    continue
                n_left, n_right, edges = result
                write_graph(fpath, n_left, n_right, edges)
                written += 1
                bar.update(1)
                bar.set_postfix({"last": fname, "skip": skipped})

    bar.close()
    print(
        f"\nDone. Wrote {written} new files, kept {existing} existing, "
        f"skipped {skipped} (over edge cap)."
    )


if __name__ == "__main__":
    main()
