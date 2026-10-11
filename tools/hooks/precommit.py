#!/usr/bin/env python3
"""L0 git pre-commit (identical copy in ads-optimizer and owarin-store; repo differences in l0_config.json).

Scans STAGED content only. One line per FAIL: `L0 B<n> <id>: <path>[:line] - <fix>`; exit 1 on any FAIL.
Checks B1-B9 (see PLAN_2026-10-11_rules-phase1-L0.md). Escape for B1: line carries `[no-client-figure]`.
"""
import ast
import fnmatch
import json
import os
import re
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ESCAPE = "[no-client-figure]"
NL = chr(10)


def git(*args, check=False):
    r = subprocess.run(["git", "-c", "core.quotepath=off", *args], capture_output=True)
    if check and r.returncode:
        raise RuntimeError(r.stderr.decode("utf-8", "replace"))
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else None


def blob(ref, path):
    """text of path at ref (':' = index, 'HEAD' ...) or None"""
    r = subprocess.run(["git", "show", f"{ref}:{path}" if ref != ":" else f":{path}"], capture_output=True)
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else None


def blob_size(ref, path):
    r = subprocess.run(["git", "cat-file", "-s", f"{ref}:{path}" if ref != ":" else f":{path}"], capture_output=True)
    return int(r.stdout.strip()) if r.returncode == 0 else None


def names(filt):
    out = git("diff", "--cached", "--name-only", "-z", "--no-renames", f"--diff-filter={filt}") or ""
    return [p for p in out.split("\0") if p]


def added_lines():
    """{path: [(lineno, text)]} of added lines in the staged diff (CR-at-eol changes ignored)"""
    out = git("diff", "--cached", "-U0", "--no-color", "--no-renames", "--ignore-cr-at-eol") or ""
    res, path, ln = {}, None, 0
    for line in out.split("\n"):
        if line.startswith("+++ "):
            p = line[4:].rstrip("\t")
            path = None if p == "/dev/null" else p[2:] if p.startswith("b/") else p
            if path:
                res.setdefault(path, [])
        elif line.startswith("@@"):
            m = re.search(r"\+(\d+)", line)
            ln = int(m.group(1)) if m else 0
        elif line.startswith("+") and not line.startswith("+++") and path:
            res[path].append((ln, line[1:].rstrip("\r")))
            ln += 1
    return res


# ------------------------------------------------------------------ rule data
B1_PATHS = [r"(^|/)HANDOFF_[^/]*\.md$", r"(^|/)PLAN_[^/]*\.md$", r"(^|/)ESCALATION_[^/]*\.md$", r"^prompts/", r"^_intake/",
            r"(^|/)_logs/", r"^clients/[^/]+/STATE\.md$", r"^clients/[^/]+/.*STATUS\.md$"]
METRIC = r"(?:spend|sales|gmv|revenue|roas|orders?|aov|cpa|cpc|cpm|ctr|budget|ยอดขาย|ค่าโฆษณา|ออเดอร์|งบ)"
B1_RE = re.compile(r"฿\s*\d|\d[\d,.]*\s*(?:บาท|THB|baht)\b|(?<![A-Za-z])" + METRIC + r"(?![A-Za-z])[^\n\d]{0,12}\d", re.I)
SECRETS = [("openai", r"\bsk-[A-Za-z0-9_-]{20,}", 0), ("anthropic", r"\bsk-ant-", 0), ("github", r"\bghp_[A-Za-z0-9]{20,}|\bgithub_pat_", 0),
           ("aws", r"\bAKIA[0-9A-Z]{16}", 0), ("google-api", r"\bAIza[0-9A-Za-z_-]{30,}", 0),
           ("private-key", r"-----BEGIN [A-Z ]*PRIVATE KEY|\"private_key\"\s*:", 0), ("slack", r"\bxox[abp]-", 0),
           ("meta", r"\bEAA[A-Za-z0-9]{30,}", 0),
           ("keyword", r"(token|api[_-]?key|secret|password|access[_-]?key)[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9_\-+/]{24,}", re.I)]
SECRETS = [(n, re.compile(p, f)) for n, p, f in SECRETS]
SECRET_NAME = re.compile(r"^\.env(\..+)?$|credential|\.key$|\.pem$|token|secret", re.I)
CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def b1(cfg, adds, new):
    out, esc = [], 0
    for p, lines in adds.items():
        if not any(re.search(r, p) for r in B1_PATHS):
            continue
        for ln, t in lines:
            if B1_RE.search(t):
                if ESCAPE in t:
                    esc += 1
                else:
                    out.append(f"L0 B1 R055: {p}:{ln} - client figure in a repo file; remove it (or mark a rule threshold with {ESCAPE})")
    if esc:
        print(f"L0 B1: {esc} line(s) carry {ESCAPE}")
    return out


