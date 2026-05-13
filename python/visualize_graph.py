import argparse
import sys
from pathlib import Path

import matplotlib
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import networkx as nx

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "python"))

DEMO_GRAPH = {
    "n_left": 6,
    "n_right": 6,
    "edges": [
        (0, 0), (0, 1),
        (1, 1), (1, 2),
        (2, 2), (2, 3),
        (3, 3), (3, 4),
        (4, 4), (4, 5),
        (5, 0), (5, 5),
        (0, 3), (2, 5), (3, 1),
    ],
}

def read_graph(path: str):
    with open(path) as f:
        n_left, n_right, m = map(int, f.readline().split())
        edges = [tuple(map(int, f.readline().split())) for _ in range(m)]
    return {"n_left": n_left, "n_right": n_right, "edges": edges}

def maximum_matching(n_left, n_right, edges):

    match_l = [-1] * n_left
    match_r = [-1] * n_right
    adj = [[] for _ in range(n_left)]
    for u, v in edges:
        adj[u].append(v)

    def dfs(u, visited):
        for v in adj[u]:
            if v not in visited:
                visited.add(v)
                if match_r[v] == -1 or dfs(match_r[v], visited):
                    match_l[u] = v
                    match_r[v] = u
                    return True
        return False

    for u in range(n_left):
        dfs(u, set())

    matched = set()
    for u in range(n_left):
        if match_l[u] != -1:
            matched.add((u, match_l[u]))
    return matched

def draw(graph, title="", save_path=None, max_edges_shown=300):
    n_left  = graph["n_left"]
    n_right = graph["n_right"]
    edges   = graph["edges"]

    if len(edges) > max_edges_shown:
        import random
        rng = random.Random(0)
        sampled = rng.sample(edges, max_edges_shown)
        note = f"  (showing {max_edges_shown} of {len(edges)} edges)"
    else:
        sampled = edges
        note = ""

    matching = maximum_matching(n_left, n_right, edges)

    pos = {}
    for i in range(n_left):
        pos[f"U{i}"] = (0.0, (n_left - 1 - i) / max(n_left - 1, 1))
    for j in range(n_right):
        pos[f"V{j}"] = (1.0, (n_right - 1 - j) / max(n_right - 1, 1))

    G = nx.Graph()
    G.add_nodes_from([f"U{i}" for i in range(n_left)])
    G.add_nodes_from([f"V{j}" for j in range(n_right)])
    for u, v in sampled:
        G.add_edge(f"U{u}", f"V{v}")

    matched_edges   = [(f"U{u}", f"V{v}") for u, v in matching if (u, v) in set(sampled)]
    unmatched_edges = [(f"U{u}", f"V{v}") for u, v in sampled
                       if (u, v) not in matching]

    h = max(5, min(14, max(n_left, n_right) * 0.45))
    fig, ax = plt.subplots(figsize=(7, h))

    nx.draw_networkx_edges(G, pos, edgelist=unmatched_edges,
                           edge_color="#cccccc", width=0.8, alpha=0.7, ax=ax)

    nx.draw_networkx_edges(G, pos, edgelist=matched_edges,
                           edge_color="#e41a1c", width=3.0, alpha=0.95, ax=ax)

    nx.draw_networkx_nodes(G, pos,
                           nodelist=[f"U{i}" for i in range(n_left)],
                           node_color="#4393c3", node_size=300,
                           edgecolors="white", linewidths=1.0, ax=ax)

    nx.draw_networkx_nodes(G, pos,
                           nodelist=[f"V{j}" for j in range(n_right)],
                           node_color="#d73027", node_size=300,
                           edgecolors="white", linewidths=1.0, ax=ax)

    if n_left <= 20 and n_right <= 20:
        nx.draw_networkx_labels(G, pos,
                                labels={f"U{i}": f"u{i}" for i in range(n_left)},
                                font_size=8, font_color="white", ax=ax)
        nx.draw_networkx_labels(G, pos,
                                labels={f"V{j}": f"v{j}" for j in range(n_right)},
                                font_size=8, font_color="white", ax=ax)

    ax.text(-0.08, 1.04, f"U  ({n_left} vertices)", transform=ax.transAxes,
            fontsize=11, fontweight="bold", color="#4393c3")
    ax.text( 0.78, 1.04, f"V  ({n_right} vertices)", transform=ax.transAxes,
            fontsize=11, fontweight="bold", color="#d73027")

    legend_handles = [
        mpatches.Patch(color="#4393c3", label=f"Left side  U  ({n_left} nodes)"),
        mpatches.Patch(color="#d73027", label=f"Right side V  ({n_right} nodes)"),
        plt.Line2D([0], [0], color="#e41a1c", linewidth=3,
                   label=f"Matched edge  ({len(matching)} edges)"),
        plt.Line2D([0], [0], color="#cccccc", linewidth=1,
                   label=f"Unmatched edge  ({len(edges) - len(matching)} remaining)"),
    ]
    ax.legend(handles=legend_handles, loc="lower center",
              bbox_to_anchor=(0.5, -0.02), ncol=2, fontsize=9,
              framealpha=0.9)

    full_title = (
        f"{title}\n"
        f"|U|={n_left}, |V|={n_right}, |E|={len(edges)}, "
        f"max matching={len(matching)}{note}"
    )
    ax.set_title(full_title, fontsize=11, pad=12)
    ax.axis("off")
    fig.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"Saved to {save_path}")
    else:
        plt.show()
    plt.close(fig)

def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("graph_file", nargs="?", default=None,
                   help="Path to a .graph file.  Omit to use --demo.")
    p.add_argument("--demo", action="store_true",
                   help="Show the built-in 6×6 demo graph.")
    p.add_argument("--save", metavar="PATH", default=None,
                   help="Save figure to this path instead of displaying.")
    p.add_argument("--max-edges", type=int, default=300,
                   help="Cap on edges drawn (random sample if exceeded).")
    args = p.parse_args()

    if args.demo or args.graph_file is None:
        graph = DEMO_GRAPH
        title = "Demo bipartite graph (6×6)"
    else:
        path = Path(args.graph_file)
        if not path.exists():
            sys.exit(f"File not found: {path}")
        graph = read_graph(str(path))
        title = path.name

    draw(graph, title=title, save_path=args.save, max_edges_shown=args.max_edges)

if __name__ == "__main__":
    main()
