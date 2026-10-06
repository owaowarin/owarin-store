"""Authenticated Windows worker for the append-only Apps Script image queue.

Live mode needs google-auth and google-api-python-client plus a service-account
JSON path outside this workspace. --self-test uses only the standard library.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from collections import Counter, defaultdict
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

SPREADSHEET_ID = "16TV5aA0iYMZQhDv34HFTkNOe0nBpk66pa4HC3wt98S0"
QUEUE_HEADERS = [
    "Request ID", "Batch ID", "Requested UTC", "Mode", "Source", "Product ID",
    "Item name", "Type", "Requested Status", "Input fingerprint", "Plan ID",
    "Plan hash", "Scope version", "Snapshot read UTC",
]
RESULT_HEADERS = [
    "Request ID", "Batch ID", "Source", "Product ID", "Item name", "Input fingerprint",
    "Manifest hash", "State", "Photo count", "Cover URL", "Image URLs", "Run ID",
    "Plan ID", "Plan hash", "Last checked UTC", "Last success UTC", "Error",
    "Local output path", "Snapshot read UTC",
]
INVENTORY_HEADERS = ["Item name", "Product ID", "Status", "Type"]
SOURCES = ("GAME GUIDE BOOKS", "MAGAZINE")
STATUS = "Instock"
MODE = "EXPORT_INSTOCK"
SCOPE_VERSION = "r2-hybrid-v4"
SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$")


class WorkerError(RuntimeError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def fingerprint(source: str, product_id: str, item_name: str, item_type: str, status: str) -> str:
    value = "\x1f".join((source, product_id, item_name, item_type, status))
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def batch_digest(batch: list[dict[str, str]]) -> str:
    fields = [field for field in QUEUE_HEADERS if field not in ("Plan ID", "Plan hash")]
    ordered = sorted(batch, key=lambda row: row["Request ID"])
    payload = "\n".join("\x1f".join(row.get(field, "") for field in fields) for row in ordered)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def atomic_json_write(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temp, path)


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def parse_queue(values: list[list[object]]) -> list[dict[str, str]]:
    if not values:
        return []
    header = [str(value) for value in values[0][: len(QUEUE_HEADERS)]]
    if header != QUEUE_HEADERS:
        raise WorkerError("R2 JOBS headers do not match the queue contract")
    rows: list[dict[str, str]] = []
    for raw in values[1:]:
        padded = [str(value) if value is not None else "" for value in raw]
        if not any(padded):
            continue
        if len(padded) < len(QUEUE_HEADERS):
            padded += [""] * (len(QUEUE_HEADERS) - len(padded))
        rows.append(dict(zip(QUEUE_HEADERS, padded[: len(QUEUE_HEADERS)])))
    return rows


def group_batches(rows: list[dict[str, str]]) -> dict[str, list[dict[str, str]]]:
    batches: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        if not row.get("Batch ID") or not row.get("Request ID"):
            raise WorkerError("R2 JOBS contains a row without Request ID or Batch ID")
        if not SAFE_ID.fullmatch(row["Batch ID"]) or not SAFE_ID.fullmatch(row["Request ID"]):
            raise WorkerError("R2 JOBS contains an unsafe Request ID or Batch ID")
        batches[row["Batch ID"]].append(row)
    return dict(batches)


def safe_run_dir(state_dir: Path, batch_id: str) -> Path:
    return safe_batch_dir(state_dir / "runs", batch_id)


def safe_batch_dir(parent: Path, batch_id: str) -> Path:
    if not SAFE_ID.fullmatch(batch_id):
        raise WorkerError(f"Unsafe Batch ID: {batch_id}")
    parent = parent.resolve()
    target = (parent / batch_id).resolve()
    if target.parent != parent:
        raise WorkerError(f"Batch path escaped state directory: {batch_id}")
    return target


@contextmanager
def worker_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = path.open("a+b")
    acquired = False
    try:
        if handle.tell() == 0:
            handle.write(b"0")
            handle.flush()
        handle.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            acquired = True
        except OSError as exc:
            raise WorkerError("Another R2 worker is already running") from exc
        yield
    finally:
        try:
            if acquired:
                handle.seek(0)
                if os.name == "nt":
                    import msvcrt
                    msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        finally:
            handle.close()


def file_sha256(path: Path) -> str:
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def migrate_state(source: Path, destination: Path) -> dict:
    source, destination = source.resolve(), destination.resolve()
    if source == destination or source.is_relative_to(destination) or destination.is_relative_to(source):
        raise WorkerError("State migration source and destination must be separate directories")
    ledger_path = source / "ledger.json"
    if not ledger_path.is_file() or not isinstance(load_json(ledger_path), dict):
        raise WorkerError(f"Valid source ledger not found: {ledger_path}")
    if destination.exists() and any(destination.iterdir()):
        raise WorkerError(f"Destination state directory is not empty: {destination}")
    destination.mkdir(parents=True, exist_ok=True)
    copied = []
    with worker_lock(source / "worker.lock"), worker_lock(destination / "worker.lock"):
        for path in source.rglob("*"):
            if not path.is_file() or path.name == "worker.lock" or path.suffix == ".tmp":
                continue
            if path.is_symlink() or not path.resolve().is_relative_to(source):
                raise WorkerError(f"Unsafe state path: {path}")
            relative = path.relative_to(source)
            target = destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
            source_hash, target_hash = file_sha256(path), file_sha256(target)
            if source_hash != target_hash:
                raise WorkerError(f"State migration hash mismatch: {relative}")
            copied.append({"path": str(relative), "bytes": path.stat().st_size, "sha256": source_hash})
        if not any(row["path"] == "ledger.json" for row in copied):
            raise WorkerError("State migration did not copy ledger.json")
        receipt = {"migrated_utc": utc_now(), "source": str(source), "destination": str(destination), "files": copied}
        atomic_json_write(destination / "migration.json", receipt)
    return receipt


def inventory_lookup(rows_by_source: dict[str, list[dict[str, str]]]) -> tuple[dict[tuple[str, str], dict[str, str]], Counter]:
    lookup: dict[tuple[str, str], dict[str, str]] = {}
    counts: Counter = Counter()
    for source, rows in rows_by_source.items():
        for row in rows:
            pid = row.get("Product ID", "").strip()
            if pid:
                counts[pid] += 1
                lookup[(source, pid)] = row
    return lookup, counts


def validate_batch_contract(batch: list[dict[str, str]]) -> None:
    if not batch:
        raise WorkerError("Empty batch")
    if any(row.get("Mode") != MODE for row in batch):
        raise WorkerError("Unsupported mode in batch")
    if any(row.get("Scope version") != SCOPE_VERSION for row in batch):
        raise WorkerError("Legacy or unknown batch scope; requeue with the current Apps Script command")
    counts = {row.get("Plan ID", "") for row in batch}
    hashes = {row.get("Plan hash", "") for row in batch}
    if counts != {f"COUNT:{len(batch)}"} or hashes != {batch_digest(batch)}:
        raise WorkerError("Incomplete or altered batch descriptor; do not process this queue batch")
    if any(row.get("Requested Status") != STATUS for row in batch):
        raise WorkerError("Batch contains a status other than Instock")
    if len({row.get("Snapshot read UTC") for row in batch}) != 1:
        raise WorkerError("Batch does not have one immutable snapshot timestamp")
    if len({row.get("Requested UTC") for row in batch}) != 1:
        raise WorkerError("Batch does not have one request timestamp")
    request_ids = [row["Request ID"] for row in batch]
    if len(set(request_ids)) != len(request_ids):
        raise WorkerError("Duplicate Request ID in batch")
    if len({(row["Source"], row["Product ID"]) for row in batch}) != len(batch):
        raise WorkerError("Duplicate product in batch")


def validate_batch(batch: list[dict[str, str]], rows_by_source: dict[str, list[dict[str, str]]]) -> None:
    validate_batch_contract(batch)
    lookup, counts = inventory_lookup(rows_by_source)
    for row in batch:
        key = (row["Source"], row["Product ID"])
        current = lookup.get(key)
        if current is None or counts[row["Product ID"]] != 1:
            raise WorkerError(f"STALE or duplicate Product ID: {row['Product ID']}")
        expected = {
            "source": row["Source"], "product_id": row["Product ID"],
            "item_name": row["Item name"], "item_type": row["Type"], "status": STATUS,
        }
        actual = {
            "source": row["Source"], "product_id": current.get("Product ID", "").strip(),
            "item_name": current.get("Item name", "").strip(), "item_type": current.get("Type", "").strip(),
            "status": current.get("Status", "").strip(),
        }
        if actual != expected or fingerprint(**expected) != row["Input fingerprint"]:
            raise WorkerError(f"STALE inventory input: {row['Product ID']}")


def write_snapshot_csv(path: Path, batch: list[dict[str, str]], source: str) -> None:
    selected = [row for row in batch if row["Source"] == source]
    if not selected:
        selected = [{"Item name": "__NO_REQUESTED_ROWS__", "Product ID": "__NO_REQUESTED_ROWS__", "Type": "", "Status": "Sold"}]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=INVENTORY_HEADERS)
        writer.writeheader()
        for row in selected:
            writer.writerow({key: row.get(key, "") for key in INVENTORY_HEADERS})


def powershell_path() -> str:
    for name in ("powershell.exe", "pwsh.exe", "pwsh"):
        found = shutil.which(name)
        if found:
            return found
    raise WorkerError("PowerShell was not found")


def run_snapshot(script: Path, project_root: Path, log_dir: Path, cache_path: Path, ggb_csv: Path, magazine_csv: Path, *, mode: str, manifest: Path | None = None) -> str:
    args = [powershell_path(), "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(script),
            "-GgbCsv", str(ggb_csv), "-MagazineCsv", str(magazine_csv), "-ProjectRoot", str(project_root),
            "-LogDir", str(log_dir), "-CachePath", str(cache_path)]
    if mode == "commit":
        args.append("-Commit")
    elif mode == "finalize":
        if manifest is None:
            raise WorkerError("Finalize requires a manifest")
        args += ["-Finalize", "-Manifest", str(manifest)]
    elif mode != "preview":
        raise WorkerError(f"Unsupported snapshot mode: {mode}")
    result = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    output = (result.stdout or "") + "\n" + (result.stderr or "")
    if result.returncode:
        raise WorkerError(output[-4000:])
    return output


def first_marker(output: str, marker: str) -> str:
    match = re.search(rf"^{re.escape(marker)}\s*(.+)$", output, re.MULTILINE)
    if not match:
        raise WorkerError(f"PowerShell output did not contain '{marker}'")
    return match.group(1).strip()


def manifest_summary(path: Path) -> tuple[str, Counter]:
    rows = read_csv_rows(path)
    if not rows:
        raise WorkerError("Manifest is empty")
    hashes = {row.get("PlanHash", "") for row in rows}
    if len(hashes) != 1:
        raise WorkerError("Manifest has multiple plan hashes")
    counts = Counter(row.get("ProductID", "") for row in rows)
    return next(iter(hashes)), counts


def google_service(credentials_path: Path):
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError as exc:
        raise WorkerError("Install requirements-r2-worker.txt before live worker use") from exc
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    credentials = service_account.Credentials.from_service_account_file(str(credentials_path), scopes=scopes)
    return build("sheets", "v4", credentials=credentials, cache_discovery=False)


def sheet_values(service, spreadsheet_id: str, sheet_name: str, columns: str) -> list[list[object]]:
    try:
        response = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=f"'{sheet_name}'!{columns}",
            valueRenderOption="UNFORMATTED_VALUE",
        ).execute()
    except Exception as exc:
        # Before the first Apps Script deploy, the queue tab does not exist yet.
        # Treat only that exact setup state as empty; do not hide auth or other API errors.
        if sheet_name == "R2 JOBS" and "Unable to parse range" in str(exc):
            return []
        raise
    return response.get("values", [])


def read_live_inventory(service, spreadsheet_id: str) -> dict[str, list[dict[str, str]]]:
    output: dict[str, list[dict[str, str]]] = {}
    for source in SOURCES:
        values = sheet_values(service, spreadsheet_id, source, "A:ZZ")
        if not values:
            raise WorkerError(f"Inventory sheet is empty: {source}")
        header_index = next((index for index, row in enumerate(values[:10])
                             if all(name in [str(value).strip() for value in row] for name in INVENTORY_HEADERS)), None)
        if header_index is None:
            raise WorkerError(f"Missing inventory columns in {source}")
        header = [str(value).strip() for value in values[header_index]]
        positions = {name: header.index(name) for name in INVENTORY_HEADERS if name in header}
        rows = []
        for raw in values[header_index + 1:]:
            row = {name: str(raw[index]).strip() if index < len(raw) else "" for name, index in positions.items()}
            if any(row.values()):
                rows.append(row)
        output[source] = rows
    return output


def result_rows(batch: list[dict[str, str]], plan_hash: str, photo_counts: Counter, state: str, output_path: str = "", error: str = "") -> list[list[str]]:
    checked = utc_now()
    success = checked if state == "EXPORTED" else ""
    return [[
        row["Request ID"], row["Batch ID"], row["Source"], row["Product ID"], row["Item name"],
        row["Input fingerprint"], plan_hash, state, str(photo_counts.get(row["Product ID"], 0)), "", "",
        row["Batch ID"], row.get("Plan ID", ""), row.get("Plan hash", ""), checked, success, error,
        output_path, row["Snapshot read UTC"],
    ] for row in batch]


def plan_result_writes(existing: list[list[object]], rows: list[list[str]]) -> tuple[list[dict], list[list[str]]]:
    positions: dict[str, list[int]] = defaultdict(list)
    for index, row in enumerate(existing[1:], start=2):
        if row:
            positions[str(row[0])].append(index)
    updates, appends = [], []
    for row in rows:
        found = positions.get(row[0], [])
        if len(found) > 1:
            raise WorkerError(f"Duplicate Request ID in IMAGE UPLOADS: {row[0]}")
        if not found:
            appends.append(row)
            continue
        current = [str(value) for value in existing[found[0] - 1]]
        current += [""] * (len(RESULT_HEADERS) - len(current))
        if current[:len(RESULT_HEADERS)] != row:
            updates.append({"range": f"'IMAGE UPLOADS'!A{found[0]}:S{found[0]}", "values": [row]})
    return updates, appends


def append_results(service, spreadsheet_id: str, rows: list[list[str]]) -> None:
    if not rows:
        return
    existing = sheet_values(service, spreadsheet_id, "IMAGE UPLOADS", "A:S")
    if existing and [str(value) for value in existing[0][:len(RESULT_HEADERS)]] != RESULT_HEADERS:
        raise WorkerError("IMAGE UPLOADS headers do not match the result contract")
    updates, appends = plan_result_writes(existing or [RESULT_HEADERS], rows)
    if updates:
        service.spreadsheets().values().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={"valueInputOption": "RAW", "data": updates},
        ).execute()
    if appends:
        service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id,
            range="'IMAGE UPLOADS'!A:S",
            valueInputOption="RAW",
            insertDataOption="INSERT_ROWS",
            body={"values": appends},
        ).execute()


def process_batch(service, args, ledger: dict, batch_id: str, batch: list[dict[str, str]], rows_by_source: dict[str, list[dict[str, str]]]) -> str:
    entry = ledger.get(batch_id, {})
    if entry.get("state") == "EXPORTED":
        return "ALREADY_EXPORTED"
    validate_batch_contract(batch)
    if not args.dry_run and entry.get("state") == "PENDING_REPORT":
        append_results(service, args.spreadsheet_id, entry["result_rows"])
        entry["state"] = "EXPORTED"
        ledger[batch_id] = entry
        atomic_json_write(args.state_dir / "ledger.json", ledger)
        return "EXPORTED"
    validate_batch(batch, rows_by_source)
    run_dir = safe_batch_dir(args.state_dir / ("previews" if args.dry_run else "runs"), batch_id)
    run_dir.mkdir(parents=True, exist_ok=True)
    ggb_csv = run_dir / "GAME GUIDE BOOKS.csv"
    magazine_csv = run_dir / "MAGAZINE.csv"
    write_snapshot_csv(ggb_csv, batch, SOURCES[0])
    write_snapshot_csv(magazine_csv, batch, SOURCES[1])
    script = args.project_root / "04 Design Tools" / "export-instock-snapshot.ps1"
    log_dir = args.project_root / "04 Design Tools" / "logs"
    cache_path = args.state_dir / "image-library-cache.json"
    if args.dry_run:
        preview = run_snapshot(script, args.project_root, log_dir, cache_path, ggb_csv, magazine_csv, mode="preview")
        atomic_json_write(run_dir / "preview.json", {
            "state": "PREVIEWED", "count": len(batch), "checked": utc_now(),
            "observed_ledger_state": entry.get("state", ""), "preview_log": first_marker(preview, "Log:"),
        })
        return "PREVIEWED"

    try:
        if entry.get("state") == "FINALIZING" and entry.get("manifest"):
            manifest = Path(entry["manifest"])
            plan_hash, photo_counts = manifest_summary(manifest)
        else:
            ledger[batch_id] = {"state": "COPYING", "checked": utc_now(), "count": len(batch)}
            atomic_json_write(args.state_dir / "ledger.json", ledger)
            commit_output = run_snapshot(script, args.project_root, log_dir, cache_path, ggb_csv, magazine_csv, mode="commit")
            manifest = Path(first_marker(commit_output, "Manifest:"))
            plan_hash, photo_counts = manifest_summary(manifest)
        validate_batch(batch, read_live_inventory(service, args.spreadsheet_id))
        ledger[batch_id] = {"state": "FINALIZING", "checked": utc_now(), "manifest": str(manifest), "plan_hash": plan_hash}
        atomic_json_write(args.state_dir / "ledger.json", ledger)
        final_output = run_snapshot(script, args.project_root, log_dir, cache_path, ggb_csv, magazine_csv, mode="finalize", manifest=manifest)
        final_path = first_marker(final_output, "FINALIZED:")
        rows = result_rows(batch, plan_hash, photo_counts, "EXPORTED", final_path)
        ledger[batch_id] = {"state": "PENDING_REPORT", "checked": utc_now(), "result_rows": rows, "output": final_path}
        atomic_json_write(args.state_dir / "ledger.json", ledger)
        append_results(service, args.spreadsheet_id, rows)
        ledger[batch_id] = {"state": "EXPORTED", "checked": utc_now(), "result_rows": rows, "output": final_path}
        atomic_json_write(args.state_dir / "ledger.json", ledger)
        return "EXPORTED"
    except Exception as exc:
        current_state = ledger.get(batch_id, {}).get("state")
        if current_state in {"FINALIZING", "PENDING_REPORT"}:
            ledger[batch_id]["error"] = str(exc)[-1000:]
            ledger[batch_id]["checked"] = utc_now()
            atomic_json_write(args.state_dir / "ledger.json", ledger)
            raise
        error_rows = result_rows(batch, entry.get("plan_hash", ""), Counter(), "FAILED", error=str(exc)[-1000:])
        try:
            append_results(service, args.spreadsheet_id, error_rows)
        finally:
            ledger[batch_id] = {"state": "FAILED", "checked": utc_now(), "error": str(exc)[-1000:]}
            atomic_json_write(args.state_dir / "ledger.json", ledger)
        raise


def run_once(args) -> int:
    args.state_dir.mkdir(parents=True, exist_ok=True)
    with worker_lock(args.state_dir / "worker.lock"):
        ledger = load_json(args.state_dir / "ledger.json")
        service = google_service(args.credentials)
        queue = parse_queue(sheet_values(service, args.spreadsheet_id, "R2 JOBS", "A:N"))
        batches = group_batches(queue)
        if not batches:
            print("R2 JOBS: empty queue")
            return 0
        inventory = read_live_inventory(service, args.spreadsheet_id)
        failures = 0
        for batch_id, batch in sorted(batches.items(), key=lambda item: item[1][0].get("Requested UTC", "")):
            if ledger.get(batch_id, {}).get("state") == "EXPORTED":
                continue
            try:
                outcome = process_batch(service, args, ledger, batch_id, batch, inventory)
                print(f"{batch_id}: {outcome.lower()}")
            except Exception as exc:
                failures += 1
                print(f"{batch_id}: {exc}", file=sys.stderr)
        return 1 if failures else 0


def self_test() -> None:
    from types import SimpleNamespace
    from unittest.mock import patch

    rows = [QUEUE_HEADERS, ["R2R-1", "R2B-1", "2026-09-22T12:00:00Z", MODE, SOURCES[0], "PID-1", "Book", "Type", STATUS, fingerprint(SOURCES[0], "PID-1", "Book", "Type", STATUS), "", "", SCOPE_VERSION, "2026-09-22T12:00:00Z"]]
    parsed = parse_queue(rows)
    parsed[0]["Plan ID"] = "COUNT:1"
    parsed[0]["Plan hash"] = batch_digest(parsed)
    assert list(group_batches(parsed)) == ["R2B-1"]
    live = {SOURCES[0]: [{"Item name": "Book", "Product ID": "PID-1", "Status": STATUS, "Type": "Type"}], SOURCES[1]: []}
    validate_batch(parsed, live)
    second = dict(parsed[0], **{"Request ID": "R2R-2", "Product ID": "PID-2", "Item name": "Book 2"})
    second["Input fingerprint"] = fingerprint(SOURCES[0], "PID-2", "Book 2", "Type", STATUS)
    full = [dict(parsed[0]), second]
    for row in full:
        row["Plan ID"] = "COUNT:2"
    for row in full:
        row["Plan hash"] = batch_digest(full)
    live_two = {SOURCES[0]: live[SOURCES[0]] + [{"Item name": "Book 2", "Product ID": "PID-2", "Status": STATUS, "Type": "Type"}], SOURCES[1]: []}
    validate_batch(list(reversed(full)), live_two)
    for damaged in (full[:1], [dict(full[0], **{"Item name": "Tampered"}), full[1]], [dict(full[0], **{"Scope version": "r2-hybrid-v3"}), full[1]]):
        try:
            validate_batch(damaged, live_two)
            raise AssertionError("damaged batch was accepted")
        except WorkerError:
            pass
    with tempfile.TemporaryDirectory() as temp:
        path = Path(temp) / "source.csv"
        write_snapshot_csv(path, parsed, SOURCES[0])
        assert read_csv_rows(path)[0]["Product ID"] == "PID-1"
        assert safe_run_dir(Path(temp), "R2B-1").parent == (Path(temp) / "runs").resolve()
        try:
            safe_run_dir(Path(temp), "../escape")
            raise AssertionError("unsafe batch ID was accepted")
        except WorkerError:
            pass
        with worker_lock(Path(temp) / "worker.lock"):
            assert (Path(temp) / "worker.lock").exists()
        state_dir = Path(temp) / "state"
        args = SimpleNamespace(state_dir=state_dir, project_root=Path(temp), spreadsheet_id="test", dry_run=True)
        pending = {"R2B-1": {"state": "PENDING_REPORT", "result_rows": [["must-not-write"]]}}
        before = json.loads(json.dumps(pending))
        with patch(__name__ + ".run_snapshot", return_value="Log: preview.csv"), patch(
            __name__ + ".append_results", side_effect=AssertionError("dry-run attempted a Sheet write")
        ):
            outcome = process_batch(object(), args, pending, "R2B-1", parsed, live)
        assert outcome == "PREVIEWED"
        assert pending == before
        preview = load_json(state_dir / "previews" / "R2B-1" / "preview.json")
        assert preview["state"] == "PREVIEWED" and preview["observed_ledger_state"] == "PENDING_REPORT"
        args.dry_run = False
        with patch(__name__ + ".append_results", side_effect=AssertionError("incomplete batch attempted a Sheet write")):
            try:
                process_batch(object(), args, pending, "R2B-1", full[:1], live_two)
                raise AssertionError("incomplete PENDING_REPORT batch was accepted")
            except WorkerError:
                pass
        assert pending == before

        old_state, new_state = Path(temp) / "old-state", Path(temp) / "new-state"
        atomic_json_write(old_state / "ledger.json", {"R2B-1": {"state": "READY"}})
        (old_state / "runs" / "R2B-1").mkdir(parents=True)
        (old_state / "runs" / "R2B-1" / "input.csv").write_text("x", encoding="utf-8")
        receipt = migrate_state(old_state, new_state)
        assert len(receipt["files"]) == 2 and load_json(new_state / "ledger.json") == load_json(old_state / "ledger.json")
        try:
            migrate_state(old_state, new_state)
            raise AssertionError("non-empty migration destination was accepted")
        except WorkerError:
            pass
    new_row = result_rows(parsed, "hash", Counter({"PID-1": 2}), "EXPORTED", "out")[0]
    updates, appends = plan_result_writes([RESULT_HEADERS], [new_row])
    assert not updates and appends == [new_row]
    old = new_row.copy(); old[7] = "FAILED"
    updates, appends = plan_result_writes([RESULT_HEADERS, old], [new_row])
    assert len(updates) == 1 and not appends
    print("r2-queue-worker self-test passed")


def main() -> int:
    parser = argparse.ArgumentParser(description="Process OWARIN Apps Script image jobs")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--migrate-state-from", type=Path, help="copy and verify legacy worker state; source is retained")
    parser.add_argument("--watch", action="store_true", help="poll continuously")
    parser.add_argument("--interval", type=int, default=60)
    parser.add_argument("--credentials", type=Path)
    parser.add_argument("--spreadsheet-id", default=SPREADSHEET_ID)
    parser.add_argument("--project-root", type=Path, default=Path(__file__).resolve().parents[1])
    default_state = Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir())) / "OWARIN" / "image-worker"
    parser.add_argument("--state-dir", type=Path, default=default_state)
    parser.add_argument("--dry-run", action="store_true", help="validate queue and map local images without copying")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.migrate_state_from:
        receipt = migrate_state(args.migrate_state_from, args.state_dir)
        print(f"Migrated {len(receipt['files'])} state file(s) to {receipt['destination']}; source retained")
        return 0
    legacy_state = Path(__file__).resolve().parent / "worker-state"
    if (legacy_state / "ledger.json").is_file() and not (args.state_dir / "ledger.json").is_file() and args.state_dir.resolve() != legacy_state.resolve():
        parser.error(f"Legacy ledger detected at {legacy_state}. Run with --state-dir that path or migrate it explicitly with --migrate-state-from.")
    if not args.credentials:
        parser.error("--credentials is required unless --self-test is used")
    if not args.credentials.is_file():
        parser.error(f"credential file not found: {args.credentials}")
    while True:
        code = run_once(args)
        if not args.watch:
            return code
        time.sleep(max(15, args.interval))


if __name__ == "__main__":
    raise SystemExit(main())