def b2(cfg, adds, new):
    out = []
    for p in new:
        if subprocess.run(["git", "check-ignore", "--no-index", "-q", "--", p]).returncode == 0:
            out.append(f"L0 B2 R101: {p} - ignored path force-added (client data stays on the PC); run `git rm --cached` on it")
    return out


def b3(cfg, adds, new):
    return [f"L0 B3 R104: {p} - fetch_meta*.py is withdrawn; use the Meta connector flow (HOWTO_FETCH)" for p in new
            if re.search(r"(^|/)fetch_meta[^/]*\.py$", p)]


def b4(cfg, adds, new):
    out = []
    for p in new:
        if SECRET_NAME.search(os.path.basename(p)):
            out.append(f"L0 B4 R244: {p} - secret-like file name; keep it outside the repo")
    for p, lines in adds.items():
        for ln, t in lines:
            for n, rx in SECRETS:
                if rx.search(t):
                    out.append(f"L0 B4 R244: {p}:{ln} - secret value ({n}); remove it and keep it in OWARIN-secrets")
                    break
    return out


def b5(cfg, adds, new):
    out = []
    for p, lines in adds.items():
        for ln, t in lines:
            if CONTROL.search(t):
                out.append(f"L0 B5 R270: {p}:{ln} - control character in text; delete the character")
    return out


def _lines(t):
    return len(t.split("\n")) - (1 if t.endswith("\n") else 0) if t else 0


def _range(lines, start, end):
    """awk '/^start /,/^end /' then drop the last line (the end marker)"""
    got, on = [], False
    for line in lines:
        if line.startswith(start):
            on = True
        if on:
            got.append(line)
            if line.startswith(end):
                return "".join(x + NL for x in got[:-1])
    return "".join(x + NL for x in got[:-1])


def readfirst(ref, client):
    """bytes of the read-first set (port of the gate command in PLAN_2026-10-07_D42.md)"""
    core = blob(ref, "rules/CORE.md") or ""
    a = blob(ref, "AGENTS.md") or ""
    ca = blob(ref, f"clients/{client}/AGENTS.md") or ""
    cs = blob(ref, f"clients/{client}/STATE.md") or ""
    hb = (blob(ref, "HANDBOOK_SYSTEM-V2.md") or "").split(NL)
    listing = git("ls-files", "HANDOFF_*.md") if ref == ":" else git("ls-tree", "--name-only", ref)
    hand = sorted(f for f in (listing or "").split(NL) if re.fullmatch(r"HANDOFF_[^/]*\.md", f))
    hd = (blob(ref, hand[-1]) if hand else "") or ""
    last = ""
    for line in hd.split(NL):
        last = "" if line.startswith("## ") else last
        last += line + NL
    h0 = NL.join(hb[:5]) + NL
    return sum(len(x.encode("utf-8")) for x in (core, a, ca, cs, h0, _range(hb, "## 0 ", "## 2 "), _range(hb, "## 4 ", "## 5 "), last))


def b6(cfg, adds, new):
    out = []
    staged = names("ACMR")
    rules = [(r"^clients/[^/]+/STATE\.md$", 3072), (r"^_specs/00_RULES-OVERVIEW\.md$", 4096)]
    for p in staged:
        for rx, lim in rules:
            if re.search(rx, p):
                now, old = blob_size(":", p), blob_size("HEAD", p)
                if now is not None and now > lim and (old is None or now > old):
                    out.append(f"L0 B6 size: {p} - {now} B > {lim} B limit" + (f" and bigger than HEAD ({old} B)" if old else "") + "; shrink it")
        if re.fullmatch(r"HANDOFF_[^/]*\.md", p):
            now, old = blob(":", p) or "", blob("HEAD", p)
            if old is None:
                if len(now.encode("utf-8")) > 3072:
                    out.append(f"L0 B6 size: {p} - new handoff {len(now.encode('utf-8'))} B > 3072 B; cut it")
            elif _lines(now) - _lines(old) > 6:
                out.append(f"L0 B6 size: {p} - grows by {_lines(now) - _lines(old)} lines (max 6 per commit); cut it")
    inputs = ("AGENTS.md", "rules/CORE.md", "HANDBOOK_SYSTEM-V2.md")
    if any(p in inputs or re.fullmatch(r"HANDOFF_[^/]*\.md", p) or re.fullmatch(r"clients/[^/]+/(AGENTS|STATE)\.md", p) for p in staged):
        clients = sorted({m.group(1) for f in (git("ls-files", "clients/*/STATE.md") or "").split("\n") for m in [re.match(r"clients/([^/]+)/STATE\.md$", f)] if m})
        for c in clients:
            now, old = readfirst(":", c), readfirst("HEAD", c)
            if now > 18432 and now > old:
                out.append(f"L0 B6 size: read-first total {now} B > 18432 B ({c}) and bigger than HEAD ({old} B); shrink AGENTS/STATE/HANDOFF")
    return out


