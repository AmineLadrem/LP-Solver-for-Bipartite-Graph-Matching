from __future__ import annotations

import os
import threading
import time
from contextlib import contextmanager
from typing import Tuple

import psutil

def read_graph(path: str) -> Tuple[int, int, list]:

    with open(path) as f:
        n_left, n_right, m = map(int, f.readline().split())
        edges = []
        for _ in range(m):
            u, w = map(int, f.readline().split())
            edges.append((u, w))
    return n_left, n_right, edges

def _poll_self_memory(stop_event: threading.Event, peak_mb: list) -> None:
    proc = psutil.Process(os.getpid())
    while not stop_event.is_set():
        try:
            mb = proc.memory_info().rss / 1024 / 1024
            if mb > peak_mb[0]:
                peak_mb[0] = mb
        except Exception:
            pass
        time.sleep(0.05)

@contextmanager
def memory_monitor():

    peak_mb = [0.0]
    stop_event = threading.Event()
    thread = threading.Thread(
        target=_poll_self_memory, args=(stop_event, peak_mb), daemon=True
    )
    thread.start()
    try:
        yield peak_mb
    finally:
        stop_event.set()
        thread.join(timeout=0.2)

def make_result(
    matching_size: int = -1,
    time_seconds: float = 0.0,
    peak_memory_mb: float = 0.0,
    status: str = "error",
    error_message: str = "",
) -> dict:
    return {
        "matching_size": matching_size,
        "time_seconds": time_seconds,
        "peak_memory_mb": peak_memory_mb,
        "status": status,
        "error_message": error_message,
    }
