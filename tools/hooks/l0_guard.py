#!/usr/bin/env python3
"""L0 guard for Claude Code hooks (identical copy in ads-optimizer and owarin-store).

usage: l0_guard.py pre|meta|post|session|stop   (hook JSON on stdin)
pre/meta: stdout JSON permissionDecision ask|deny, exit 0; pass = no output.
stop: owner command block without `owner-only:` -> stdout JSON decision block (once; stop_hook_active passes).
post: syntax error -> stderr + exit 2. Fails closed: an internal error on pre/meta = ask.
"""
import ast
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))

META_READ = re.compile(
    r"^ads_(get_|insights_|account_get_|catalog_(get_|list_|event_source_get)|library_search$"
    r"|experiment_(list_tests|check_eligibility|abtest_get_test|lift_get_test)$|pixel_(event|parameter)_read$)")
META_TOOL = re.compile(r"^mcp__(.+?)__(ads_[A-Za-z0-9_]+)$")
TEMP_PATH = re.compile(r"(?i)(^|[\\/\"'])(tmp|temp)[\\/]|appdata[\\/]+local[\\/]+temp|\$env:temp|\$temp\b|%temp%|[\\/]scratchpad[\\/]")
DELETE_VERB = re.compile(r"^(rm|del|erase|rmdir|rd|remove-item|ri)$", re.I)
RECURSE_FLAG = re.compile(r"^-(r|recurse|[a-z]*r[a-z]*)$", re.I)
TOKEN = re.compile(r"\"[^\"]*\"|'[^']*'|\S+")


def load_config():
    try:
        with open(os.path.join(HERE, "l0_config.json"), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def decision(kind, rid, text):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse", "permissionDecision": kind,
        "permissionDecisionReason": f"L0 {rid}: {text}"}}))


def strip_q(tok):
    return tok[1:-1] if len(tok) >= 2 and tok[0] == tok[-1] and tok[0] in "\"'" else tok


def segments(cmd):
    """split on ; && || | newline outside quotes"""
    out, cur, q, i = [], [], None, 0
    while i < len(cmd):
        c = cmd[i]
        if q:
            if c == q:
                q = None
            cur.append(c)
        elif c in "\"'":
            q = c
            cur.append(c)
        elif c in (";", "|", "&", chr(10)):
            out.append("".join(cur))
            cur = []
            while i + 1 < len(cmd) and cmd[i + 1] in "|&":
                i += 1
        else:
            cur.append(c)
        i += 1
    out.append("".join(cur))
    return [x.strip() for x in out if x.strip()]


def tokens(seg):
    return TOKEN.findall(seg)


def is_temp(tok):
    return bool(TEMP_PATH.search(strip_q(tok)))


# ---------------------------------------------------------------- meta (item A)
def check_meta(data):
    m = META_TOOL.match(data.get("tool_name", ""))
    if m and not META_READ.match(m.group(2)):
        decision("ask", "R112", f"Meta write `{m.group(2)}` - owner must name the campaign/ad set/ad in chat")


# ---------------------------------------------------------------- pre (item C)
def check_pre(data):
    cmd = (data.get("tool_input") or {}).get("command") or ""
    cwd = data.get("cwd") or os.getcwd()
    cfg = load_config()
    if "L0_SELFTEST_ASK" in cmd:
        return decision("ask", "C6", "live wiring self-test token present - answer No")
    for seg in segments(cmd):
        toks = tokens(seg)
        if not toks:
            continue
        low = [strip_q(t).lower() for t in toks]
        # C4 R263 rclone sync of library/
        if "rclone" in low and "sync" in low and "library/" in seg.lower():
            return decision("deny", "R263", "rclone sync with library/ is forbidden - use `rclone copy`")
        # C5 commit without hooks
        if "git" in low and "commit" in low:
            rest = toks[low.index("commit") + 1:]
            skip = False
            for t in rest:
                if skip:
                    skip = False
                    continue
                if t in ("-m", "-F", "-C", "-c", "--message", "--file", "--author", "--date"):
                    skip = True
                    continue
                if t == "--no-verify" or re.fullmatch(r"-[a-zA-Z]*n[a-zA-Z]*", t):
                    return decision("deny", "C5", "git commit without hooks is forbidden - fix the finding, never skip the pre-commit")
        # C1 R215 build_deck overwrite
        if "build_deck.py" in seg:
            for i, t in enumerate(toks):
                if t in ("-o", "--out") and i + 1 < len(toks):
                    target = strip_q(toks[i + 1])
                    full = target if os.path.isabs(target) else os.path.join(cwd, target)
                    if os.path.exists(full):
                        return decision("ask", "R215", f"build_deck.py -o would overwrite an existing file ({os.path.basename(target)}) - check the [INTERNAL] file name first")
        # C2/C3 deletes
        verb_i = 0 if DELETE_VERB.match(low[0]) else (1 if low[0] == "xargs" and len(low) > 1 and DELETE_VERB.match(low[1]) else None)
        py_delete = re.search(r"shutil\.rmtree|os\.remove\(|os\.unlink\(|\.unlink\(|os\.rmdir\(", seg) and "python" in low[0]
        git_clean = low[0] == "git" and "clean" in low[1:3]
        if verb_i is not None or py_delete or git_clean:
            args = [] if verb_i is None else toks[verb_i + 1:]
            flags = [a for a in args if a.startswith("-") and not a.startswith("-%")]
            targets = [a for a in args if not a.startswith("-") and a not in ("/s", "/q", "/f")]
            recursive = any(RECURSE_FLAG.match(f) for f in flags) or any(a.lower() == "/s" for a in args)
            protected = [j.lower().replace("\\", "/") for j in cfg.get("junctions", [])] + ["owarin-data"]
            if recursive and any(p in strip_q(t).lower().replace("\\", "/") for t in targets for p in protected):
                return decision("deny", "R242", "recursive delete on a junction/OWARIN-DATA path - remove a junction with `cmd /c rmdir \"<name>\"` (no -Recurse)")
            if targets and not py_delete and not git_clean and all(is_temp(t) for t in targets):
                continue
            if py_delete and TEMP_PATH.search(seg):
                continue
            return decision("ask", "R051", "raw delete - move to `_archive\\` instead (dry-run first), or the owner says delete")
    return None


