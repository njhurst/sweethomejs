"""
TODO.md query tool — agent-aware.

Usage:
  python todo.py                      — list all items
  python todo.py 3                    — list items under 3
  python todo.py 3.2                  — list items under 3.2
  python todo.py done                 — list done items
  python todo.py wip                  — list in-progress items
  python todo.py todo                 — list pending items
  python todo.py claimed              — list claimed items (anonymous + identified)
  python todo.py claimed-by <id>      — list items claimed by agent <id>
  python todo.py agents               — list unique agent IDs found in claims
  python todo.py next                 — show next actionable items
  python todo.py register             — generate unique agent ID and register in AGENTS.md
  python todo.py register --json      — same, but output JSON for agent consumption
  python todo.py bootstrap [name]     — create TODO.md + AGENTS.md in current dir (safe: skips existing)
  python todo.py claim <num> <id>     — claim a task: [ ] → [@ id]
  python todo.py start <num>          — start working: [@ ...] → [.]
  python todo.py done <num>           — mark complete: [.] → [x]
  python todo.py drop <num>           — drop a task: [ ]/[.]/[@ ...] → [-]
"""

from __future__ import annotations

import datetime
import random
import re
import string
import sys
from collections import Counter
from pathlib import Path

TODO_PATH = Path(__file__).parent / "TODO.md"
AGENTS_PATH = Path(__file__).parent / "AGENTS.md"

# Captures: full bracket content, status char, optional agent-id, number, description
# Matches: [ ] 1.2  desc, [.] 3  desc, [@ njh] 4.1  desc, [@] 3  desc, etc.
TASK_RE = re.compile(
    r"^\s*\["           # opening bracket
    r"([^\]]*)"          # everything inside brackets (group 1)
    r"\]\s+"
    r"(\d+(?:\.\d+)*)"   # task number (group 2)
    r"\s{2}"             # exactly two spaces
    r"(.+)$"             # description (group 3)
)

STATUS_MAP = {
    " ": "todo",
    ".": "wip",
    "x": "done",
    "-": "dropped",
}


def _parse_bracket(bracket: str) -> tuple[str, str]:
    """Parse bracket content into (status, agent_id).

    bracket content → status, agent_id
      " "           → "todo",     ""
      "."           → "wip",      ""
      "x"           → "done",     ""
      "-"           → "dropped",  ""
      "@"           → "claimed",  ""
      "@ njh"       → "claimed",  "njh"
      "@njh"        → "claimed",  "njh"
    """
    bracket = bracket.strip()
    if not bracket:
        return "todo", ""

    status_char = bracket[0]
    status = STATUS_MAP.get(status_char)
    if status is not None:
        return status, ""

    # Must be @ (claimed) — possibly with agent-id
    if status_char == "@":
        rest = bracket[1:].strip()
        return "claimed", rest

    return "unknown", ""


def parse() -> list[dict]:
    """Parse TODO.md into a list of task dicts."""
    tasks: list[dict] = []
    if not TODO_PATH.exists():
        return tasks
    for line in TODO_PATH.read_text().splitlines():
        m = TASK_RE.match(line)
        if m:
            bracket = m.group(1)
            status, agent = _parse_bracket(bracket)
            tasks.append(
                {
                    "status": status,
                    "agent": agent,
                    "number": m.group(2),
                    "description": m.group(3),
                    "line": line,
                }
            )
    return tasks


def filter_under(tasks: list[dict], prefix: str) -> list[dict]:
    """Return tasks whose number starts with prefix."""
    return [
        t for t in tasks
        if t["number"] == prefix or t["number"].startswith(prefix + ".")
    ]


def filter_status(tasks: list[dict], status: str) -> list[dict]:
    return [t for t in tasks if t["status"] == status]


def filter_claimed_by(tasks: list[dict], agent: str) -> list[dict]:
    """Return tasks claimed by a specific agent."""
    return [t for t in tasks if t["status"] == "claimed" and t["agent"] == agent]


