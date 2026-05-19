# VSDX Extraction Guide

Reference for parsing Visio .vsdx files in the vocalls-brief skill.

## Contents

- [What is a VSDX file?](#what-is-a-vsdx-file)
- [Character property tags](#character-property-tags-cp-pp-tp)
- [Archive extraction](#archive-extraction)
- [Page discovery](#page-discovery)
- [Parsing shapes and connectors](#parsing-shapes-and-connectors)
- [Case ID patterns](#case-id-patterns)
- [Mapping shapes to brief fields](#mapping-shapes-to-brief-fields)
- [Confidence rules](#confidence-rules)
- [Lucidchart exports vs native Visio](#lucidchart-exports-vs-native-visio)
- [Common Visio patterns for IVR diagrams](#common-visio-patterns-for-ivr-diagrams)

---

## What is a VSDX file?

A `.vsdx` file is a renamed ZIP archive. Its relevant contents:

```
visio/
  pages/
    pages.xml          ← page manifest (Lucidchart exports)
    page1.xml          ← first diagram page
    page2.xml          ← second diagram page (if multi-page)
docProps/
[Content_Types].xml
```

Each `pageN.xml` file contains one diagram's full shape and connector graph.

Note: `visio/pages/_rels/pages.xml.rels` is present in native Visio files but **absent in Lucidchart exports**. Do not rely on it.

---

## Character property tags: `<cp/>`, `<pp/>`, `<tp/>`

Lucidchart-exported VSDX files contain character-property (`<cp/>`), paragraph-property
(`<pp/>`), and text-property (`<tp/>`) elements interspersed in all `<Text>` nodes.

Example from a real Lucidchart export:

```xml
<Text>CASE_<cp IX='1'/>2</Text>
<Text>ac<cp IX='1'/>tion <cp IX='2'/>send_email_inform_customer</Text>
<Text><cp IX='0'/><pp IX='0'/>opening<cp IX='1'/>: What is the question</Text>
```

Results after correct extraction: `"CASE_2"`, `"action send_email_inform_customer"`, `"opening: What is the question"`.

**Never use regex to strip these.** Use `element.itertext()` (Python) which yields all
text nodes recursively, automatically skipping child element tags:

```python
def get_text(element):
    text_el = element.find(f'{{{ns}}}Text')
    if text_el is None:
        return ''
    return ''.join(text_el.itertext()).strip()
```

Native Visio exports may not contain these tags — do not assume their absence.

---

## Archive extraction

VSDX is a ZIP archive. PowerShell's `Expand-Archive` rejects the `.vsdx` extension.
Use one of these approaches in order of preference:

### Option A: Python (used by `scripts/vsdx-extract.py` — preferred)

```python
import zipfile, shutil
shutil.rmtree(tmp_dir, ignore_errors=True)
with zipfile.ZipFile('file.vsdx', 'r') as z:
    z.extractall(tmp_dir)
```

No shell dependency. Works on all platforms. Always validate member paths to prevent zip path traversal.

### Option B: `unzip` (bash / git-bash / WSL)

```bash
unzip -q file.vsdx -d tmp_dir
```

### Option C: PowerShell rename trick

```powershell
Copy-Item file.vsdx file.zip -Force
Expand-Archive -Path file.zip -DestinationPath tmp_dir -Force
Remove-Item file.zip
```

Always clean up the `.zip` copy. Never pass `.vsdx` directly to `Expand-Archive`.

---

## Page discovery

1. Check `visio/pages/pages.xml` — present in Lucidchart exports (no `_rels/` subfolder).
   Parse `<Page>` elements to get page file names.

2. Fallback: glob `visio/pages/page*.xml`.
   Sort by filename for consistent page order.

The path `visio/pages/_rels/pages.xml.rels` does **NOT** exist in Lucidchart exports.
Do not use it as the primary discovery method.

---

## Parsing shapes and connectors

### Content shapes (diagram nodes)

```xml
<Shape ID="1" Name="Process" ...>
  <Text>Case 1&#xa;billing inquiry</Text>
</Shape>
```

A content shape is any `<Shape>` that has a `<Text>` child and is NOT referenced as the `FromSheet` in any `<Connect>` element.

Extract: `ID` (string), `Name` (shape type hint), text content via `itertext()` (see above).
Strip actual newline characters (U+000A / `&#xa;`), carriage returns, and excess whitespace.

### Connectors (directed edges)

In Visio XML, a connector is represented as two elements together:

1. A `<Shape>` element for the connector itself (has its own `ID`, may have a `<Text>` child = the edge label)
2. One or two `<Connect>` elements that attach the connector to source/target shapes:

```xml
<Shape ID="10" Name="Dynamic connector">
  <Text>billing condition</Text>
</Shape>
...
<Connect FromSheet="10" ToSheet="1" FromCell="BeginX"/>
<Connect FromSheet="10" ToSheet="2" FromCell="EndX"/>
```

Here shape ID `10` is the connector. `FromCell="BeginX"` marks the tail (source), `FromCell="EndX"` marks the head (target). The directed edge is: shape `1` → shape `2`, with label `"billing condition"`.

To extract edges:

1. Collect all `<Connect>` elements
2. Group them by `FromSheet` (the connector shape ID)
3. For each group: `BeginX` connect → source node ID, `EndX` connect → target node ID
4. Look up the connector shape's `<Text>` content for the edge label
5. **Exclude connector shapes from the node list** — a shape is a connector if its `ID` appears as `FromSheet` in any `<Connect>` element

---

## Case ID patterns

Recognize all of these formats:

| Pattern | Example | Confidence |
|---|---|---|
| `CASE_N` | `CASE_1`, `CASE_4` | high |
| `CASE_N.M` | `CASE_3.1`, `CASE_3.5` | high |
| `Case N` | `Case 1` | high |
| `Case N.M` | `Case 3.1` | high |
| Bare integer | `1`, `12` | medium |

Regex: `^(?:CASE_|Case\s*)(\d+(?:\.\d+)?)$`

Bare integers are case nodes only if they appear at a routing decision point
(connected to 2+ outgoing edges) or directly connected to shapes with objective/opening text.

---

## Mapping shapes to brief fields

| Shape label pattern | Maps to |
|---|---|
| `CASE_N`, `CASE_N.M`, or `Case N` (at decision/entry node) | `cases[].caseNumber = N` |
| Shape connected FROM a case node with label | `cases[N].scenarioName` |
| Shape labeled with an action verb + noun | candidate `tools[].name` (snake_case) |
| Connector label text | transition condition for `cases[N].refinementConditions` |
| Terminal shapes (no outgoing connectors) | likely end states: `end_conversation`, `transfer_to_agent` |
| Diamond / decision shapes | routing branch point — map conditions to `Refinement` |

---

## Confidence rules

| Situation | Confidence |
|---|---|
| Shape text exactly matches `CASE_N` or `CASE_N.M` pattern | high |
| Scenario name extracted from shape directly connected to case node | high |
| Opening line extracted from shape text near case node | medium |
| Tool name inferred from connector label or action shape | medium |
| Any field inferred from spatial proximity only | low |

---

## Lucidchart exports vs native Visio

| Aspect | Native Visio | Lucidchart export |
|---|---|---|
| Shape text density | Short labels (1–3 words) | Full objective text, entity lists, cdbLog IDs |
| `<cp/>` tags | Rare | Present in all text nodes |
| `_rels/` subfolder | Present | Absent |
| Case ID format | Varies | Typically `CASE_N` or `CASE_N.M` |
| Confidence possible | medium for most fields | high for objective, tools, entities |

For Lucidchart exports: objective content, entity definitions, tool names, and cdbLog IDs
can typically be extracted at high confidence directly from shape text, without requiring
Q&A in Phase 2. The semantic classifier in `scripts/vsdx-extract.py` identifies these
automatically.

---

## Lucidchart JSON exports

Lucidchart can export diagrams as `.json` files. These are structurally different from VSDX
and do not require ZIP extraction or XML parsing.

### JSON file structure

```json
{
  "pages": [
    {
      "id": "page-id",
      "title": "Page 1",
      "shapes": [ ... ],
      "lines": [ ... ]
    }
  ]
}
```

Each page has a `shapes` array (nodes) and a `lines` array (connectors).

### Shape object

```json
{
  "id": "shape-123",
  "type": "DefaultSquareBlock",
  "value": "CASE_3 — New Direct Debit",
  "style": { ... }
}
```

Extract text from the `value` field directly. No `<cp/>` handling needed.

### Connector object

```json
{
  "id": "line-456",
  "source": "shape-123",
  "target": "shape-789",
  "value": "bankCaseNumber = 1"
}
```

`source` and `target` are shape IDs. `value` is the edge label (branch condition).

### Shape type → brief field mapping

| Lucidchart type | Role in diagram | Maps to |
|---|---|---|
| `DefaultSquareBlock` | Process / action step | Case node, tool action, scenario label |
| `DecisionBlock` | Routing branch (diamond) | Refinement condition |
| `TerminatorBlock` | Terminal state (rounded rect) | exit action: `end_conversation`, `transfer_to_agent` |
| `ProcessBlock` | Speech / SAY node | Opening line candidate |
| `AgentAgenticBlock` | Agent tool invocation | `tools[].name` (high confidence) |
| `AiModelAgenticBlock` | AI decision node | Routing condition candidate |
| `RectangleContainerBlock` | Swimlane / group container | Context label only — do not map to brief fields |
| `PresentationFrameBlock` | Documentation frame / legend | Metadata / annotation — check for test accounts |
| `AutoGrowTextBlock` | Freeform note | Annotation — low confidence for extraction |

### Extraction approach

1. For each page: iterate `shapes` array
2. Skip `RectangleContainerBlock` and `PresentationFrameBlock` as primary content (use as context hints)
3. Apply case ID regex to `value` of every `DefaultSquareBlock`
4. Mark `AgentAgenticBlock` shapes as tool name candidates (snake_case the value)
5. For `TerminatorBlock`: classify `value` as exit type (`end_conversation`, `transfer_to_agent`, etc.)
6. For `lines`: group by source shape; use `value` as branch condition text for Refinement extraction
7. Confidence rules are the same as VSDX (see [Confidence rules](#confidence-rules) above)

### Key differences from VSDX

| Aspect | VSDX | Lucidchart JSON |
|---|---|---|
| Extraction method | ZIP + XML parse | Direct JSON parse |
| Text access | `element.itertext()` (handles `<cp/>`) | `shape["value"]` string field |
| Connector model | `<Connect FromSheet>` elements | `lines[].source` / `lines[].target` IDs |
| Shape types | Visio `Name` attribute | Lucidchart `type` string |
| Page discovery | `visio/pages/pages.xml` | `pages[]` array in root |
| `<cp/>` tags | Present in all text nodes | Not present |

---

## Common Visio patterns for IVR diagrams

- **Swimlanes**: Each swim lane is a container shape. Treat swimlane labels as context hints (e.g. "Agent flow", "Customer flow") — do not map swimlane names directly to brief fields.
- **Decision diamonds**: Usually have 2+ outgoing connectors labeled with branch conditions (e.g. "yes/no", "identified/unknown").
- **Process rectangles**: Main action shapes — typically hold scenario or case labels.
- **Rounded rectangles / ovals**: Often terminal states (transfer, end call).
- **Connector text**: Often the trigger condition or variable match expression.