# ---------------------------------------------------------------- post (item D)
def syntax_error(path):
    """-> message or None"""
    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".py":
            with open(path, encoding="utf-8-sig") as f:
                ast.parse(f.read(), path)
        elif ext == ".json":
            with open(path, encoding="utf-8-sig") as f:
                json.loads(f.read())
        elif ext in (".js", ".cjs", ".mjs", ".gs"):
            node = shutil.which("node")
            if not node:
                return None
            target = path
            tmp = None
            if ext == ".gs":
                fd, tmp = tempfile.mkstemp(suffix=".js")
                os.close(fd)
                shutil.copyfile(path, tmp)
                target = tmp
            try:
                r = subprocess.run([node, "--check", target], capture_output=True, text=True, timeout=30)
            finally:
                if tmp:
                    os.unlink(tmp)
            if r.returncode:
                line = re.search(r":(\d+)", r.stderr)
                return f"{path}:{line.group(1) if line else '?'}"
        elif ext == ".ps1":
            ps = shutil.which("powershell")
            if not ps:
                return None
            script = ("$e=$null;$t=$null;[void][System.Management.Automation.Language.Parser]::ParseFile($env:L0_PATH,[ref]$t,[ref]$e);"
                      "if($e.Count){$e[0].Extent.StartLineNumber;exit 1}")
            r = subprocess.run([ps, "-NoProfile", "-NonInteractive", "-Command", script], capture_output=True, text=True, timeout=60,
                               env={**os.environ, "L0_PATH": path})
            if r.returncode:
                return f"{path}:{r.stdout.strip().splitlines()[0] if r.stdout.strip() else '?'}"
    except SyntaxError as e:
        return f"{path}:{e.lineno}"
    except ValueError as e:
        m = re.search(r"line (\d+)", str(e))
        return f"{path}:{m.group(1) if m else '?'}"
    return None


def check_post(data):
    path = (data.get("tool_input") or {}).get("file_path")
    if not path or not os.path.isfile(path):
        return 0
    err = syntax_error(path)
    if err:
        print(f"L0 R047: syntax error {err} - fix before anything else", file=sys.stderr)
        return 2
    return 0


# ---------------------------------------------------------------- session (item C5)
def check_session(data):
    root = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    if not os.path.isfile(os.path.join(root, ".githooks", "pre-commit")):
        return
    cur = subprocess.run(["git", "config", "core.hooksPath"], cwd=root, capture_output=True, text=True).stdout.strip()
    if not cur:
        subprocess.run(["git", "config", "core.hooksPath", ".githooks"], cwd=root)
        print("L0: core.hooksPath set to .githooks (pre-commit guard active)")


# ---------------------------------------------------------------- stop (D61: AI runs what its shell can)
CMD_FENCE = re.compile(r"```[ \t]*(powershell|pwsh|ps1|bash|sh|shell|cmd|bat|console)?[ \t]*\n(.*?)```", re.I | re.S)
CMD_START = re.compile(r"^\s*(cd|git|python3?|py|powershell|pwsh|npm|node|rclone|claude)\b", re.I | re.M)


def final_text(path):
    """text the assistant wrote after its last tool call / the last user message (= the reply the owner reads)."""
    texts = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            try:
                e = json.loads(line)
            except ValueError:
                continue
            msg = e.get("message") or {}
            content = msg.get("content")
            if e.get("type") == "user":
                texts = []
            elif e.get("type") == "assistant" and isinstance(content, list):
                for c in content:
                    if c.get("type") == "tool_use":
                        texts = []
                    elif c.get("type") == "text":
                        texts.append(c.get("text") or "")
    return "\n".join(texts)


def check_stop(data):
    if data.get("stop_hook_active"):
        return
    path = data.get("transcript_path")
    if not path or not os.path.isfile(path):
        return
    text = final_text(path)
    if "owner-only:" in text.lower():
        return
    for m in CMD_FENCE.finditer(text):
        if m.group(1) or CMD_START.search(m.group(2)):
            print(json.dumps({"decision": "block", "reason": (
                "L0 D61: your reply hands the owner a command block. Run it yourself with your shell/terminal tools now, "
                "then report the result. Only if it truly needs the owner (account login/clicks, a decision, or a tool denial) "
                "keep it and add a line `owner-only: <why the AI cannot run it>` next to it.")}))
            return


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    raw = sys.stdin.read()
    data = json.loads(raw) if raw.strip() else {}
    if mode == "meta":
        check_meta(data)
    elif mode == "pre":
        check_pre(data)
    elif mode == "post":
        return check_post(data)
    elif mode == "session":
        check_session(data)
    elif mode == "stop":
        check_stop(data)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception as e:  # fail closed
        m = sys.argv[1] if len(sys.argv) > 1 else ""
        if m in ("pre", "meta"):
            decision("ask", "guard", f"l0_guard error: {type(e).__name__}")
            sys.exit(0)
        print(f"l0_guard error: {type(e).__name__}", file=sys.stderr)
        sys.exit(0)