def list_agents(tasks: list[dict]) -> list[tuple[str, int]]:
    """Return (agent_id, count) for all agents found in claims, sorted by count desc."""
    agents = Counter(t["agent"] for t in tasks if t["status"] == "claimed" and t["agent"])
    return agents.most_common()


def show_next(tasks: list[dict]) -> list[dict]:
    """Show top-level tasks that are not done/dropped/claimed and have no done parent."""
    result = []
    for t in tasks:
        if t["status"] in ("done", "dropped", "claimed"):
            continue
        # Show top-level (single digit) tasks that are todo/wip
        if "." not in t["number"] and t["status"] in ("todo", "wip"):
            result.append(t)
        # Also show first-level subtasks of wip tasks
        parts = t["number"].split(".")
        if len(parts) == 2 and t["status"] == "todo":
            parent = parts[0]
            parent_wip = any(
                p["number"] == parent and p["status"] == "wip" for p in tasks
            )
            if parent_wip:
                result.append(t)
    return result


def _agent_note(agent: str) -> str:
    return f"  ← {agent}" if agent else ""


def _parse_agents() -> set[str]:
    """Parse AGENTS.md and return set of existing agent IDs found in backticks."""
    existing: set[str] = set()
    if not AGENTS_PATH.exists():
        return existing
    agent_re = re.compile(r"`([^`]+)`")
    for line in AGENTS_PATH.read_text().splitlines():
        m = agent_re.search(line)
        if m:
            existing.add(m.group(1))
    return existing


def _generate_agent_id(existing: set[str]) -> str:
    """Generate a unique agent ID: pi-XXXXXX (6 lowercase alphanumeric chars)."""
    chars = string.ascii_lowercase + string.digits
    while True:
        suffix = "".join(random.choices(chars, k=6))
        agent_id = f"pi-{suffix}"
        if agent_id not in existing:
            return agent_id


TODO_HEADER_TEMPLATE = '''# {project} TODO

> **→ START HERE: tell agents "read TODO.md header and follow the workflow."**
>
> **Workflow (do these in order):**
>
> 1. **Re-read this file** — another agent may have changed it.
> 2. **Pick an unclaimed task:** `[ ]` = available. `[.]` or `[@...]` = owned.
> 3. **Register your agent ID:** run `python todo.py register`. This generates a
>    unique `pi-XXXXXX` ID and adds you to AGENTS.md. Run it once per agent.
> 4. **Claim it:** `python todo.py claim <number> <your-id>`.
>    Tip: `[@]` (anonymous) works too if you edit manually, but discouraged.
> 5. **Start working:** `python todo.py start <number>`.
> 6. **When done:** `python todo.py done <number>`. Update AGENTS.md. Commit.
> 7. **Commit your work:** `git add -A && git commit -m "[N.N] description"`.
>    Reference the task number in the commit message. Pull before committing.
>    Commit after completing a task, adding tests, or reaching a stable point.
> 8. **Append new tasks** (never insert or reorder). Discovery → append.
> 9. **Make minimal single-task edits** — one status change per edit, one
>    task per commit (or batch small related changes).
>
> **Status legend:** `[ ]` todo &nbsp; `[.]` wip &nbsp; `[@ id]` claimed &nbsp; `[x]` done &nbsp; `[-]` dropped
>
> **Querying:** `python todo.py` (all), `todo.py next`, `todo.py claimed`,
> `todo.py claimed-by <id>`, `todo.py agents`, `todo.py <number>`.
>
> **Mutating:** `todo.py claim <n> <id>`, `todo.py start <n>`,
> `todo.py done <n>`, `todo.py drop <n>`. The tool validates state:
> you can't claim a claimed task, start unclaimed work, etc.
>
> **Numbering:** `major.minor.sub...` — subtask of `N` is `N.1`, `N.2`, etc.
> To find all items under `1.3`: grep for lines starting with `1.3.`
>
> **Format:** `[status] N[.N...]  Description` — exactly one space after `]`, two spaces before description.

---
'''

