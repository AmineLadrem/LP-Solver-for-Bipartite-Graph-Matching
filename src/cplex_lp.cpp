
#include <chrono>
#include <cstdio>
#include <string>
#include <vector>

#include <ilcplex/cplex.h>

#include "graph_io.hpp"

static constexpr int CPLEX_COMMUNITY_VAR_LIMIT = 1000;

int main(int argc, char* argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: cplex_lp <graph_file> [--time-limit SECONDS]\n");
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
    int m = (int)g.edges.size();

    if (m > CPLEX_COMMUNITY_VAR_LIMIT) {
        char buf[160];
        snprintf(buf, sizeof(buf),
                 "CPLEX Community Edition: m=%d exceeds %d-variable license cap",
                 m, CPLEX_COMMUNITY_VAR_LIMIT);
        print_result(-1, 0.0, "skipped", buf);
        return 0;
    }

    int status_code = 0;
    CPXENVptr env = CPXopenCPLEX(&status_code);
    if (!env) {
        char buf[64]; snprintf(buf, sizeof(buf), "CPXopenCPLEX failed %d", status_code);
        print_result(-1, 0.0, "error", buf);
        return 1;
    }
    CPXsetintparam(env, CPXPARAM_ScreenOutput, CPX_OFF);
    CPXsetdblparam(env, CPXPARAM_TimeLimit, time_limit);
    CPXsetintparam(env, CPXPARAM_LPMethod, CPX_ALG_DUAL);

    CPXLPptr lp = CPXcreateprob(env, &status_code, "mcbp");
    if (!lp) {
        print_result(-1, 0.0, "error", "CPXcreateprob failed");
        CPXcloseCPLEX(&env);
        return 1;
    }
    CPXchgobjsen(env, lp, CPX_MAX);

    std::vector<double> obj(m, 1.0), lb(m, 0.0), ub(m, 1.0);
    CPXnewcols(env, lp, m, obj.data(), lb.data(), ub.data(), nullptr, nullptr);

    std::vector<std::vector<int>> left_cols(g.n_left), right_cols(g.n_right);
    for (int i = 0; i < m; ++i) {
        left_cols[g.edges[i].first].push_back(i);
        right_cols[g.edges[i].second].push_back(i);
    }

    std::vector<int> rmatbeg, rmatind;
    std::vector<double> rmatval, rhs;
    std::vector<char> sense;
    int nz = 0;
    auto add_row = [&](const std::vector<int>& cols) {
        rmatbeg.push_back(nz);
        for (int c : cols) {
            rmatind.push_back(c); rmatval.push_back(1.0); ++nz;
        }
        rhs.push_back(1.0); sense.push_back('L');
    };
    for (int u = 0; u < g.n_left;  ++u) if (!left_cols[u].empty())  add_row(left_cols[u]);
    for (int w = 0; w < g.n_right; ++w) if (!right_cols[w].empty()) add_row(right_cols[w]);

    int num_rows = (int)rmatbeg.size();
    if (num_rows > 0) {
        CPXaddrows(env, lp, 0, num_rows, nz,
                   rhs.data(), sense.data(),
                   rmatbeg.data(), rmatind.data(), rmatval.data(),
                   nullptr, nullptr);
    }

    auto t0 = std::chrono::steady_clock::now();
    int solve_err = CPXlpopt(env, lp);
    auto t1 = std::chrono::steady_clock::now();
    double elapsed = std::chrono::duration<double>(t1 - t0).count();

    if (solve_err) {
        char buf[64]; snprintf(buf, sizeof(buf), "CPXlpopt error %d", solve_err);
        print_result(-1, elapsed, "error", buf);
        CPXfreeprob(env, &lp); CPXcloseCPLEX(&env);
        return 1;
    }

    int stat = CPXgetstat(env, lp);
    
    if (stat == 11 || stat == 25 || stat == 107) {
        char buf[80]; snprintf(buf, sizeof(buf), "CPLEX hit time limit (status %d)", stat);
        print_result(-1, elapsed, "timeout", buf);
        CPXfreeprob(env, &lp); CPXcloseCPLEX(&env);
        return 0;
    }
    if (stat != 1 && stat != 5) {
        char buf[80]; snprintf(buf, sizeof(buf), "CPLEX non-optimal status %d", stat);
        print_result(-1, elapsed, "error", buf);
        CPXfreeprob(env, &lp); CPXcloseCPLEX(&env);
        return 1;
    }

    double objval = 0.0;
    CPXgetobjval(env, lp, &objval);
    print_result((int)(objval + 0.5), elapsed, "optimal");
    CPXfreeprob(env, &lp);
    CPXcloseCPLEX(&env);
    return 0;
}
