

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).parent.parent
RESULTS_CSV_DEFAULT = PROJECT_ROOT / "results" / "results.csv"
FIGURES_DIR_DEFAULT = PROJECT_ROOT / "figures"

PRIMARY_SOLVERS = ["gurobi_lp", "cplex_lp", "lemon_hk"]
EXTRA_SOLVERS = ["highs_lp", "scipy_lp"]
ALL_SOLVERS = PRIMARY_SOLVERS + EXTRA_SOLVERS

D_VALUES = [0.01, 0.025, 0.05, 0.075, 0.1]
N_REP = [1024, 4096, 16384]

SOLVER_STYLE = {
    "gurobi_lp": dict(color="#d73027", marker="o", label="Gurobi LP"),
    "cplex_lp": dict(color="#4575b4", marker="s", label="CPLEX LP"),
    "lemon_hk": dict(color="#1a9850", marker="*", label="LEMON Hopcroft-Karp"),
    "highs_lp": dict(color="#984ea3", marker="^", label="HiGHS LP"),
    "scipy_lp": dict(color="#ff7f00", marker="D", label="SciPy LP"),
    "gurobi_lp_cpp": dict(color="#a50026", marker="o", label="Gurobi LP (C++)"),
    "cplex_lp_cpp": dict(color="#313695", marker="s", label="CPLEX LP (C++)"),
    "lemon_hk_cpp": dict(color="#006837", marker="*", label="LEMON HK (C++)"),
    "highs_lp_cpp": dict(color="#762a83", marker="^", label="HiGHS LP (C++)"),
}

plt.rcParams.update({
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.labelsize": 12,
    "legend.fontsize": 9,
    "lines.linewidth": 1.8,
    "lines.markersize": 7,
})


def _style(name: str) -> dict:
    return SOLVER_STYLE.get(name, dict(color="#555555", marker="x", label=name))


def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "density" not in df.columns and "d" in df.columns:
        df = df.rename(columns={"d": "density"})
    required = {
        "n", "density", "seed", "solver", "language",
        "time_seconds", "peak_memory_mb", "status",
    }
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"Results CSV missing columns: {sorted(missing)}")

    df["density"] = df["density"].astype(float).round(4)
    df["n"] = df["n"].astype(int)
    df["seed"] = df["seed"].astype(int)
    df = df.drop_duplicates(
        subset=["n", "density", "seed", "solver", "language"],
        keep="last",
    )
    return df


def optimal_data(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["status"] == "optimal"].copy()


def _agg(df: pd.DataFrame, group_col: str, val_col: str):
    grouped = df.groupby(group_col)[val_col]
    return grouped.mean(), grouped.std().fillna(0)


def _shade(ax, xs, mean, std, color):
    lo = (mean - std).clip(lower=1e-9)
    hi = mean + std
    ax.fill_between(xs, lo, hi, alpha=0.13, color=color)


def _grid(ax):
    ax.grid(True, which="both", ls=":", lw=0.6, alpha=0.6)


def _format_power2_axis(ax):
    ax.set_xscale("log", base=2)

    def _label(v, _pos):
        if v <= 0:
            return ""
        exp = int(round(np.log2(v)))
        if not np.isclose(v, 2 ** exp):
            return ""
        return f"$2^{{{exp}}}$"

    ax.xaxis.set_major_formatter(
        ticker.FuncFormatter(_label)
    )


def _plot_series(ax, sub: pd.DataFrame, group_col: str, y_col: str, solvers: list[str]):
    for solver in solvers:
        sd = sub[sub["solver"] == solver]
        if sd.empty:
            continue
        mean, std = _agg(sd, group_col, y_col)
        xs = mean.index.values.astype(float)
        st = _style(solver)
        ax.plot(xs, mean.values, marker=st["marker"], color=st["color"],
                label=st["label"])
        _shade(ax, xs, mean, std, st["color"])


def plot_vs_n(df: pd.DataFrame, y_col: str, ylabel: str, prefix: str,
              solvers: list[str], figures_dir: Path):
    for density in D_VALUES:
        sub = df[np.isclose(df["density"], density, atol=1e-4)]
        if sub.empty:
            continue
        fig, ax = plt.subplots(figsize=(7, 5))
        _plot_series(ax, sub, "n", y_col, solvers)
        _format_power2_axis(ax)
        ax.set_yscale("log")
        ax.set_xlabel("n (total vertices)")
        ax.set_ylabel(ylabel)
        ax.set_title(f"{ylabel} vs n (density = {density:g})")
        ax.legend(loc="upper left")
        _grid(ax)
        fig.tight_layout()
        fname = figures_dir / f"{prefix}_vs_n_d{int(round(density * 1000)):03d}.pdf"
        fig.savefig(fname)
        plt.close(fig)
        print(f"Saved {fname}")


