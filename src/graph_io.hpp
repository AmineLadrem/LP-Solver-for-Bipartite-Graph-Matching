
#pragma once
#include <chrono>
#include <cstdio>
#include <fstream>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

#ifdef _WIN32
#include <windows.h>
#include <psapi.h>
#endif

struct Graph {
    int n_left = 0, n_right = 0;
    std::vector<std::pair<int,int>> edges;
};

inline Graph read_graph(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open())
        throw std::runtime_error("Cannot open graph file: " + path);
    Graph g;
    int m;
    f >> g.n_left >> g.n_right >> m;
    g.edges.resize(m);
    for (int i = 0; i < m; ++i)
        f >> g.edges[i].first >> g.edges[i].second;
    return g;
}

inline double peak_memory_mb() {
#ifdef _WIN32
    PROCESS_MEMORY_COUNTERS pmc{};
    if (GetProcessMemoryInfo(GetCurrentProcess(), &pmc, sizeof(pmc)))
        return pmc.PeakWorkingSetSize / (1024.0 * 1024.0);
    return 0.0;
#else
    return 0.0;
#endif
}

inline double parse_time_limit(int argc, char* argv[], double def_value = 300.0) {
    
    for (int i = 2; i < argc - 1; ++i) {
        std::string s = argv[i];
        if (s == "--time-limit" || s == "-t") {
            try {
                return std::stod(argv[i + 1]);
            } catch (...) {  }
        }
    }
    return def_value;
}

inline void print_result(int matching_size, double elapsed, const char* status,
                         const char* error = nullptr) {
    printf("MATCHING_SIZE %d\n", matching_size);
    printf("TIME_SECONDS %.9f\n", elapsed);
    printf("PEAK_MEMORY_MB %.3f\n", peak_memory_mb());
    printf("STATUS %s\n", status);
    if (error && *error) printf("ERROR_MESSAGE %s\n", error);
}