def b7(cfg, adds, new):
    out = []
    readme = blob(":", "skills/README.md")
    if not readme:
        return out
    table = {}
    for line in readme.split("\n"):
        m = re.match(r"^>\s*\|\s*(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2} · D\d+)\s*\|\s*$", line)
        if m:
            for f in re.findall(r"`([^`]+)`", m.group(1)):
                table[f if f.endswith((".md", ".ps1")) else f + "/SKILL.md"] = m.group(2)
            if "HANDBOOK" in m.group(1):
                table["HANDBOOK_SYSTEM-V2.md"] = m.group(2)
    for p, label in table.items():
        if p not in adds and p not in names("ACMR"):
            continue
        touched = any("Rules version" in t or label in t for _, t in adds.get(p, []))
        if not touched:
            continue
        text = blob(":", p) or ""
        if text.count("Rules version") != 1 or label not in text:
            out.append(f"L0 B7 R116: {p} - must carry `Rules version` exactly once with label {label} ({text.count('Rules version')} found)")
    return out


def b8(cfg, adds, new):
    out = []
    node = None
    for p in names("ACM"):
        ext = os.path.splitext(p)[1].lower()
        if ext not in (".py", ".json", ".js", ".cjs", ".mjs"):
            continue
        text = blob(":", p)
        if text is None:
            continue
        try:
            if ext == ".py":
                ast.parse(text.lstrip("﻿"), p)
            elif ext == ".json":
                json.loads(text.lstrip("﻿"))
            else:
                import shutil
                node = node or shutil.which("node")
                if not node:
                    print(f"L0 B8: node missing, {p} not checked")
                    continue
                fd, tmp = tempfile.mkstemp(suffix=ext)
                with os.fdopen(fd, "w", encoding="utf-8", newline="") as f:
                    f.write(text)
                r = subprocess.run([node, "--check", tmp], capture_output=True, text=True)
                os.unlink(tmp)
                if r.returncode:
                    out.append(f"L0 B8 R047: {p} - syntax error; fix before commit")
        except SyntaxError as e:
            out.append(f"L0 B8 R047: {p}:{e.lineno} - syntax error; fix before commit")
        except ValueError as e:
            m = re.search(r"line (\d+)", str(e))
            out.append(f"L0 B8 R047: {p}:{m.group(1) if m else '?'} - invalid JSON; fix before commit")
    return out


def b9(cfg, adds, new):
    pj = ".claude-plugin/plugin.json"
    head = blob("HEAD", pj)
    if head is None:
        return []
    if not any(re.match(r"skills/[^/]+/.", p) for p in names("ACMRD")):
        return []

    def ver(text):
        try:
            return json.loads((text or "").lstrip("﻿")).get("version")
        except ValueError:
            return None

    if ver(blob(":", pj)) == ver(head):
        return [f'L0 B9 D64: skills changed - bump "version" in {pj}']
    return []


CHECKS = {"B1": b1, "B2": b2, "B3": b3, "B4": b4, "B5": b5, "B6": b6, "B7": b7, "B8": b8, "B9": b9}


def main():
    t0 = time.time()
    try:
        with open(os.path.join(HERE, "l0_config.json"), encoding="utf-8") as f:
            cfg = json.load(f)
    except Exception:
        cfg = {}
    enabled = cfg.get("precommit_checks", list(CHECKS))
    adds, new = added_lines(), names("A")
    fails = []
    for k in sorted(CHECKS):
        if k in enabled:
            fails += CHECKS[k](cfg, adds, new)
    for f in fails:
        print(f, file=sys.stderr)
    if os.environ.get("L0_TIMING"):
        print(f"L0 precommit: {time.time() - t0:.2f}s", file=sys.stderr)
    return 1 if fails else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception as e:  # fail closed
        print(f"L0 precommit error: {type(e).__name__}: {e} - commit blocked", file=sys.stderr)
        sys.exit(2)