def plot_vs_density(df: pd.DataFrame, y_col: str, ylabel: str, prefix: str,
                    solvers: list[str], figures_dir: Path):
    for n in N_REP:
        sub = df[df["n"] == n]
        if sub.empty:
            continue
        fig, ax = plt.subplots(figsize=(7, 5))
        _plot_series(ax, sub, "density", y_col, solvers)
        ax.set_yscale("log")
        ax.set_xlabel("Density")
        ax.set_ylabel(ylabel)
        ax.set_title(f"{ylabel} vs density (n = {n})")
        ax.legend(loc="upper left")
        _grid(ax)
        fig.tight_layout()
        fname = figures_dir / f"{prefix}_vs_density_n{n:05d}.pdf"
        fig.savefig(fname)
        plt.close(fig)
        print(f"Saved {fname}")


def plot_solver_landscape(df: pd.DataFrame, solvers: list[str], figures_dir: Path):
    density = 0.05
    sub = df[np.isclose(df["density"], density, atol=1e-4)]
    if sub.empty:
        print("No data for solver_landscape at density=0.05")
        return
    fig, ax = plt.subplots(figsize=(8, 6))
    _plot_series(ax, sub, "n", "time_seconds", solvers)
    _format_power2_axis(ax)
    ax.set_yscale("log")
    ax.set_xlabel("n (total vertices)")
    ax.set_ylabel("Time (s)")
    ax.set_title("Solver landscape (density = 0.05)")
    ax.legend(loc="upper left")
    _grid(ax)
    fig.tight_layout()
    fname = figures_dir / "solver_landscape.pdf"
    fig.savefig(fname)
    plt.close(fig)
    print(f"Saved {fname}")


def plot_cplex_small(df: pd.DataFrame, figures_dir: Path):
    sub = df[df["n"] <= 256]
    if sub.empty:
        return
    fig, ax = plt.subplots(figsize=(7, 5))
    _plot_series(ax, sub, "n", "time_seconds", ALL_SOLVERS)
    _format_power2_axis(ax)
    ax.set_yscale("log")
    ax.set_xlabel("n (total vertices)")
    ax.set_ylabel("Time (s)")
    ax.set_title("Small instances with CPLEX (n <= 256)")
    ax.legend(loc="upper left")
    _grid(ax)
    fig.tight_layout()
    fname = figures_dir / "cplex_small_comparison.pdf"
    fig.savefig(fname)
    plt.close(fig)
    print(f"Saved {fname}")


def print_summary(df_all: pd.DataFrame, df_opt: pd.DataFrame, solvers: list[str]):
    print("=== Result summary ===")
    print(f"Rows after deduplication: {len(df_all)}")
    print(df_all.groupby("status").size().to_string())
    print(f"\nOptimal rows used for plots: {len(df_opt)}")

    sub = df_opt[np.isclose(df_opt["density"], 0.05, atol=1e-4)]
    if sub.empty:
        return
    print("\nEmpirical log-log slope (time vs n) at density=0.05:")
    for solver in solvers:
        sd = sub[sub["solver"] == solver]
        mean, _ = _agg(sd, "n", "time_seconds")
        if len(mean) < 4:
            continue
        xs = np.log2(mean.index.values.astype(float))
        ys = np.log2(mean.values.clip(1e-9))
        slope, _ = np.polyfit(xs[-5:], ys[-5:], 1)
        print(f"  {solver:<14}: slope ~ {slope:.2f}")


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input-csv", type=Path, default=RESULTS_CSV_DEFAULT)
    p.add_argument("--figures-dir", type=Path, default=FIGURES_DIR_DEFAULT)
    p.add_argument("--solvers", nargs="+", default=["gurobi_lp", "highs_lp", "scipy_lp", "lemon_hk"],
                   help="Solvers to include in the main ablation plots.")
    p.add_argument("--primary-only", action="store_true",
                   help="Use only supervisor-required solvers in main plots.")
    return p.parse_args()


def main():
    args = parse_args()
    if args.primary_only:
        args.solvers = PRIMARY_SOLVERS
    if not args.input_csv.exists():
        print(f"Results file not found: {args.input_csv}")
        return
    args.figures_dir.mkdir(parents=True, exist_ok=True)

    df_all = load_data(args.input_csv)
    df_opt = optimal_data(df_all)
    if df_opt.empty:
        print("No optimal results available for plotting.")
        return

    print_summary(df_all, df_opt, args.solvers)
    plot_vs_n(df_opt, "time_seconds", "Time (s)", "time", args.solvers, args.figures_dir)
    plot_vs_density(df_opt, "time_seconds", "Time (s)", "time", args.solvers, args.figures_dir)
    plot_vs_n(df_opt, "peak_memory_mb", "Peak memory (MB)", "mem", args.solvers, args.figures_dir)
    plot_vs_density(df_opt, "peak_memory_mb", "Peak memory (MB)", "mem", args.solvers, args.figures_dir)
    plot_solver_landscape(df_opt, args.solvers, args.figures_dir)
    plot_cplex_small(df_opt, args.figures_dir)
    print(f"\nAll plots saved to {args.figures_dir}")


if __name__ == "__main__":
    main()
