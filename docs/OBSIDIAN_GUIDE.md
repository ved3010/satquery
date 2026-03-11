# Using Obsidian in SatQuery AI

A practical guide: what Obsidian does for this project, what it does *not*, how
to set it up in ten minutes, and how to demo it.

---

## 1. What this actually is (and what it is not)

**Obsidian is not part of the AI.** It cannot run, train, or serve a model. It is
a desktop app that reads a folder of Markdown files and draws the links between
them. Anyone who tells you they are "running models in Obsidian" is confused.

**What it is here:** a viewer over `satquery-core/vault/`, which the backend
writes to after every query.

```
Python backend  ──writes──▶  vault/*.md  ◀──reads──  Obsidian
   (required)                (plain text)            (optional viewer)
```

That arrow direction is the whole design. **Obsidian is never in the request
path.** If it is not installed, every query still works — you only lose the
picture. This matters: a demo must not depend on a GUI app being open.

---

## 2. Why bother — the PS requirement it satisfies

PS 26167 says, twice:

> "provide an **auditable execution summary** containing the selected task,
> model/tool names, and key parameters"

> "The controller may perform internal task planning; however, **only the
> observable execution trace** … will be evaluated."

So the trace is graded, and the reasoning behind it is not. Every other team
will satisfy this with a JSON blob in a collapsible panel.

Instead, every run writes a linked Markdown note. Because runs link to *model*
notes, *dataset* notes and *AOI* notes, **Obsidian's graph view renders the live
provenance network of the entire system** — every query ever run, every model
that touched it, every region analysed, as one navigable picture.

It costs about 150 lines of Python (already written, in `agent/trace.py`) and it
is the highest impact-to-effort item in the project.

---

## 3. Setup (10 minutes, free)

### 3.1 Install and open the vault

1. Download Obsidian from **https://obsidian.md** (free for personal use; the
   competition counts as personal use — no licence needed).
2. Install, then choose **"Open folder as vault"**.
3. Point it at:

```
D:\Study SY\SIH\satquery-core\vault
```

That's it. Obsidian indexes the folder and the notes appear.

### 3.2 Generate the notes

If the vault looks empty, populate it:

