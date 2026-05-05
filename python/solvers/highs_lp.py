

import time

from ._common import make_result, memory_monitor, read_graph


def solve(graph_path: str, time_limit: float = 300.0) -> dict:
    try:
        import highspy
    except ImportError as e:
        return make_result(status="error", error_message=f"highspy import failed: {e}")

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

            lp = highspy.HighsLp()
            lp.num_col_ = m
            lp.num_row_ = 0
            lp.col_cost_ = [1.0]*m
            lp.col_lower_ = [0.0]*m
            lp.col_upper_ = [1.0]*m
            lp.sense_ = highspy.ObjSense.kMaximize

            left_edge = [[] for _ in range(n_left)]
            right_edge = [[] for _ in range(n_right)]
            for idx, (u, w) in enumerate(edges):
                left_edge[u].append(idx)
                right_edge[w].append(idx)

            row_lower, row_upper, starts, indices, vals = [], [], [], [], []
            nz = 0
            for u in range(n_left):
                if left_edge[u]:
                    row_lower.append(-1e30)
                    row_upper.append(1.0)
                    starts.append(nz)
                    for c in left_edge[u]:
                        indices.append(c); vals.append(1.0)
                    nz += len(left_edge[u])
            for w in range(n_right):
                if right_edge[w]:
                    row_lower.append(-1e30)
                    row_upper.append(1.0)
                    starts.append(nz)
                    for c in right_edge[w]:
                        indices.append(c); vals.append(1.0)
                    nz += len(right_edge[w])

            num_rows = len(row_lower)
            lp.num_row_ = num_rows
            lp.row_lower_ = row_lower
            lp.row_upper_ = row_upper
            lp.a_matrix_.format_ = highspy.MatrixFormat.kRowwise
            lp.a_matrix_.num_col_ = m
            lp.a_matrix_.num_row_ = num_rows
            lp.a_matrix_.start_ = starts + [nz]
            lp.a_matrix_.index_ = indices
            lp.a_matrix_.value_ = vals

            h = highspy.Highs()
            h.setOptionValue("output_flag", False)
            h.setOptionValue("solver", "simplex")
            h.setOptionValue("simplex_strategy", 4)        
            h.setOptionValue("time_limit", float(time_limit))
            h.passModel(lp)
            h.run()

            elapsed = time.perf_counter() - t0
            model_status = str(h.getModelStatus())

            if "TimeLimit" in model_status or "kTimeLimit" in model_status:
                return make_result(
                    time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                    status="timeout",
                    error_message=f"HiGHS hit time limit (status {model_status})",
                )
            if "Optimal" not in model_status and "kOptimal" not in model_status:
                return make_result(
                    time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                    status="error",
                    error_message=f"HiGHS non-optimal status {model_status}",
                )

            sol = h.getSolution()
            col_values = list(sol.col_value)
            for i, v in enumerate(col_values):
                if abs(v - round(v)) > 1e-6:
                    return make_result(
                        time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                        status="error",
                        error_message=f"Non-integral LP value {v} at edge {i}",
                    )

            return make_result(
                matching_size=int(round(sum(col_values))),
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
