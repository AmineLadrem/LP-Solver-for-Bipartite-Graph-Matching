from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List, Tuple, Dict

import matplotlib
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation, PillowWriter, FFMpegWriter
import networkx as nx

C_U_NODE   = "#4393c3"
C_V_NODE   = "#d73027"
C_EDGE     = "#dddddd"
C_MATCHED  = "#e41a1c"
C_EXPLORE  = "#ff9900"
C_BG       = "#f8f8f8"

DEMO = {
    "n_left": 8, "n_right": 8,
    "edges": [
        (0,0),(0,2),(0,5),
        (1,1),(1,3),
        (2,2),(2,4),
        (3,3),(3,6),
        (4,4),(4,7),
        (5,0),(5,5),(5,6),
        (6,1),(6,6),(6,7),
        (7,2),(7,7),(7,3),
    ],
}

Step = Dict

def matching_with_steps(
    n_left: int, n_right: int, edges: List[Tuple[int, int]]
) -> List[Step]:

    adj = [[] for _ in range(n_left)]
    for u, v in edges:
        adj[u].append(v)

    match_l = [-1] * n_left
    match_r = [-1] * n_right
    steps: List[Step] = []

    def dfs(u: int, visited: set, path: List[Tuple[int, int]]) -> bool:
        for v in adj[u]:
            if v in visited:
                continue
            visited.add(v)
            new_path = path + [(u, v)]

            steps.append({
                "phase": "explore",
                "path": list(new_path),
                "match_l": match_l[:],
                "match_r": match_r[:],
            })
            if match_r[v] == -1 or dfs(match_r[v], visited, new_path + [(-1, -1)]):

                match_l[u] = v
                match_r[v] = u
                return True
        return False

    for u in range(n_left):
        if match_l[u] == -1:
            found = dfs(u, set(), [])

            steps.append({
                "phase": "augment" if found else "fail",
                "path": [],
                "match_l": match_l[:],
                "match_r": match_r[:],
            })

    return steps

def build_frames(steps: List[Step], n_left: int, n_right: int,
                 edges: List[Tuple[int, int]], pause_frames: int = 6) -> List[Dict]:

    frames = []
    edge_set = set(edges)

    def frame(match_l, match_r, highlight=None, label=""):
        frames.append({
            "match_l": list(match_l),
            "match_r": list(match_r),
            "highlight": list(highlight or []),
            "label": label,
        })

    empty_l = [-1] * n_left
    empty_r = [-1] * n_right

    for _ in range(max(pause_frames, 3)):
        frame(empty_l, empty_r, label="Initial graph — no matching yet")

    prev_match_l = list(empty_l)
    prev_match_r = list(empty_r)
    matching_size = 0

    for step in steps:
        if step["phase"] == "explore":
            path_edges = [(u, v) for u, v in step["path"] if u >= 0 and v >= 0]
            frame(prev_match_l, prev_match_r,
                  highlight=path_edges,
                  label=f"Exploring augmenting path…  ({len(path_edges)} edges traced)")

        elif step["phase"] == "augment":
            matching_size = sum(1 for x in step["match_l"] if x >= 0)
            for _ in range(pause_frames):
                frame(step["match_l"], step["match_r"],
                      label=f"Augmented!  Matching size = {matching_size}")
            prev_match_l = list(step["match_l"])
            prev_match_r = list(step["match_r"])

        elif step["phase"] == "fail":
            frame(prev_match_l, prev_match_r,
                  label="No augmenting path from this vertex — skip")

    for _ in range(pause_frames * 3):
        frame(prev_match_l, prev_match_r,
              label=f"Done.  Maximum matching = {matching_size} edges")

    return frames

