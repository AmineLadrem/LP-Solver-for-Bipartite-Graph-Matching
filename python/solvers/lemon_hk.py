

import os
import subprocess
import threading
import time
from pathlib import Path

import psutil

from ._common import make_result

PROJECT_ROOT = Path(__file__).parent.parent.parent
BIN_DIR = PROJECT_ROOT / "bin"


def _exe_name() -> str:
    return "lemon_hk.exe" if os.name == "nt" else "lemon_hk"


def _poll_child_memory(stop_event, peak_mb, pid_holder):
    while not stop_event.is_set():
        try:
            pid = pid_holder[0]
            if pid is not None:
                mb = psutil.Process(pid).memory_info().rss / 1024 / 1024
                if mb > peak_mb[0]:
                    peak_mb[0] = mb
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        time.sleep(0.05)


def solve(graph_path: str, time_limit: float = 300.0) -> dict:
    exe = BIN_DIR / _exe_name()
    if not exe.exists():
        return make_result(
            status="error",
            error_message=f"Binary not found: {exe}. Build with CMake first.",
        )

    peak_mb = [0.0]
    pid_holder = [None]
    stop_event = threading.Event()
    mon = threading.Thread(
        target=_poll_child_memory,
        args=(stop_event, peak_mb, pid_holder),
        daemon=True,
    )
    mon.start()
    t0 = time.perf_counter()
    try:
        proc = subprocess.Popen(
            [str(exe), str(graph_path)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        pid_holder[0] = proc.pid
        try:
            stdout, stderr = proc.communicate(timeout=time_limit)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()
            return make_result(
                time_seconds=time.perf_counter() - t0,
                peak_memory_mb=peak_mb[0],
                status="timeout",
                error_message=f"lemon_hk exceeded time_limit={time_limit}s",
            )
        elapsed = time.perf_counter() - t0

        if proc.returncode != 0:
            return make_result(
                time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                status="error",
                error_message=stderr.strip() or f"exit code {proc.returncode}",
            )

        parsed = {}
        status_line = "optimal"
        for line in stdout.splitlines():
            line = line.strip()
            if line.startswith("MATCHING_SIZE"):
                parsed["matching_size"] = int(line.split()[1])
            elif line.startswith("TIME_SECONDS"):
                parsed["time_seconds"] = float(line.split()[1])
            elif line.startswith("PEAK_MEMORY_MB"):
                parsed["peak_memory_mb"] = float(line.split()[1])
            elif line.startswith("STATUS"):
                status_line = line.split(maxsplit=1)[1].strip()

        if "matching_size" not in parsed:
            return make_result(
                time_seconds=elapsed, peak_memory_mb=peak_mb[0],
                status="error",
                error_message=f"Unexpected output: {stdout[:200]}",
            )

        return make_result(
            matching_size=parsed["matching_size"],
            time_seconds=elapsed,
            peak_memory_mb=max(parsed.get("peak_memory_mb", 0.0), peak_mb[0]),
            status=status_line,
        )
    except Exception as e:
        return make_result(
            time_seconds=time.perf_counter() - t0,
            peak_memory_mb=peak_mb[0],
            status="error",
            error_message=str(e),
        )
    finally:
        stop_event.set()
        mon.join(timeout=0.2)
