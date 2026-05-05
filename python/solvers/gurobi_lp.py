

import time

from ._common import make_result, memory_monitor, read_graph


def solve(graph_path: str, time_limit: float = 300.0) -> dict:
    try:
        import gurobipy as gp
        from gurobipy import GRB
    except ImportError as e:
        return make_result(status="error", error_message=f"gurobipy import failed: {e}")

    with memory_monitor() as peak_mb:
        t0 = time.perf_counter()
        try:
            n_left, n_right, edges = read_graph(graph_path)
            m = len(edges)

            env = gp.Env(empty=True)
            env.setParam("OutputFlag", 0)
            env.start()

            model = gp.Model(env=env)
            model.Params.OutputFlag = 0
            model.Params.Method = 1            
            model.Params.TimeLimit = time_limit

            x = model.addVars(m, lb=0.0, ub=1.0, obj=1.0, vtype=GRB.CONTINUOUS)
            model.ModelSense = GRB.MAXIMIZE

            left_constrs = [[] for _ in range(n_left)]
            right_constrs = [[] for _ in range(n_right)]
            for idx, (u, w) in enumerate(edges):
                left_constrs[u].append(x[idx])
                right_constrs[w].append(x[idx])
            for u in range(n_left):
                if left_constrs[u]:
                    model.addConstr(gp.quicksum(left_constrs[u]) <= 1.0)
            for w in range(n_right):
                if right_constrs[w]:
                    model.addConstr(gp.quicksum(right_constrs[w]) <= 1.0)

            model.optimize()
            elapsed = time.perf_counter() - t0

            if model.Status == GRB.TIME_LIMIT:
                return make_result(
                    time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                    status="timeout",
                    error_message=f"Gurobi hit time limit {time_limit}s",
                )
            if model.Status != GRB.OPTIMAL:
                return make_result(
                    time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                    status="error",
                    error_message=f"Gurobi non-optimal status {model.Status}",
                )

            for i in range(m):
                v = x[i].X
                if abs(v - round(v)) > 1e-6:
                    return make_result(
                        time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                        status="error",
                        error_message=f"Non-integral LP value {v} at edge {i}",
                    )

            matching_size = int(round(model.ObjVal))
            model.dispose()
            env.dispose()
            return make_result(
                matching_size=matching_size,
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