def make_animation(graph: Dict, interval: int = 150, save_path: str | None = None):
    n_left  = graph["n_left"]
    n_right = graph["n_right"]
    edges   = graph["edges"]
    title   = graph.get("title", f"|U|={n_left}, |V|={n_right}, |E|={len(edges)}")

    pos: Dict[str, Tuple[float, float]] = {}
    nL = max(n_left  - 1, 1)
    nR = max(n_right - 1, 1)
    for i in range(n_left):
        pos[f"U{i}"] = (0.0, i / nL)
    for j in range(n_right):
        pos[f"V{j}"] = (1.0, j / nR)

    G = nx.Graph()
    G.add_nodes_from([f"U{i}" for i in range(n_left)])
    G.add_nodes_from([f"V{j}" for j in range(n_right)])
    for u, v in edges:
        G.add_edge(f"U{u}", f"V{v}")

    steps  = matching_with_steps(n_left, n_right, edges)
    frames = build_frames(steps, n_left, n_right, edges)

    h = max(5, min(13, max(n_left, n_right) * 0.55))
    fig, ax = plt.subplots(figsize=(7, h), facecolor=C_BG)
    ax.set_facecolor(C_BG)

    legend_handles = [
        mpatches.Patch(color=C_U_NODE,  label=f"Left  U  ({n_left} nodes)"),
        mpatches.Patch(color=C_V_NODE,  label=f"Right V  ({n_right} nodes)"),
        plt.Line2D([0],[0], color=C_MATCHED, lw=3,  label="Matched edge"),
        plt.Line2D([0],[0], color=C_EXPLORE, lw=2,  label="Exploring path"),
        plt.Line2D([0],[0], color=C_EDGE,    lw=1,  label="Unmatched edge"),
    ]
    legend = ax.legend(handles=legend_handles, loc="lower center",
                       bbox_to_anchor=(0.5, -0.01), ncol=3, fontsize=8,
                       framealpha=0.9, edgecolor="#cccccc")

    ax.text(-0.10, 1.03, "U", transform=ax.transAxes,
            fontsize=13, fontweight="bold", color=C_U_NODE)
    ax.text( 0.95, 1.03, "V", transform=ax.transAxes,
            fontsize=13, fontweight="bold", color=C_V_NODE)

    sup = fig.suptitle(title, fontsize=11, y=0.99)
    status_text = ax.set_title("", fontsize=10, pad=6, color="#333333")

    def render(frame_idx: int):
        ax.clear()
        ax.set_facecolor(C_BG)
        ax.axis("off")

        fr = frames[frame_idx]
        match_l   = fr["match_l"]
        highlight = set(map(tuple, fr["highlight"]))

        matched_edges   = []
        unmatched_edges = []
        explore_edges   = []

        for u, v in edges:
            eu, ev = f"U{u}", f"V{v}"
            if (u, v) in highlight:
                explore_edges.append((eu, ev))
            elif match_l[u] == v:
                matched_edges.append((eu, ev))
            else:
                unmatched_edges.append((eu, ev))

        nx.draw_networkx_edges(G, pos, edgelist=unmatched_edges,
                               edge_color=C_EDGE,    width=0.9, alpha=0.6, ax=ax)
        nx.draw_networkx_edges(G, pos, edgelist=matched_edges,
                               edge_color=C_MATCHED, width=3.2, alpha=1.0, ax=ax)
        nx.draw_networkx_edges(G, pos, edgelist=explore_edges,
                               edge_color=C_EXPLORE, width=2.5, alpha=0.95,
                               style="dashed", ax=ax)

        nx.draw_networkx_nodes(G, pos,
                               nodelist=[f"U{i}" for i in range(n_left)],
                               node_color=[
                                   C_U_NODE if match_l[i] >= 0
                                   else "#aec7e8"
                                   for i in range(n_left)
                               ],
                               node_size=320, edgecolors="white",
                               linewidths=1.2, ax=ax)
        nx.draw_networkx_nodes(G, pos,
                               nodelist=[f"V{j}" for j in range(n_right)],
                               node_color=[
                                   C_V_NODE if fr["match_r"][j] >= 0
                                   else "#f4a582"
                                   for j in range(n_right)
                               ],
                               node_size=320, edgecolors="white",
                               linewidths=1.2, ax=ax)

        if n_left <= 20 and n_right <= 20:
            nx.draw_networkx_labels(G, pos,
                                    labels={f"U{i}": f"u{i}" for i in range(n_left)},
                                    font_size=7, font_color="white", ax=ax)
            nx.draw_networkx_labels(G, pos,
                                    labels={f"V{j}": f"v{j}" for j in range(n_right)},
                                    font_size=7, font_color="white", ax=ax)

        ax.set_title(fr["label"], fontsize=10, pad=8, color="#333333")

        ax.legend(handles=legend_handles, loc="lower center",
                  bbox_to_anchor=(0.5, -0.01), ncol=3, fontsize=8,
                  framealpha=0.9, edgecolor="#cccccc")
        ax.text(-0.10, 1.03, "U", transform=ax.transAxes,
                fontsize=13, fontweight="bold", color=C_U_NODE)
        ax.text( 0.95, 1.03, "V", transform=ax.transAxes,
                fontsize=13, fontweight="bold", color=C_V_NODE)
        ax.text(0.5, 1.03,
                f"frame {frame_idx+1}/{len(frames)}",
                transform=ax.transAxes,
                fontsize=8, color="#999999", ha="center")

    ani = FuncAnimation(fig, render, frames=len(frames),
                        interval=interval, repeat=True)
    fig.tight_layout()

    if save_path:
        ext = Path(save_path).suffix.lower()
        print(f"Saving {len(frames)} frames to {save_path} …", flush=True)
        if ext == ".gif":
            ani.save(save_path, writer=PillowWriter(fps=1000 // interval))
        elif ext in (".mp4", ".mov", ".avi"):
            ani.save(save_path, writer=FFMpegWriter(fps=1000 // interval))
        else:
            ani.save(save_path)
        print(f"Saved -> {save_path}")
        plt.close(fig)
    else:
        plt.show()

def read_graph(path: str) -> Dict:
    with open(path) as f:
        n_left, n_right, m = map(int, f.readline().split())
        edges = [tuple(map(int, f.readline().split())) for _ in range(m)]
    return {"n_left": n_left, "n_right": n_right, "edges": edges,
            "title": Path(path).name}

def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("graph_file", nargs="?", default=None,
                   help=".graph file to visualise (omit for --demo).")
    p.add_argument("--demo",     action="store_true", help="Use built-in 8×8 demo.")
    p.add_argument("--save",     metavar="PATH", default=None,
                   help="Save as .gif or .mp4 instead of displaying.")
    p.add_argument("--interval", type=int, default=150,
                   help="Milliseconds per frame (default 150).")
    args = p.parse_args()

    if args.demo or args.graph_file is None:
        graph = dict(DEMO, title="Demo 8×8 bipartite graph — augmenting path animation")
    else:
        path = Path(args.graph_file)
        if not path.exists():
            sys.exit(f"File not found: {path}")
        graph = read_graph(str(path))

        if graph["n_left"] > 32:
            print(f"[warn] n_left={graph['n_left']} — animation may be very long. "
                  "Consider a smaller graph.", file=sys.stderr)

    make_animation(graph, interval=args.interval, save_path=args.save)

if __name__ == "__main__":
    main()
