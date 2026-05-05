

import time

from ._common import make_result, memory_monitor, read_graph

CPLEX_COMMUNITY_VAR_LIMIT = 1000


def solve(graph_path: str, time_limit: float = 300.0) -> dict:
    try:
        import cplex
    except ImportError as e:
        return make_result(status="error", error_message=f"cplex import failed: {e}")

    with memory_monitor() as peak_mb:
        t0 = time.perf_counter()
        try:
            n_left, n_right, edges = read_graph(graph_path)
            m = len(edges)

            if m > CPLEX_COMMUNITY_VAR_LIMIT:
                return make_result(
                    time_seconds=time.perf_counter() - t0,
                    peak_memory_mb=peak_mb[0],
                    status="skipped",
                    error_message=(
                        f"CPLEX Community Edition: m={m} variables exceeds "
                        f"{CPLEX_COMMUNITY_VAR_LIMIT}-variable license cap"
                    ),
                )

            cpx = cplex.Cplex()
            cpx.set_log_stream(None)
            cpx.set_error_stream(None)
            cpx.set_warning_stream(None)
            cpx.set_results_stream(None)
            cpx.parameters.timelimit.set(time_limit)
            cpx.parameters.lpmethod.set(2)        
            cpx.objective.set_sense(cpx.objective.sense.maximize)
            cpx.variables.add(obj=[1.0]*m, lb=[0.0]*m, ub=[1.0]*m)

            left_cols = [[] for _ in range(n_left)]
            right_cols = [[] for _ in range(n_right)]
            for idx, (u, w) in enumerate(edges):
                left_cols[u].append(idx)
                right_cols[w].append(idx)

            rows = []
            for u in range(n_left):
                if left_cols[u]:
                    rows.append([[left_cols[u], [1.0]*len(left_cols[u])], "L", 1.0])
            for w in range(n_right):
                if right_cols[w]:
                    rows.append([[right_cols[w], [1.0]*len(right_cols[w])], "L", 1.0])
            if rows:
                cpx.linear_constraints.add(
                    lin_expr=[r[0] for r in rows],
                    senses=[r[1] for r in rows],
                    rhs=[r[2] for r in rows],
                )

            cpx.solve()
            elapsed = time.perf_counter() - t0
            stat = cpx.solution.get_status()

            
            if stat in (11, 25, 107):
                return make_result(
                    time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                    status="timeout",
                    error_message=f"CPLEX hit time limit (status {stat})",
                )
            if stat not in (1, 5):
                return make_result(
                    time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                    status="error",
                    error_message=f"CPLEX non-optimal status {stat}",
                )

            vals = cpx.solution.get_values()
            for i, v in enumerate(vals):
                if abs(v - round(v)) > 1e-6:
                    return make_result(
                        time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                        status="error",
                        error_message=f"Non-integral LP value {v} at edge {i}",
                    )

            return make_result(
                matching_size=int(round(sum(vals))),
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
