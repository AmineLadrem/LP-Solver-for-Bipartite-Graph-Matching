# CMakeLists.txt
#
# Build C++ solver binaries for the MCBP experiments.
# Each target is built only if its dependency is found; missing solvers are
# reported as warnings, not fatal errors.
#
# All external paths are exposed as cache variables so they can be overridden
# from the command line, e.g.:
#
#   cmake -B build -S . \
#       -DLEMON_INCLUDE_DIR="C:/dev/lemon-src/include" \
#       -DHIGHS_DIR="C:/dev/highs" \
#       -DGUROBI_INCLUDE_DIR="C:/dev/gurobi_include" \
#       -DGUROBI_LIB="C:/dev/gurobi130.lib" \
#       -DGUROBI_DLL="C:/.../gurobipy/gurobi130.dll"
#
# Then:  cmake --build build --config Release
#
cmake_minimum_required(VERSION 3.20)
project(mcbp_experiments CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY         "${CMAKE_SOURCE_DIR}/bin")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE "${CMAKE_SOURCE_DIR}/bin")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG   "${CMAKE_SOURCE_DIR}/bin")

# Toggle individual targets without touching paths.
option(BUILD_LEMON_HK  "Build LEMON Hopcroft-Karp baseline"   ON)
option(BUILD_HIGHS_LP  "Build HiGHS LP target"                ON)
option(BUILD_GUROBI_LP "Build Gurobi LP target"               ON)

# ── LEMON (header-only) ─────────────────────────────────────────────────────
set(LEMON_INCLUDE_DIR "C:/dev/lemon-src/include"
    CACHE PATH "Directory containing lemon/matching.h")

# ── HiGHS ───────────────────────────────────────────────────────────────────
set(HIGHS_DIR "C:/dev/highs"
    CACHE PATH "HiGHS install prefix (contains lib/cmake/highs/)")

# ── Gurobi C API (import lib from gurobi*.dll shipped with gurobipy) ────────
set(GUROBI_INCLUDE_DIR "C:/dev/gurobi_include"
    CACHE PATH "Directory containing gurobi_c.h")
set(GUROBI_LIB "C:/dev/gurobi130.lib"
    CACHE FILEPATH "Gurobi import library (.lib generated from gurobi*.dll)")
set(GUROBI_DLL ""
    CACHE FILEPATH "Path to gurobi*.dll (copied next to the binary if set)")

include_directories(${CMAKE_SOURCE_DIR}/src)

# ─────────────────────────────────────────────────────────────────────────────
# Target: lemon_hk
# ─────────────────────────────────────────────────────────────────────────────
if(BUILD_LEMON_HK)
    if(EXISTS "${LEMON_INCLUDE_DIR}/lemon/matching.h")
        add_executable(lemon_hk src/lemon_hk.cpp)
        target_include_directories(lemon_hk PRIVATE ${LEMON_INCLUDE_DIR})
        if(WIN32)
            target_link_libraries(lemon_hk PRIVATE psapi)
        endif()
    else()
        message(WARNING
            "LEMON headers not found at ${LEMON_INCLUDE_DIR} - "
            "skipping lemon_hk. Set -DLEMON_INCLUDE_DIR=... to build it.")
    endif()
endif()

# ─────────────────────────────────────────────────────────────────────────────
# Target: highs_lp
# ─────────────────────────────────────────────────────────────────────────────
if(BUILD_HIGHS_LP)
    find_package(highs CONFIG QUIET PATHS "${HIGHS_DIR}/lib/cmake/highs"
                 NO_DEFAULT_PATH)
    if(highs_FOUND)
        add_executable(highs_lp src/highs_lp.cpp)
        target_include_directories(highs_lp PRIVATE "${HIGHS_DIR}/include/highs")
        target_link_libraries(highs_lp PRIVATE highs::highs)
        if(WIN32)
            target_link_libraries(highs_lp PRIVATE psapi)
        endif()
    else()
        message(WARNING
            "HiGHS CMake package not found at ${HIGHS_DIR} - "
            "skipping highs_lp. Set -DHIGHS_DIR=... to build it.")
    endif()
endif()

# ─────────────────────────────────────────────────────────────────────────────
# Target: gurobi_lp
# ─────────────────────────────────────────────────────────────────────────────
if(BUILD_GUROBI_LP)
    if(EXISTS "${GUROBI_INCLUDE_DIR}/gurobi_c.h" AND EXISTS "${GUROBI_LIB}")
        add_executable(gurobi_lp src/gurobi_lp.cpp)
        target_include_directories(gurobi_lp PRIVATE ${GUROBI_INCLUDE_DIR})
        target_link_libraries(gurobi_lp PRIVATE ${GUROBI_LIB})
        if(WIN32)
            target_link_libraries(gurobi_lp PRIVATE psapi)
        endif()
        if(GUROBI_DLL AND EXISTS "${GUROBI_DLL}")
            add_custom_command(TARGET gurobi_lp POST_BUILD
                COMMAND ${CMAKE_COMMAND} -E copy_if_different
                    "${GUROBI_DLL}" "${CMAKE_SOURCE_DIR}/bin/"
                COMMENT "Copying Gurobi runtime DLL to bin/")
        endif()
    else()
        message(WARNING
            "Gurobi C API not found "
            "(GUROBI_INCLUDE_DIR=${GUROBI_INCLUDE_DIR}, "
            "GUROBI_LIB=${GUROBI_LIB}) - skipping gurobi_lp.")
    endif()
endif()

