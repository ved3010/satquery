"""
Execution trace -> auditable summary -> Obsidian vault note.

PS 26167 requires:

    "provide an auditable execution summary containing the selected task,
     model/tool names, and key parameters"
    "The controller may perform internal task planning; however, only the
     observable execution trace ... will be evaluated."

So the trace is a product surface, not a log file. Every step a node takes is
recorded here with the registry id, version, resolved parameters, latency and
confidence, and the whole thing is rendered three ways:

    to_dict()      -> JSON for the dashboard
    to_markdown()  -> a note in the Obsidian vault (wikilinked, graph-viewable)
    (markdown also renders to PDF for the "downloadable reports" deliverable)

The vault is just a folder of .md files. Obsidian only ever READS it -- it is a
viewer, never a runtime dependency. If Obsidian is not installed, everything
still works; you only lose the graph view.
"""
from __future__ import annotations

import json
import os
import re
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
VAULT = os.path.join(ROOT, "vault")

# Characters Windows forbids in filenames, plus the ones Obsidian treats
# specially inside wikilinks ([ ] | #  ^).
_UNSAFE = re.compile(r'[<>:"/\\|?*\[\]#^\x00-\x1f]')


def _slug(text: str, maxlen: int = 60) -> str:
    """Filesystem- and wikilink-safe fragment."""
    s = _UNSAFE.sub("", text).strip().replace(" ", "-")
    s = re.sub(r"-{2,}", "-", s)
    return s[:maxlen].strip("-.") or "untitled"


def _yaml_scalar(v: Any) -> str:
    """Quote a scalar for YAML frontmatter. Frontmatter is parsed by Obsidian,
    so an unescaped quote or colon in a user query would corrupt the note."""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return str(v)
