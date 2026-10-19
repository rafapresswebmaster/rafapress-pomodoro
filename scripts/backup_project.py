"""Create and verify a complete project ZIP, excluding previous backups.

Usage: python scripts/backup_project.py day-1-accepted
Uses only Python's standard library. Never overwrites an earlier backup.
"""

import argparse
from datetime import datetime
from pathlib import Path
import re
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("label", nargs="?", default="manual")
    args = parser.parse_args()
    label = re.sub(r"[^A-Za-z0-9_-]+", "-", args.label).strip("-")[:60] or "manual"
    root = Path(__file__).resolve().parents[1]
    if not (root / "game.rmmzproject").is_file():
        raise SystemExit("No RPG Maker MZ project found beside the scripts folder.")
    backup_dir = root / "backups"
    backup_dir.mkdir(exist_ok=True)
    stamp = datetime.now().astimezone().strftime("%Y-%m-%d_%H-%M-%S_%f")
    destination = backup_dir / f"RPG-Manager_{stamp}_{label}.zip"
    partial = destination.with_suffix(".zip.partial")
    entries = sorted(path for path in root.rglob("*")
                     if path.relative_to(root).parts[0] != "backups")
    file_count = 0
    print(f"Creating backup: {destination.name}", flush=True)
    # A failed/interrupted run remains .partial and is never reported as complete.
    with zipfile.ZipFile(partial, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in entries:
            if path.is_symlink():
                raise RuntimeError(f"Cannot snapshot a symbolic link safely: {path}")
            before = path.stat()
            archive.write(path, (Path(root.name) / path.relative_to(root)).as_posix())
            if path.is_file():
                after = path.stat()
                if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
                    raise RuntimeError(f"File changed during backup; run again: {path}")
                file_count += 1
    print("Verifying every archived file...", flush=True)
    with zipfile.ZipFile(partial, "r") as archive:
        if len(archive.infolist()) != len(entries):
            raise RuntimeError("Backup entry count does not match the project snapshot.")
        damaged = archive.testzip()
        if damaged:
            raise RuntimeError(f"Backup verification failed: {damaged}")
    partial.rename(destination)
    print(f"Verified {file_count} files; {destination.stat().st_size / (1024 ** 2):.1f} MiB.")
    print(f"Backup saved: {destination}")


if __name__ == "__main__":
    main()
