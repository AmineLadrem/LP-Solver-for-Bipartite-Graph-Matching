

import csv
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
SRC_CSV = PROJECT_ROOT / "v1" / "results" / "results.csv"
DST_CSV = PROJECT_ROOT / "results" / "results.csv"

CSV_FIELDS = [
    "n", "n_left", "n_right", "density", "seed", "m",
    "solver", "language",
    "matching_size", "time_seconds", "peak_memory_mb",
    "status", "error_message",
]


def main():
    if not SRC_CSV.exists():
        print(f"Source CSV not found: {SRC_CSV}", file=sys.stderr)
        sys.exit(1)

    DST_CSV.parent.mkdir(parents=True, exist_ok=True)

    by_key = {}
    with open(SRC_CSV, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            n = int(row["n"])
            density = float(row.get("density", row.get("d", 0.0)))
            seed = int(row["seed"])
            solver = row["solver"]
            language = row["language"]
            key = (n, density, seed, solver, language)
            new_row = {
                "n": n,
                "n_left": n // 2,
                "n_right": n // 2,
                "density": density,
                "seed": seed,
                "m": int(row["m"]),
                "solver": solver,
                "language": language,
                "matching_size": int(row["matching_size"]),
                "time_seconds": float(row["time_seconds"]),
                "peak_memory_mb": float(row["peak_memory_mb"]),
                "status": row["status"],
                "error_message": row.get("error_message", "") or "",
            }
            prev = by_key.get(key)
            if prev is None:
                by_key[key] = new_row
                continue
            
            if new_row["status"] == "optimal" or prev["status"] != "optimal":
                by_key[key] = new_row

    rows = list(by_key.values())
    rows.sort(
        key=lambda r: (r["n"], r["density"], r["seed"], r["solver"], r["language"])
    )

    with open(DST_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {DST_CSV}")


if __name__ == "__main__":
    main()
