

#include <chrono>
#include <cstdio>
#include <string>

#include <lemon/list_graph.h>
#include <lemon/matching.h>

#include "graph_io.hpp"

int main(int argc, char* argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: lemon_hk <graph_file> [--time-limit SECONDS]\n");
        return 1;
    }
    Graph g;
    try {
        g = read_graph(argv[1]);
    } catch (const std::exception& e) {
        print_result(-1, 0.0, "error", e.what());
        return 1;
    }
    auto t0 = std::chrono::steady_clock::now();
    try {
        lemon::ListBpGraph bg;
        std::vector<lemon::ListBpGraph::RedNode>  reds(g.n_left);
        std::vector<lemon::ListBpGraph::BlueNode> blues(g.n_right);
        for (int i = 0; i < g.n_left;  ++i) reds[i]  = bg.addRedNode();
        for (int j = 0; j < g.n_right; ++j) blues[j] = bg.addBlueNode();
        for (auto& [u, w] : g.edges) bg.addEdge(reds[u], blues[w]);

        lemon::MaxMatching<lemon::ListBpGraph> mm(bg);
        mm.run();

        auto t1 = std::chrono::steady_clock::now();
        double elapsed = std::chrono::duration<double>(t1 - t0).count();
        print_result(mm.matchingSize(), elapsed, "optimal");
        return 0;
    } catch (const std::exception& e) {
        auto t1 = std::chrono::steady_clock::now();
        double elapsed = std::chrono::duration<double>(t1 - t0).count();
        print_result(-1, elapsed, "error", e.what());
        return 1;
    }
}
