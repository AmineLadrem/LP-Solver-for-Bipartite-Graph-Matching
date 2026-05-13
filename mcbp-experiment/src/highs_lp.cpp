
#include <chrono>
#include <cstdio>
#include <string>
#include <vector>

#include <Highs.h>

#include "graph_io.hpp"

int main(int argc, char* argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: highs_lp <graph_file> [--time-limit SECONDS]\n");
        return 1;
    }
    double time_limit = parse_time_limit(argc, argv, 300.0);

    Graph g;
    try {
        g = read_graph(argv[1]);
    } catch (const std::exception& e) {
        print_result(-1, 0.0, "error", e.what());
        return 1;
    }
    HighsInt m = (HighsInt)g.edges.size();

    Highs h;
    h.setOptionValue("output_flag", false);
    h.setOptionValue("solver", "simplex");
    h.setOptionValue("simplex_strategy", 4);
    h.setOptionValue("time_limit", time_limit);
    h.changeObjectiveSense(ObjSense::kMaximize);

    std::vector<double> lbs(m, 0.0), ubs(m, 1.0);
    h.addVars(m, lbs.data(), ubs.data());
    if (m > 0) {
        std::vector<double> costs(m, 1.0);
        h.changeColsCost(0, m - 1, costs.data());
    }

    std::vector<std::vector<HighsInt>> left_cols(g.n_left), right_cols(g.n_right);
    for (HighsInt i = 0; i < m; ++i) {
        left_cols[g.edges[i].first].push_back(i);
        right_cols[g.edges[i].second].push_back(i);
    }

    std::vector<double>   row_lb, row_ub;
    std::vector<HighsInt> starts, indices;
    std::vector<double>   values;
    HighsInt nz = 0;
    auto add_row = [&](const std::vector<HighsInt>& cols) {
        row_lb.push_back(-1e30);
        row_ub.push_back(1.0);
        starts.push_back(nz);
        for (HighsInt c : cols) { indices.push_back(c); values.push_back(1.0); ++nz; }
    };
    for (int u = 0; u < g.n_left;  ++u) if (!left_cols[u].empty())  add_row(left_cols[u]);
    for (int w = 0; w < g.n_right; ++w) if (!right_cols[w].empty()) add_row(right_cols[w]);

    HighsInt num_rows = (HighsInt)starts.size();
    if (num_rows > 0) {
        h.addRows(num_rows, row_lb.data(), row_ub.data(),
                  nz, starts.data(), indices.data(), values.data());
    }

    auto t0 = std::chrono::steady_clock::now();
    HighsStatus run_status = h.run();
    auto t1 = std::chrono::steady_clock::now();
    double elapsed = std::chrono::duration<double>(t1 - t0).count();

    HighsModelStatus model_status = h.getModelStatus();

    if (model_status == HighsModelStatus::kTimeLimit) {
        print_result(-1, elapsed, "timeout", "HiGHS hit time limit");
        return 0;
    }
    if (model_status != HighsModelStatus::kOptimal) {
        char buf[120];
        snprintf(buf, sizeof(buf),
                 "HiGHS non-optimal status (model=%d, run=%d)",
                 (int)model_status, (int)run_status);
        print_result(-1, elapsed, "error", buf);
        return 1;
    }

    double objval = h.getObjectiveValue();
    print_result((int)(objval + 0.5), elapsed, "optimal");
    return 0;
}
