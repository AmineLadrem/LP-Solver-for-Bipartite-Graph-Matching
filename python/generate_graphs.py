import argparse
import random
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DEFAULT_N         = [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384]
DEFAULT_D         = [0.01, 0.025, 0.05, 0.075, 0.1]
DEFAULT_SEEDS     = [0, 1, 2]
DEFAULT_MAX_EDGES = 5_000_000


def generate_graph(n, d, seed, max_edges):
    n_left = n // 2
    m = round(d * n_left * n_left)
    if m > max_edges:
        return None
    rng = random.Random(seed)
    if m == 0:
        return n_left, n_left, []
    if m / (n_left * n_left) < 0.3:
        chosen = set()
        while len(chosen) < m:
            chosen.add((rng.randrange(n_left), rng.randrange(n_left)))
        edges = list(chosen)
    else:
        all_edges = [(u, v) for u in range(n_left) for v in range(n_left)]
        rng.shuffle(all_edges)
        edges = all_edges[:m]
    return n_left, n_left, edges


def write_graph(path, n_left, n_right, edges):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        f.write(f"{n_left} {n_right} {len(edges)}\n")
        for u, v in edges:
            f.write(f"{u} {v}\n")


def graph_filename(n, d, seed):
    return f"n{n:05d}_d{int(round(d * 1000)):03d}_s{seed:02d}.graph"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output-dir", type=Path, default=PROJECT_ROOT / "graphs")
    p.add_argument("--sizes",     type=int,   nargs="+", default=DEFAULT_N)
    p.add_argument("--densities", type=float, nargs="+", default=DEFAULT_D)
    p.add_argument("--seeds",     type=int,   nargs="+", default=DEFAULT_SEEDS)
    p.add_argument("--max-edges", type=int,              default=DEFAULT_MAX_EDGES)
    p.add_argument("--overwrite", action="store_true")
    args = p.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    written = skipped = existing = 0

    for n in args.sizes:
        for d in args.densities:
            for seed in args.seeds:
                path = args.output_dir / graph_filename(n, d, seed)
                if path.exists() and not args.overwrite:
                    existing += 1
                    continue
                result = generate_graph(n, d, seed, args.max_edges)
                if result is None:
                    skipped += 1
                    continue
                write_graph(path, *result)
                written += 1

    print(f"Done. wrote={written} existing={existing} skipped={skipped}")


if __name__ == "__main__":
    main()
