import subprocess
from pathlib import Path


def test_no_equipment_context_in_backend():
    backend_dir = Path(__file__).resolve().parent.parent
    r = subprocess.run(
        [
            "grep",
            "-r",
            "--exclude-dir=.venv",
            "--exclude-dir=.pytest_cache",
            "--exclude",
            Path(__file__).name,
            "equipment_context",
            str(backend_dir),
        ],
        capture_output=True,
        text=True,
    )
    assert r.stdout == "", f"equipment_context still exists: {r.stdout}"
