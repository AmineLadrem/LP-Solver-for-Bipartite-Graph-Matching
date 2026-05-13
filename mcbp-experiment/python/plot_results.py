import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np
import pandas as pd

PROJECT_ROOT        = Path(__file__).parent.parent
RESULTS_CSV_DEFAULT = PROJECT_ROOT / "results" / "results.csv"
FIGURES_DIR_DEFAULT = PROJECT_ROOT / "figures"

SOLVER_STYLE = {
    "gurobi_lp": dict(color="#d73027", marker="o", label="Gurobi LP"),
    "lemon_hk":  dict(color="#1a9850", marker="*", label="LEMON Hopcroft-Karp"),
    "highs_lp":  dict(color="#984ea3", marker="^", label="HiGHS LP"),
    "scipy_lp":  dict(color="#ff7f00", marker="D", label="SciPy LP"),
}

plt.rcParams.update({"font.size": 11, "axes.titlesize": 13, "axes.labelsize": 12,
                     "legend.fontsize": 9, "lines.linewidth": 1.8, "lines.markersize": 7})


def _style(name):
    return SOLVER_STYLE.get(name, dict(color="#555555", marker="x", label=name))


def _agg(df, group_col, val_col):
    g = df.groupby(group_col)[val_col]
    return g.mean(), g.std().fillna(0)


def _plot_series(ax, df, group_col, y_col, solvers):
    for solver in solvers:
        sd = df[df["solver"] == solver]
        if sd.empty:
            continue
        mean, std = _agg(sd, group_col, y_col)
        xs = mean.index.values.astype(float)
        st = _style(solver)
        ax.plot(xs, mean.values, marker=st["marker"], color=st["color"], label=st["label"])
        ax.fill_between(xs, (mean - std).clip(lower=1e-9), mean + std, alpha=0.13, color=st["color"])


def _power2_xaxis(ax):
    ax.set_xscale("log", base=2)
    def _lbl(v, _):
        if v <= 0:
            return ""
        exp = int(round(np.log2(v)))
        return f"$2^{{{exp}}}$" if np.isclose(v, 2 ** exp) else ""
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(_lbl))


def _save(fig, base, formats):
    for fmt in formats:
        fig.savefig(base.with_suffix(f".{fmt}"))
        print(f"Saved {base.with_suffix(f'.{fmt}')}")


def _fig(ax, xlabel, ylabel, title):
    ax.set_yscale("log")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.legend(loc="upper left")
    ax.grid(True, which="both", ls=":", lw=0.6, alpha=0.6)
    ax.figure.tight_layout()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input-csv", "--results-csv", type=Path, default=RESULTS_CSV_DEFAULT, dest="input_csv")
    p.add_argument("--figures-dir", type=Path, default=FIGURES_DIR_DEFAULT)
    p.add_argument("--solvers", nargs="+", default=["gurobi_lp", "highs_lp", "scipy_lp", "lemon_hk"])
    p.add_argument("--format",  nargs="+", default=["pdf"], choices=["pdf", "png", "svg"])
    args = p.parse_args()

    if not args.input_csv.exists():
        print(f"Not found: {args.input_csv}")
        return
    args.figures_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.input_csv)
    if "density" not in df.columns and "d" in df.columns:
        df = df.rename(columns={"d": "density"})
    df["density"] = df["density"].astype(float).round(4)
    df["n"]       = df["n"].astype(int)
    df = df.drop_duplicates(subset=["n", "density", "seed", "solver", "language"], keep="last")
    df = df[df["status"] == "optimal"]

    if df.empty:
        print("No optimal rows to plot.")
        return

    fmt = args.format
    solvers = args.solver if hasattr(args, "solver") else args.solvers

    for density in sorted(df["density"].unique()):
        sub = df[np.isclose(df["density"], density, atol=1e-4)]
        fig, ax = plt.subplots(figsize=(7, 5))
        _plot_series(ax, sub, "n", "time_seconds", solvers)
        _power2_xaxis(ax)
        _fig(ax, "n (total vertices)", "Time (s)", f"Runtime vs n (density={density:g})")
        _save(fig, args.figures_dir / f"time_vs_n_d{int(round(density*1000)):03d}", fmt)
        plt.close(fig)

    for density in sorted(df["density"].unique()):
        sub = df[np.isclose(df["density"], density, atol=1e-4)]
        fig, ax = plt.subplots(figsize=(7, 5))
        _plot_series(ax, sub, "n", "peak_memory_mb", solvers)
        _power2_xaxis(ax)
        _fig(ax, "n (total vertices)", "Peak memory (MB)", f"Memory vs n (density={density:g})")
        _save(fig, args.figures_dir / f"mem_vs_n_d{int(round(density*1000)):03d}", fmt)
        plt.close(fig)

    for n in sorted(df["n"].unique()):
        sub = df[df["n"] == n]
        fig, ax = plt.subplots(figsize=(7, 5))
        _plot_series(ax, sub, "density", "time_seconds", solvers)
        _fig(ax, "Density", "Time (s)", f"Runtime vs density (n={n})")
        _save(fig, args.figures_dir / f"time_vs_density_n{n:05d}", fmt)
        plt.close(fig)

    sub05 = df[np.isclose(df["density"], 0.05, atol=1e-4)]
    if not sub05.empty:
        fig, ax = plt.subplots(figsize=(8, 6))
        _plot_series(ax, sub05, "n", "time_seconds", solvers)
        _power2_xaxis(ax)
        _fig(ax, "n (total vertices)", "Time (s)", "Solver landscape (density=0.05)")
        _save(fig, args.figures_dir / "solver_landscape", fmt)
        plt.close(fig)

    print(f"All plots saved to {args.figures_dir}")


if __name__ == "__main__":
    main()
