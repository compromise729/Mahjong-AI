"""One persistent Node worker; stdout is protocol only."""
import json
import os
import queue
import shutil
import subprocess
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class Bridge:
    def __init__(self, node=None, timeout=120):
        executable = node or os.environ.get("MAHJONG_NODE") or shutil.which("node")
        if not executable:
            raise RuntimeError("Node.js is required; set MAHJONG_NODE to its executable.")
        self.timeout = timeout
        self.sequence = 0
        self.responses = queue.Queue()
        self.process = subprocess.Popen(
            [str(executable), str(ROOT / "training/sim/server.mjs")],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=None,
            text=True, encoding="utf-8", bufsize=1,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()

    def _read(self):
        try:
            for line in self.process.stdout:
                self.responses.put(line)
        finally:
            self.responses.put(None)

    def request(self, command, **kwargs):
        if self.process.poll() is not None:
            raise RuntimeError(f"Simulator exited: {self.process.returncode}")
        self.sequence += 1
        self.process.stdin.write(json.dumps({"id": self.sequence, "cmd": command, **kwargs}) + "\n")
        self.process.stdin.flush()
        try:
            raw = self.responses.get(timeout=self.timeout)
        except queue.Empty as error:
            self.close()
            raise TimeoutError(f"Simulator timed out on {command}") from error
        if raw is None:
            raise RuntimeError("Simulator closed its output unexpectedly")
        reply = json.loads(raw)
        if reply.get("id") != self.sequence:
            self.close()
            raise RuntimeError("Simulator request ID mismatch")
        if not reply.get("ok"):
            raise RuntimeError(reply.get("error", "Simulator failed"))
        return reply["result"]

    def close(self):
        if self.process.stdin and not self.process.stdin.closed:
            self.process.stdin.close()
        try:
            self.process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=3)
        self.reader.join(timeout=3)
        if self.process.stdout:
            self.process.stdout.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
