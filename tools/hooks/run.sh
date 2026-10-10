#!/bin/sh
# L0 wrapper: run the guard with the first working python (fail closed when none).
# usage: run.sh pre|meta|post|session|precommit
mode="$1"; shift
here="$(cd "$(dirname "$0")" && pwd)"
for py in python python3; do
  if "$py" -c "import sys; sys.exit(sys.version_info < (3, 8))" >/dev/null 2>&1; then
    case "$mode" in
      precommit) exec "$py" "$here/precommit.py" "$@" ;;
      *) exec "$py" "$here/l0_guard.py" "$mode" "$@" ;;
    esac
  fi
done
case "$mode" in
  pre|meta)
    printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"L0: no python 3.8+ found - guard cannot run, owner decides"}}'
    exit 0 ;;
  precommit)
    echo "L0: no python 3.8+ found - pre-commit guard cannot run (install python or fix PATH)" >&2
    exit 2 ;;
  *)
    echo "L0: no python 3.8+ found - hook skipped" >&2
    exit 0 ;;
esac
