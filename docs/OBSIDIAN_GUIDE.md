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

```bash
python -m agent.trace
```

That writes one note per registered model into `vault/models/` plus a demo run.
Re-run it whenever the registry changes so metrics stay in sync.

Then run some queries — each one writes `vault/runs/<run_id>.md`:

```bash
python -m agent.graph
```

### 3.3 Turn on the settings that matter

**Settings → Appearance → Theme:** dark reads better on a projector.

**Settings → Files & Links:**
- *New link format* → **Shortest path when possible**
- *Use [[Wikilinks]]* → **on** (this is what makes the graph work)
- *Detect all file extensions* → on, so `.json` sidecars are visible

**Settings → Core plugins** — enable:

| plugin | why |
|---|---|
| **Graph view** | the provenance picture — the whole point |
| **Backlinks** | "which runs used M5?" answered instantly |
| **Outgoing links** | navigate run → model → dataset |
| **Page preview** | hover a `[[M6-fusion]]` link to see its metrics |
| **Properties** | renders the YAML frontmatter as a clean table |

### 3.4 Make the graph readable

Open **Graph view** (the ⚛ icon, or `Ctrl+G`) → click the **settings gear** in
the top-right of the graph pane:

- **Groups** → *New group* three times, and set:

| search query | colour | what it highlights |
|---|---|---|
| `path:models` | blue | the seven models |
| `path:runs` | green | individual query runs |
| `tag:#satquery/aoi` | orange | geographic areas of interest |

- **Display** → turn **Arrows** on, set *Text fade threshold* fairly low so
  labels stay visible when you zoom out.
- **Forces** → raise *Repel* to about 15 and lower *Link force* to about 0.5, so
  clusters separate instead of collapsing into a hairball.

Now every model is a hub, and you can see at a glance which specialists carry
the most traffic.

---

## 4. What the notes look like

### A run note — `vault/runs/<id>.md`

```markdown
---
run_id: "20260907T132631Z-329a"
query: "What changed between these two dates?"
input_config: "bi-temporal-pair"
task: "change_vqa"
models_invoked: ["M5a", "M5b"]
confidence: 0.87
latency_ms: 1420
aoi: "[[AOI-Ahmedabad-23.02N-72.57E]]"
tags: ["satquery/run"]
---

# Run `20260907T132631Z-329a` — change_vqa

> What changed between these two dates?

## Answer
Built-up area increased. 1,204 px (3.2% of the scene) changed …

## Execution trace
| # | step | model | key parameters | ms | conf |
|---|---|---|---|---:|---:|
| 3 | M5a | [[M5a-change_map]] | `threshold=0.5, tile=256` | 1180 | 0.91 |
| 4 | M5b | [[M5b-change_vqa]] | `top_k=1` | 240 | 0.83 |

Related: [[M5a-change_map]] · [[M5b-change_vqa]] · [[AOI-Ahmedabad-23.02N-72.57E]]
```

The YAML block at the top is what Obsidian calls **Properties** — it renders as
a sortable table, and it is queryable.

### A model note — `vault/models/M6-fusion.md`

Auto-generated from the registry, carrying real measured metrics. Untrained
models say so explicitly rather than showing a placeholder number.

---

## 5. Three things to do once it is set up

### 5.1 Find every low-confidence run

Obsidian's built-in search (`Ctrl+Shift+F`):

```
path:runs "confidence: 0.6"
```

Better, install the **Dataview** community plugin
(Settings → Community plugins → Browse → "Dataview" → Install → Enable), then
put this in a new note:

````markdown
```dataview
TABLE task, models_invoked, confidence, latency_ms
FROM "runs"
WHERE confidence < 0.7
SORT confidence ASC
```
````

That is a live table of every run the system was unsure about — genuinely useful
for finding weak spots, and it looks impressive on screen.

### 5.2 Per-model traffic

````markdown
```dataview
TABLE length(rows) AS runs, round(average(rows.confidence),3) AS avg_conf
FROM "runs"
FLATTEN models_invoked AS model
GROUP BY model
```
````

### 5.3 Export a run as a PDF report

The PS asks for **downloadable reports**. Open any run note →
`Ctrl+P` → **Export to PDF**. The Markdown, tables and embedded evidence images
