

#include <chrono>
#include <cstdio>
#include <string>
#include <vector>

#include <gurobi_c.h>

#include "graph_io.hpp"

int main(int argc, char* argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: gurobi_lp <graph_file> [--time-limit SECONDS]\n");
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

    GRBenv* env = nullptr;
    GRBmodel* model = nullptr;

    auto cleanup = [&]() {
        if (model) GRBfreemodel(model);
        if (env)   GRBfreeenv(env);
    };

#define CHECK(call) do { \
    int err = (call); \
    if (err) { \
        const char* msg = env ? GRBgeterrormsg(env) : "no env"; \
        char buf[512]; \
        snprintf(buf, sizeof(buf), "Gurobi error %d: %s", err, msg); \
        print_result(-1, 0.0, "error", buf); \
        cleanup(); \
        return 1; \
    } \
} while (0)

    CHECK(GRBemptyenv(&env));
    CHECK(GRBsetintparam(env, "OutputFlag", 0));
    CHECK(GRBstartenv(env));

    std::vector<double> obj(m, 1.0), lb(m, 0.0), ub(m, 1.0);
    std::vector<char>   vtype(m, GRB_CONTINUOUS);
    CHECK(GRBnewmodel(env, &model, "mcbp", m,
        obj.data(), lb.data(), ub.data(), vtype.data(), nullptr));
    CHECK(GRBsetintattr(model, "ModelSense", -1));
    CHECK(GRBsetdblparam(GRBgetenv(model), "TimeLimit", time_limit));
    CHECK(GRBsetintparam(GRBgetenv(model), "Method", 1));

    std::vector<std::vector<int>> left_cols(g.n_left), right_cols(g.n_right);
    for (int i = 0; i < m; ++i) {
        left_cols[g.edges[i].first].push_back(i);
        right_cols[g.edges[i].second].push_back(i);
    }
    for (int u = 0; u < g.n_left; ++u) {
        if (left_cols[u].empty()) continue;
        std::vector<double> coefs(left_cols[u].size(), 1.0);
        CHECK(GRBaddconstr(model, (int)left_cols[u].size(),
                           left_cols[u].data(), coefs.data(),
                           GRB_LESS_EQUAL, 1.0, nullptr));
    }
    for (int w = 0; w < g.n_right; ++w) {
        if (right_cols[w].empty()) continue;
        std::vector<double> coefs(right_cols[w].size(), 1.0);
        CHECK(GRBaddconstr(model, (int)right_cols[w].size(),
                           right_cols[w].data(), coefs.data(),
                           GRB_LESS_EQUAL, 1.0, nullptr));
    }

    auto t0 = std::chrono::steady_clock::now();
    int err = GRBoptimize(model);
    auto t1 = std::chrono::steady_clock::now();
    double elapsed = std::chrono::duration<double>(t1 - t0).count();

    if (err) {
        char buf[256];
        snprintf(buf, sizeof(buf), "Gurobi optimize error %d: %s",
                 err, GRBgeterrormsg(env));
        print_result(-1, elapsed, "error", buf);
        cleanup();
        return 1;
    }

    int status;
    CHECK(GRBgetintattr(model, "Status", &status));

    if (status == GRB_TIME_LIMIT) {
        char buf[64]; snprintf(buf, sizeof(buf), "TimeLimit (status %d)", status);
        print_result(-1, elapsed, "timeout", buf);
        cleanup();
        return 0;
    }
    if (status != GRB_OPTIMAL) {
        char buf[64]; snprintf(buf, sizeof(buf), "Gurobi status %d", status);
        print_result(-1, elapsed, "error", buf);
        cleanup();
        return 1;
    }

    double objval = 0.0;
    CHECK(GRBgetdblattr(model, "ObjVal", &objval));
    print_result((int)(objval + 0.5), elapsed, "optimal");
    cleanup();
    return 0;
#undef CHECK
}