AGENTS_TEMPLATE = '''# Agent Registry

Registry of agents working on {project}. Agents register with
`python todo.py register`, which generates a unique `pi-XXXXXX` ID.
Use these IDs in TODO.md claim brackets (`[@ agent-id]`).

## Active

## Completed
'''


def bootstrap(project_name: str | None = None) -> None:
    """Create TODO.md and AGENTS.md in the current directory.

    Skips files that already exist (safe to run multiple times).
    """
    if project_name is None:
        project_name = Path.cwd().resolve().name

    created = []
    skipped = []

    if TODO_PATH.exists():
        skipped.append(str(TODO_PATH))
    else:
        TODO_PATH.write_text(TODO_HEADER_TEMPLATE.format(project=project_name))
        created.append(str(TODO_PATH))

    if AGENTS_PATH.exists():
        skipped.append(str(AGENTS_PATH))
    else:
        AGENTS_PATH.write_text(AGENTS_TEMPLATE.format(project=project_name))
        created.append(str(AGENTS_PATH))

    if created:
        print(f"Project: {project_name}")
        for path in created:
            print(f"  created  {path}")
        print("\nDone. Run `python todo.py register` to get your agent ID.")
    if skipped:
        for path in skipped:
            print(f"  skipped  {path} (already exists)")


def _die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def _get_task_bracket(number: str) -> str:
    """Get the current bracket content for a task by number."""
    if not TODO_PATH.exists():
        _die("TODO.md not found.")
    for line in TODO_PATH.read_text().splitlines():
        m = TASK_RE.match(line)
        if m and m.group(2) == number:
            return m.group(1)
    _die(f"task {number} not found in TODO.md.")


def _get_task_status(number: str) -> tuple[str, str]:
    """Get (status, agent) for a task by number."""
    bracket = _get_task_bracket(number)
    return _parse_bracket(bracket)


def _update_task(number: str, new_bracket: str) -> None:
    """Replace the bracket content of the task with the given number.

    Uses a regex anchored by the task number — edit-tool-safe, only touches
    the bracket on the matching line.
    """
    content = TODO_PATH.read_text()

    # Match: leading-whitespace [bracket] number<two-spaces>description
    pattern = re.compile(
        r"^(\s*)\[([^\]]*)\](\s+" + re.escape(number) + r"\s{2}.+)$",
        re.MULTILINE,
    )

    m = pattern.search(content)
    if not m:
        _die(f"task {number} not found in TODO.md.")

    new_line = f"{m.group(1)}[{new_bracket}]{m.group(3)}"
    new_content = content[: m.start()] + new_line + content[m.end() :]
    TODO_PATH.write_text(new_content)


def claim(number: str, agent_id: str) -> None:
    """Claim a task: [ ] → [@ agent_id]."""
    status, _ = _get_task_status(number)
    if status != "todo":
        _die(f"task {number} is '{status}', not 'todo' — can't claim it.")
    _update_task(number, f"@ {agent_id}")
    print(f"[{number}] claimed by @ {agent_id}")


def start(number: str) -> None:
    """Start working on a claimed task: [@ ...] → [.]."""
    status, agent = _get_task_status(number)
    if status != "claimed":
        _die(f"task {number} is '{status}', not 'claimed' — can't start it.")
    owner = f" (was @ {agent})" if agent else ""
    _update_task(number, ".")
    print(f"[{number}] in progress{owner}")


def done(number: str) -> None:
    """Mark a task complete: [.] → [x]."""
    status, _ = _get_task_status(number)
    if status != "wip":
        _die(f"task {number} is '{status}', not 'wip' — can't complete it.")
    _update_task(number, "x")
    print(f"[{number}] done")


