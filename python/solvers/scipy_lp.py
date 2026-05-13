import time

import numpy as np
import scipy.sparse as sp
from scipy.optimize import linprog

from ._common import make_result, memory_monitor, read_graph

def solve(graph_path: str, time_limit: float = 300.0) -> dict:
    with memory_monitor() as peak_mb:
        t0 = time.perf_counter()
        try:
            n_left, n_right, edges = read_graph(graph_path)
            m = len(edges)

            if m == 0:
                return make_result(
                    matching_size=0,
                    time_seconds=time.perf_counter() - t0,
                    peak_memory_mb=peak_mb[0],
                    status="optimal",
                )

            c = -np.ones(m)
            row_data = []
            col_data = []
            left_edge  = [[] for _ in range(n_left)]
            right_edge = [[] for _ in range(n_right)]
            for idx, (u, w) in enumerate(edges):
                left_edge[u].append(idx)
                right_edge[w].append(idx)

            row_idx = 0
            for u in range(n_left):
                if left_edge[u]:
                    for col in left_edge[u]:
                        row_data.append(row_idx); col_data.append(col)
                    row_idx += 1
            for w in range(n_right):
                if right_edge[w]:
                    for col in right_edge[w]:
                        row_data.append(row_idx); col_data.append(col)
                    row_idx += 1

            num_rows = row_idx
            A_ub = sp.csr_matrix(
                (np.ones(len(row_data)), (row_data, col_data)),
                shape=(num_rows, m),
            )
            b_ub = np.ones(num_rows)
            bounds = [(0.0, 1.0)] * m

            result = linprog(
                c,
                A_ub=A_ub, b_ub=b_ub,
                bounds=bounds,
                method="highs-ds",
                options={"disp": False, "time_limit": float(time_limit)},
            )
            elapsed = time.perf_counter() - t0

            if result.status == 1:
                return make_result(
                    time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                    status="timeout",
                    error_message=f"SciPy linprog hit iteration/time limit: {result.message}",
                )
            if result.status != 0:
                return make_result(
                    time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                    status="error",
                    error_message=f"SciPy linprog status {result.status}: {result.message}",
                )

            for i, v in enumerate(result.x):
                if abs(v - round(v)) > 1e-6:
                    return make_result(
                        time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                        status="error",
                        error_message=f"Non-integral LP value {v} at edge {i}",
                    )

            return make_result(
                matching_size=int(round(-result.fun)),
                time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                status="optimal",
            )
        except Exception as e:
            return make_result(
                time_seconds=time.perf_counter() - t0,
                peak_memory_mb=peak_mb[0],
                status="error",
                error_message=str(e),
            )