def drop(number: str) -> None:
    """Drop a task: [ ] / [.] / [@ ...] → [-]."""
    status, _ = _get_task_status(number)
    if status not in ("todo", "claimed", "wip"):
        _die(f"task {number} is '{status}' — can only drop todo, claimed, or wip tasks.")
    _update_task(number, "-")
    print(f"[{number}] dropped")


def register_agent(json_mode: bool = False) -> str:
    """Generate a unique agent ID and add it to AGENTS.md under ## Active."""
    existing = _parse_agents()
    agent_id = _generate_agent_id(existing)

    if not AGENTS_PATH.exists():
        msg = "AGENTS.md not found. Create one first (see todo-workflow bootstrap)."
        if json_mode:
            print(f'{{"error": "{msg}"}}')
            sys.exit(1)
        print(f"ERROR: {msg}", file=sys.stderr)
        sys.exit(1)

    content = AGENTS_PATH.read_text()

    # Find ## Active and insert a new entry line right after it
    active_marker = "## Active\n"
    idx = content.find(active_marker)
    if idx == -1:
        msg = "AGENTS.md has no '## Active' section."
        if json_mode:
            print(f'{{"error": "{msg}"}}')
            sys.exit(1)
        print(f"ERROR: {msg}", file=sys.stderr)
        sys.exit(1)

    insert_pos = idx + len(active_marker)
    today = datetime.date.today().isoformat()
    new_line = f"`{agent_id}` — registered {today}\n"
    new_content = content[:insert_pos] + new_line + content[insert_pos:]
    AGENTS_PATH.write_text(new_content)

    # Also write a .pi-agent-id file so pi extensions can pick it up
    agent_id_path = Path(__file__).parent / ".pi-agent-id"
    import json as _json
    agent_id_path.write_text(_json.dumps({"agent_id": agent_id, "registered": today}) + "\n")

    if json_mode:
        import json
        print(json.dumps({"agent_id": agent_id, "registered": today}))
    else:
        print(f"Registered as: {agent_id}")
        print(f'Use [@ {agent_id}] to claim tasks in TODO.md')

    return agent_id


def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else ""

    if arg == "register":
        json_mode = "--json" in sys.argv
        register_agent(json_mode=json_mode)
        return

    if arg == "bootstrap":
        name = sys.argv[2] if len(sys.argv) > 2 else None
        bootstrap(name)
        return

    if arg == "claim":
        if len(sys.argv) < 4:
            _die("Usage: python todo.py claim <number> <agent-id>")
        claim(sys.argv[2], sys.argv[3])
        return

    if arg == "start":
        if len(sys.argv) < 3:
            _die("Usage: python todo.py start <number>")
        start(sys.argv[2])
        return

    if arg == "done":
        if len(sys.argv) < 3:
            _die("Usage: python todo.py done <number>")
        done(sys.argv[2])
        return

    if arg == "drop":
        if len(sys.argv) < 3:
            _die("Usage: python todo.py drop <number>")
        drop(sys.argv[2])
        return

    tasks = parse()
    if not tasks:
        print("No TODO.md found or it's empty.")
        return

    if arg in ("done", "wip", "todo", "dropped", "claimed"):
        filtered = filter_status(tasks, arg)
    elif arg == "next":
        filtered = show_next(tasks)
    elif arg == "agents":
        agents = list_agents(tasks)
        if not agents:
            print("No agent claims found.")
        else:
            for agent_id, count in agents:
                print(f"  {agent_id}  ({count} claimed)")
        return
    elif arg == "claimed-by":
        agent_id = sys.argv[2] if len(sys.argv) > 2 else ""
        if not agent_id:
            print("Usage: python todo.py claimed-by <agent-id>")
            return
        filtered = filter_claimed_by(tasks, agent_id)
    elif arg:
        filtered = filter_under(tasks, arg)
    else:
        filtered = tasks

    if not filtered:
        print(f"No items found for '{arg}'.")
        return

    for t in filtered:
        note = _agent_note(t["agent"])
        print(f"{t['line']}{note}")


if __name__ == "__main__":
    main()
