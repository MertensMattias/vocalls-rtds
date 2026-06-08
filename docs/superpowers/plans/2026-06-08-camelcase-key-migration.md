# camelCase Key Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge the RTDS import/export JSON contract on end-to-end camelCase — every envelope key, Param name, and operation `Type` value (keeping the `_vocalls` suffix) — using a deterministic codemod for data and guided hand-edits for code and docs.

**Architecture:** A single Python codemod (`scripts/camelcase_keys.py`) implements one `camel_case_key()` function with the "lower leading acronym run" rule and a keys-only JSON walker. Its first run prints a full mapping table that is the **review gate** and the shared contract with the SQL team (who own the importer + dictionary). After the gate, the codemod rewrites the data JSON; code literals and docs are hand-edited to match; the skill bundle and catalog are regenerated; `npm run check` + `npm test` are the verification gate.

**Tech Stack:** Python 3 (stdlib only — matches `scripts/`), Node/Jest (existing test suite), JSON, mxGraph XML (HTML-entity-encoded JS-in-XML), T-SQL (sample payload only).

**Spec:** [docs/superpowers/specs/2026-06-08-camelcase-key-migration-design.md](../specs/2026-06-08-camelcase-key-migration-design.md)

---

## File Structure

**Created:**
- `scripts/camelcase_keys.py` — the codemod: `camel_case_key()` + `camel_case_type()` + a keys-only recursive JSON rewriter + a `--dry-run --print-mapping` mode. Single responsibility: transform JSON object keys.
- `scripts/test_camelcase_keys.py` — unit tests for the transform rule (the golden examples from the spec).
- `docs/superpowers/plans/camelcase-mapping-table.md` — the generated mapping table, committed as the shared contract artifact (produced by the codemod, pasted/redirected here).

**Modified (Tier A — data):**
- `callflow_json_config_vocalls/DIGIPOLIS_DA_KLANTWACHT_GUARD_PRD.json` and 7 siblings (8 total)
- ~~`rtds/samples/DA-HELPDESK.json`~~ — **EXCLUDED** (legacy pre-migration PureConnect schema; the mapping-table gate revealed it produces dictionary-incompatible keys `scheduleID`/`sendSMS`. Migrated later with the helpdesk-flow port.)
- `rtds/db_seed/insert_flow_on_sourceId.sql` — only the embedded `@JsonPayload` sample literal

**Modified (Tier B — code literals):**
- `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js`
- `rtds/components/{sendSms,sendMail,setVariables,guardTui,guardRouting,checkSchedule}.js`
- `cli/simulate-flow.js`

**Modified (Tier C — docs/specs):**
- `conventions/casing.md`, `PROJECT_CONVENTIONS.md`
- `rtds/specs/*.spec.md` (7), `rtds/docs/{runtime-spec,operations-catalog,runtime-architecture,logging-design}.md`
- `rtds/api_swagger/routingtable_rtds_swagger.json` (request-body schemas)
- `projects/rtds-runtime/tests/*` as needed

**Regenerated (never hand-edited):**
- `rtds/docs/operations-catalog.md` (`npm run gen:catalog`)
- `.claude/skills/rtds-vocalls-component-gen/**` (`npm run build:skill`)

---

## Task 1: The transform function + its tests

**Files:**
- Create: `scripts/camelcase_keys.py`
- Test: `scripts/test_camelcase_keys.py`

- [ ] **Step 1: Write the failing tests** (the golden examples from the spec)

Create `scripts/test_camelcase_keys.py`:

```python
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "camelcase_keys", Path(__file__).with_name("camelcase_keys.py")
)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def test_simple_pascal():
    assert m.camel_case_key("SourceId") == "sourceId"
    assert m.camel_case_key("Operations") == "operations"
    assert m.camel_case_key("Params") == "params"
    assert m.camel_case_key("IsFirstOperation") == "isFirstOperation"


def test_underscore_first_segment_only():
    assert m.camel_case_key("NextStep_Success") == "nextStep_Success"
    assert m.camel_case_key("NextStep_Guard_ICT") == "nextStep_Guard_ICT"
    assert m.camel_case_key("PromptActivate_NL") == "promptActivate_NL"


def test_leading_acronym_run():
    assert m.camel_case_key("IVREvent") == "ivrEvent"
    assert m.camel_case_key("IVRAction") == "ivrAction"
    assert m.camel_case_key("CC") == "cc"
    assert m.camel_case_key("ANIConfirmation") == "aniConfirmation"


def test_internal_and_trailing_acronym_untouched():
    assert m.camel_case_key("SmsAccountId") == "smsAccountId"
    assert m.camel_case_key("OutboundANI") == "outboundANI"


def test_already_camel_is_idempotent():
    assert m.camel_case_key("sourceId") == "sourceId"
    assert m.camel_case_key("nextStep_Success") == "nextStep_Success"


def test_type_keeps_vocalls_suffix():
    assert m.camel_case_type("SetVariables") == "setVariables"
    assert m.camel_case_type("Guard") == "guard"
    assert m.camel_case_type("GuardTui") == "guardTui"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest scripts/test_camelcase_keys.py -v` (or `python scripts/test_camelcase_keys.py` if pytest absent — see Step 3 note)
Expected: FAIL / ImportError — `camelcase_keys.py` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Create `scripts/camelcase_keys.py`:

```python
#!/usr/bin/env python3
"""Deterministic camelCase-key codemod for the RTDS import/export contract.

Transforms JSON object KEYS only (never values, never free text) with the
"lower leading acronym run" rule. Operation `Type` values keep their `_vocalls`
suffix. See docs/superpowers/specs/2026-06-08-camelcase-key-migration-design.md.

Usage:
    python scripts/camelcase_keys.py --dry-run --print-mapping   # gate
    python scripts/camelcase_keys.py --write                     # apply
"""

import argparse
import json
import sys
from collections import OrderedDict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

# Tier A data files (keys-only rewrite). Type values are camelCased too.
DATA_FILES = [
    REPO / "callflow_json_config_vocalls" / name
    for name in [
        "DIGIPOLIS_DA_KLANTWACHT_GUARD_PRD.json",
        "DIGIPOLIS_DA_SYSTEEMWACHT_GUARD_PRD.json",
        "DIGIPOLIS_LPA_ICT_GUARD_PRD.json",
        "DIGIPOLIS_LPA_LTSU_GUARD_PRD.json",
        "DIGIPOLIS_DA_KLANTWACHT_TUI_PRD.json",
        "DIGIPOLIS_LPA_LTSU_GUARD_TUI_PRD.json",
        "DIGIPOLIS_LPA_ICT_GUARD_TUI_PRD.json",
        "DIGIPOLIS_DA_SYSTEEMWACHT_TUI_PRD.json",
    ]
]  # DA-HELPDESK.json EXCLUDED: legacy pre-migration PureConnect schema


def _camel_segment(seg):
    """Lower the leading run of capitals in one identifier segment.

    Lowercase the leading run of consecutive uppercase letters, but if that run
    is immediately followed by a lowercase letter, leave the LAST capital of the
    run as the start of the next word.
    """
    if not seg or not seg[0].isupper():
        return seg
    # length of the leading uppercase run
    i = 0
    while i < len(seg) and seg[i].isupper():
        i += 1
    # i = index of first non-uppercase char (or len)
    if i == len(seg):
        # entire segment is uppercase (e.g. "CC", "NL") -> all lowercase
        return seg.lower()
    if i == 1:
        # single leading cap (e.g. "Source", "Outbound") -> lower it
        return seg[0].lower() + seg[1:]
    # run of >=2 caps followed by lowercase (e.g. "IVREvent"):
    # lowercase all but the last cap of the run; that last cap starts next word
    return seg[: i - 1].lower() + seg[i - 1:]


def camel_case_key(key):
    """camelCase a JSON object key. Underscore-segmented: transform the FIRST
    segment only, preserve the rest verbatim (NextStep_Success -> nextStep_Success)."""
    if "_" in key:
        head, _, tail = key.partition("_")
        return _camel_segment(head) + "_" + tail
    return _camel_segment(key)


def camel_case_type(type_value):
    """camelCase an operation Type value, preserving a trailing _vocalls suffix."""
    suffix = "_vocalls"
    if type_value.endswith(suffix):
        return _camel_segment(type_value[: -len(suffix)]) + suffix
    return _camel_segment(type_value)


def transform(obj, mapping):
    """Recursively rewrite dict KEYS (and Type VALUES). Records every distinct
    transform into `mapping` (an OrderedDict old->new) for the gate table."""
    if isinstance(obj, list):
        return [transform(v, mapping) for v in obj]
    if isinstance(obj, dict):
        out = OrderedDict()
        for k, v in obj.items():
            nk = camel_case_key(k)
            if nk != k:
                mapping[("key", k)] = nk
            # the value under a "type"/"Type" key is an operation Type literal
            if nk == "type" and isinstance(v, str):
                nv = camel_case_type(v)
                if nv != v:
                    mapping[("type", v)] = nv
                out[nk] = nv
            else:
                out[nk] = transform(v, mapping)
        return out
    return obj


def run(write):
    mapping = OrderedDict()
    for path in DATA_FILES:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw, object_pairs_hook=OrderedDict)
        new = transform(data, mapping)
        if write:
            path.write_text(
                json.dumps(new, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
    return mapping


def print_mapping(mapping):
    keys = sorted(k for (kind, k) in mapping if kind == "key")
    types = sorted(k for (kind, k) in mapping if kind == "type")
    print("## Key mapping (old -> new)\n")
    print("| old | new |\n| --- | --- |")
    for k in keys:
        print("| `%s` | `%s` |" % (k, mapping[("key", k)]))
    print("\n## Type mapping (old -> new)\n")
    print("| old | new |\n| --- | --- |")
    for k in types:
        print("| `%s` | `%s` |" % (k, mapping[("type", k)]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--print-mapping", action="store_true")
    args = ap.parse_args()
    if not args.write and not args.dry_run:
        ap.error("specify --dry-run or --write")
    mapping = run(write=args.write)
    if args.print_mapping or args.dry_run:
        print_mapping(mapping)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Note: the test file loads the module directly, so `pytest` is optional; if pytest is not installed, append a `__main__` runner to the test or run each assertion via `python -c`. Prefer pytest if available in the repo's Python env.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m pytest scripts/test_camelcase_keys.py -v`
Expected: PASS — all 6 tests green. If `OutboundANI` or `IVREvent` fails, the `_camel_segment` run logic is wrong — fix before proceeding.

- [ ] **Step 5: Commit**

```bash
git add scripts/camelcase_keys.py scripts/test_camelcase_keys.py
git commit -m "feat(scripts): add camelCase-key codemod + tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Produce and commit the mapping table (THE REVIEW GATE)

**Files:**
- Create: `docs/superpowers/plans/camelcase-mapping-table.md`

This task ends at a **hard stop for human + SQL-team review.** Do not start Task 3 until the table is approved.

- [ ] **Step 1: Generate the table**

Run: `python scripts/camelcase_keys.py --dry-run --print-mapping > docs/superpowers/plans/camelcase-mapping-table.md`
Expected: a Markdown file with two tables (Key mapping, Type mapping). No JSON files are modified (dry-run).

- [ ] **Step 2: Sanity-check the acronym edge cases by eye**

Open `docs/superpowers/plans/camelcase-mapping-table.md` and confirm at minimum:
- `IVREvent -> ivrEvent`, `IVRAction -> ivrAction`
- `OutboundANI -> outboundANI` (trailing acronym untouched)
- `SmsAccountId -> smsAccountId`
- every `NextStep_*` row keeps its suffix segment unchanged (`nextStep_Success`, `nextStep_Guard_ICT`)
- Type rows keep `_vocalls` (`setVariables`, `guard`, `guardTui`, `sendMail`, `sendSms`, `disconnect`)

If any row is wrong, fix `_camel_segment` in `scripts/camelcase_keys.py`, add a regression test in Task 1's test file, re-run Step 1.

- [ ] **Step 3: Prepend the contract header**

Add this to the top of `docs/superpowers/plans/camelcase-mapping-table.md`:

```markdown
# camelCase key/type mapping — shared contract

Generated by `scripts/camelcase_keys.py --print-mapping`. This is the
authoritative key spelling for the RTDS import/export contract. The SQL team's
rewritten importer (`insert_flow_on_sourceId.sql`) and dictionary seed
(`seed_operations_vocalls_dictionary.sql`) MUST accept exactly these names.
Cross-system parity is proven at import time: any divergence throws
UNKNOWN_PARAM (54016) / UNKNOWN_OPERATION_TYPE (54015).

Rule: "lower leading acronym run" — see the migration design spec.
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/camelcase-mapping-table.md
git commit -m "docs(plan): generate camelCase mapping table (shared contract)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 5: STOP — share the table and get approval**

Surface the table to the user and the SQL team. Do not proceed to Task 3 until they confirm the spellings match what the importer/dictionary reset will accept. If they request a rule change, return to Task 1.

---

## Task 3: Apply the codemod to Tier A data + verify in isolation

**Files:**
- Modify: the 8 JSON files in `DATA_FILES`
- Modify: `rtds/db_seed/insert_flow_on_sourceId.sql` (embedded `@JsonPayload` only)

- [ ] **Step 1: Snapshot the before-state for diff sanity**

Run: `git stash list && git status --short`
Expected: clean working tree on branch `camelcase-key-migration` (Tasks 1-2 committed).

- [ ] **Step 2: Apply the codemod to the JSON data files**

Run: `python scripts/camelcase_keys.py --write`
Expected: exits 0, prints the mapping table. The 9 JSON files now have camelCase keys and camelCase `type` values.

**Formatting note:** the codemod re-serializes with `json.dumps(indent=2, ensure_ascii=False)`, so files are normalized to 2-space indent + trailing newline. This is intentional (these are machine-consumed import payloads, not hand-tuned), but it means the diff shows whitespace alongside key renames. If a reviewer needs a keys-only diff, compare `git show HEAD:<file> | python -m json.tool` against `python -m json.tool <file>` so both sides are canonically formatted. If the team requires byte-stable formatting instead, switch the writer to a key-only in-place regex/streaming rewrite — but the canonical-reformat approach is the default here.

- [ ] **Step 3: Verify JSON well-formedness + no duplicate keys**

Run:
```bash
python -c "import json,glob; [json.load(open(f,encoding='utf-8')) for f in glob.glob('callflow_json_config_vocalls/*.json')]; print('all parse OK')"
```
Expected: `all parse OK`. (Duplicate keys would have collided during the codemod's OrderedDict rebuild and surfaced as lost data — verify the next step catches that.)

- [ ] **Step 4: Verify every nextStep* target resolves to a real id (per flow)**

Run:
```bash
python - <<'PY'
import json, glob
for f in glob.glob('callflow_json_config_vocalls/*.json'):
    d = json.load(open(f, encoding='utf-8'))
    ops = d.get('operations', [])
    ids = {o.get('id') for o in ops}
    bad = []
    for o in ops:
        for k, v in (o.get('params') or {}).items():
            if k.startswith('nextStep') and isinstance(v, str) and v and v not in ids:
                bad.append((o.get('id'), k, v))
    print(f, 'OK' if not bad else f'DANGLING {bad}')
PY
```
Expected: every file prints `OK`. A `DANGLING` result means a key transform broke a branch reference — investigate before continuing (it should be impossible since values are untouched, but this guards against a key like `NextStep` being missed and the runtime then not finding it).

- [ ] **Step 5: Hand-edit the embedded SQL sample payload**

In `rtds/db_seed/insert_flow_on_sourceId.sql`, the `@JsonPayload nvarchar(max)` literal (around lines 83-179) is PascalCase. Replace its keys/type values to camelCase to match the mapping table. This is the only edit to that file — do NOT touch the `$.SourceId` JSON_VALUE paths or any T-SQL (the SQL team owns the importer logic). Add a one-line comment above the literal:

```sql
/* Sample payload uses the camelCase contract (see docs/superpowers/plans/camelcase-mapping-table.md). */
```

- [ ] **Step 6: Commit Tier A**

```bash
git add callflow_json_config_vocalls/*.json rtds/db_seed/insert_flow_on_sourceId.sql
git commit -m "refactor(data): camelCase keys + types across RTDS flow JSON

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Update runtime code literals (Tier B — runtime)

**Files:**
- Modify: `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js`

The runtime ALREADY reads envelope keys as camelCase (`json.operations`, `op.id`, `op.params`, `op.isFirstOperation` — no change needed there). What changes: the Param-name string literals in `getParam(op, "...")` calls and `executeXxx` twins, and the operation registry keys. Reads are case-insensitive so these are correctness-of-literals edits, not behavior changes — the tests must still pass identically.

- [ ] **Step 1: Find every Param-name literal**

Run: `grep -nE 'getParam\(op, "' projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js`
Expected: ~40 lines, e.g. `getParam(op, "NextStep", null)`, `getParam(op, "SmsAccountId", -1)`, `getParam(op, "Active", true)`, `getParam(op, "Cc", "")`.

- [ ] **Step 2: Rewrite each literal to its camelCase form**

Using the mapping table, rewrite each second argument. Examples:
- `getParam(op, "NextStep", null)` -> `getParam(op, "nextStep", null)`
- `getParam(op, "SmsAccountId", -1)` -> `getParam(op, "smsAccountId", -1)`
- `getParam(op, "Active", true)` -> `getParam(op, "active", true)`
- `getParam(op, "To", "")` -> `getParam(op, "to", "")`
- `getParam(op, "Cc", "")` -> `getParam(op, "cc", "")`
- `getParam(op, "AttachmentNames", "")` -> `getParam(op, "attachmentNames", "")`

Do every occurrence the grep found. The payload property names on the LEFT of object literals (e.g. `smsAccountId:`, `routing:`) are already lowercase API field names — leave them.

- [ ] **Step 3: Rewrite the registry keys**

Run: `grep -nE "register(RtdsOperation|RtdsExit)\(" projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js`
For each `'..._vocalls'` argument, apply `camel_case_type`: `'SetVariables'` -> `'setVariables'`, `'Guard'` -> `'guard'`, etc. These keys are matched against the JSON `type` value (now camelCase from Task 3), so they MUST move together.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: `Tests: 113 passed, 113 total` (same as baseline). If a flow test now fails to dispatch an op, the registry key in Step 3 and the JSON `type` from Task 3 disagree — reconcile against the mapping table.

- [ ] **Step 5: Commit**

```bash
git add projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js
git commit -m "refactor(runtime): camelCase Param-name literals + registry keys

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Update component literals (Tier B — components)

**Files:**
- Modify: `rtds/components/sendSms.js`, `sendMail.js`, `setVariables.js`, `guardTui.js`, `guardRouting.js`, `checkSchedule.js`

Each component is mxGraph XML with HTML-entity-encoded JS-in-XML. Param names appear in TWO places per component: (1) the `__configJSON` object keys inside the `Variables=` attribute, and (2) `getValue(__rtParams, '<Name>', ...)` literals inside `Code=`/`OnEnter=` attributes. The quote entity is `&#39;`. Edit carefully — these are not free text. Do ONE component fully, run its contract test, then the next.

- [ ] **Step 1: sendSms — rewrite `__configJSON` keys**

In `rtds/components/sendSms.js`, the `Variables=` attribute holds `__configJSON = { "Active": false, "To": ..., "SmsAccountId": 47, "NextStep_Success": "00011", "NextStep_Failure": "00099", "NextStep": "00012" }`. Rewrite the quoted keys to camelCase per the mapping table:
- `"Active"` -> `"active"`, `"To"` -> `"to"`, `"Routing"` -> `"routing"`, `"From"` -> `"from"`, `"Body"` -> `"body"`, `"SmsAccountId"` -> `"smsAccountId"`, `"Timeout"` -> `"timeout"`, `"NextStep_Success"` -> `"nextStep_Success"`, `"NextStep_Failure"` -> `"nextStep_Failure"`, `"NextStep"` -> `"nextStep"`.

- [ ] **Step 2: sendSms — rewrite `getValue(__rtParams, '...')` + `__rtOutcome` literals**

In the `Code=` and `OnEnter=`/`Variables=` attributes, rewrite:
- `getValue(__rtParams, &#39;Active&#39;, false)` -> `...&#39;active&#39;...`
- `getValue(__rtParams, &#39;To&#39;, &#39;&#39;)` -> `...&#39;to&#39;...`
- `getValue(__rtParams, &#39;Timeout&#39;, 10000)` -> `...&#39;timeout&#39;...`
- `getValue(__rtParams, &#39;SmsAccountId&#39;, -1)` -> `...&#39;smsAccountId&#39;...`
- `getValue(__rtParams, &#39;Routing&#39;, &#39;&#39;)` -> `...&#39;routing&#39;...`
- `getValue(__rtParams, &#39;From&#39;, &#39;&#39;)` -> `...&#39;from&#39;...`
- `getValue(__rtParams, &#39;Body&#39;, &#39;&#39;)` -> `...&#39;body&#39;...`
- `__rtOutcome = &#39;NextStep_Failure&#39;;` -> `...&#39;nextStep_Failure&#39;;` (both occurrences: Variables seed + script node)
- `__rtOutcome = &#39;NextStep&#39;;` (init node) -> `...&#39;nextStep&#39;;`
- the `__setupConfig` special-case `if (__key === &#39;Active&#39;)` -> `if (__key === &#39;active&#39;)` and `__result.Active` -> `__result.active`. **Note:** `__setupConfig` is the canonical helper shared verbatim across v2 components and validated by `setupConfig.test.js` and `check_skill_sync.py`. Changing the `'Active'` literal here means it must change identically in ALL v2 components AND in `.claude/skills/rtds-vocalls-component-gen/references/canonical_helpers.js` (regenerated in Task 6). Keep them byte-identical.

- [ ] **Step 3: Run the sendSms contract test**

Run: `npm test -- projects/rtds-runtime/tests/components/sendSms.test.js`
Expected: PASS. If `setupConfig.test.js` now fails, the `__setupConfig` `'Active'` literal diverged between components — make all v2 components identical.

- [ ] **Step 4: Repeat Steps 1-3 for the other five components**

For each of `sendMail.js`, `setVariables.js`, `guardTui.js`, `guardRouting.js`, `checkSchedule.js`: rewrite `__configJSON` keys and every `getValue(__rtParams, '<Name>', ...)` / `__rtOutcome` literal to camelCase per the mapping table. Component-specific keys to expect (non-exhaustive — use the mapping table as the authority):
- sendMail: `cc`, `bcc`, `priority`, `files`, `attachmentNames`, `attachmentData`, `customerKey`, `subject`, `from`, `to`, `body`, `timeout`, `nextStep_Success`, `nextStep_Failure`, `nextStep`, `active`
- setVariables: `active`, `nextStep`, `routingId`, `customerName`, `customerProject`, `ivrEvent`, `ivrAction`, `logAttributes`, plus any session-variable keys it writes
- guardTui: `active`, `configId`, `configName`, `phoneNumberVar`, `timeout`, the `result*_NL` / `prompt*_NL` slots, `nextStep_Success`, `nextStep_Denied`, `nextStep_Failure`, `nextStep`
- guardRouting: `active`, `configId`, `configName`, `dialGuard`, `outboundAni`, `diversion`, `onHoldAudioUrl`, `timeout`, `recordVoicemail`, `acceptCallMenu`, `acceptCallMessage`, `sendSms`, `sendMail`, `nextStep_Success`, `nextStep_Failure`, `nextStep`
- checkSchedule: `active`, `applicationId`, `scheduleId`, the `nextStep_*` branch family, `nextStep`

Run each component's contract test after editing it (`sendSms.test.js`, `setupConfig.test.js` cover the shared parts; not every component has a dedicated test — rely on `npm test` for the rest).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `113 passed`.

- [ ] **Step 6: Commit**

```bash
git add rtds/components/*.js
git commit -m "refactor(components): camelCase __configJSON keys + getValue literals

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Update CLI + regenerate catalog & skill bundle

**Files:**
- Modify: `cli/simulate-flow.js`
- Regenerate: `rtds/docs/operations-catalog.md`, `.claude/skills/rtds-vocalls-component-gen/**`

- [ ] **Step 1: Update simulate-flow.js literals**

Run: `grep -nE '"(SourceId|Operations|Id|Type|Params|NextStep|Active|IsFirstOperation)"|_vocalls' cli/simulate-flow.js`
Rewrite any PascalCase envelope-key or Param-name string literals and any `..._vocalls` type literals to camelCase per the mapping table. If it reads `op.params`/`op.id` already (camelCase), leave those.

- [ ] **Step 2: Regenerate the catalog**

Run: `npm run gen:catalog`
Expected: `rtds/docs/operations-catalog.md` regenerated. (Its content derives from spec frontmatter; Task 7 updates specs, so this may need re-running after Task 7 — re-run then if `check:lockstep` flags it.)

- [ ] **Step 3: Regenerate the skill bundle**

Run: `npm run build:skill`
Expected: `.claude/skills/rtds-vocalls-component-gen/**` resynced from the repo `conventions/`, components, and runtime libs (which now carry camelCase). Never hand-edit these outputs.

- [ ] **Step 4: Verify skill sync**

Run: `npm run check:sync`
Expected: `Skill-sync check passed`.

- [ ] **Step 5: Commit**

```bash
git add cli/simulate-flow.js rtds/docs/operations-catalog.md .claude/skills/rtds-vocalls-component-gen
git commit -m "refactor(cli,skill): camelCase literals + regenerate skill bundle

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Update docs, specs, conventions, swagger (Tier C)

**Files:**
- Modify: `conventions/casing.md`, `PROJECT_CONVENTIONS.md`
- Modify: `rtds/specs/*.spec.md` (7), `rtds/docs/{runtime-spec,runtime-architecture,logging-design}.md`
- Modify: `rtds/api_swagger/routingtable_rtds_swagger.json`

- [ ] **Step 1: Rewrite the casing convention**

In `conventions/casing.md`, the "Param names — PascalCase by convention, case-insensitive on read" section now describes the OLD contract. Rewrite it: Param names are **camelCase** (`nextStep_Success`, `smsAccountId`, `active`). Keep the case-insensitive-read guidance (readers still normalise — defense in depth), but change the canonical examples to camelCase. Update the envelope-key section to note both envelope AND param keys are now camelCase end to end.

- [ ] **Step 2: Bump PROJECT_CONVENTIONS.md**

In `PROJECT_CONVENTIONS.md`: update rule #3 in the tl;dr ("Param names are PascalCase by convention" -> "camelCase") and the matching checklist rows (2.2, 12.1). Bump the version line at the top (`v0.5` -> `v0.6`) with today's date and a one-line changelog note: "Param + envelope keys converged on camelCase (mapping table: docs/superpowers/plans/camelcase-mapping-table.md)."

- [ ] **Step 3: Update the per-operation specs**

In each `rtds/specs/*.spec.md`, the Params tables and any `NextStep_*` / PascalCase references become camelCase per the mapping table. Update `catalog:` frontmatter only if it names params (most don't). Spot-check `sendSms.spec.md`, `sendMail.spec.md`, `setVariables.spec.md`, `guardTui.spec.md`, `guardRouting.spec.md`, `scheduler.spec.md`.

- [ ] **Step 4: Update runtime docs**

In `rtds/docs/runtime-spec.md`, `runtime-architecture.md`, `logging-design.md`: rewrite PascalCase envelope/Param examples to camelCase. These are field-level contract docs — they must match the new keys.

- [ ] **Step 5: Update swagger request schemas**

In `rtds/api_swagger/routingtable_rtds_swagger.json`, the IMPORT request-body schemas use PascalCase property names (`SourceId`, `Operations`, `Id`, `Type`, `Params`, `IsFirstOperation`). Rename them to camelCase. The response schemas are already camelCase — leave them. Verify the file still parses: `python -c "import json; json.load(open('rtds/api_swagger/routingtable_rtds_swagger.json')); print('OK')"`.

- [ ] **Step 6: Re-run catalog generation (specs changed)**

Run: `npm run gen:catalog`
Expected: catalog re-rendered from updated spec frontmatter.

- [ ] **Step 7: Commit**

```bash
git add conventions/casing.md PROJECT_CONVENTIONS.md rtds/specs rtds/docs rtds/api_swagger/routingtable_rtds_swagger.json
git commit -m "docs: converge specs/conventions/swagger on camelCase contract

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Golden verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the full check**

Run: `npm run check`
Expected: `check:sync` passes, `check:lockstep` passes. Crucially, the PRE-EXISTING lockstep param-parity warnings (`IVREvent`/`IvrEvent` mismatch on setVariables, the `*_NL` GuardTui slots) should now be RESOLVED or reduced — the whole point of converging on one casing. If new mismatches appear, a tier drifted from the mapping table.

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: `Tests: 113 passed, 113 total`.

- [ ] **Step 3: Grep for residual PascalCase in the contract surface**

Run:
```bash
grep -rnE '"(SourceId|Operations|IsFirstOperation|NextStep_|SmsAccountId|IvrEvent|IvrAction)"' callflow_json_config_vocalls rtds/components || echo "no residual PascalCase keys"
```
Expected: `no residual PascalCase keys`. Any hit is a missed key — fix it and re-run Tasks 4-8 for that file.

- [ ] **Step 4: AGENTS.md sync**

If `PROJECT_CONVENTIONS.md` or `CLAUDE.md` changed, regenerate the sibling: `npm run gen:agents`. Then `git status` — if `AGENTS.md` changed, commit it.

- [ ] **Step 5: Final commit (if Step 4 produced changes)**

```bash
git add AGENTS.md
git commit -m "docs: regenerate AGENTS.md after camelCase convention update

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: Report the done-gate status**

Confirm against the spec's acceptance criteria: (3) `npm run check` passes ✓, (4) `npm test` passes ✓, (5) mapping table committed ✓, (6) no residual PascalCase ✓. Criteria (1) and (2) — clean re-import into the reset DB and runtime dispatch — require the SQL team's reset DB and are verified jointly with them; note this as the remaining external gate.

---

## Notes for the implementer

- **Branch:** all work is on `camelcase-key-migration` (already created). Frequent commits per task.
- **The mapping table (Task 2) is a hard gate.** Everything downstream assumes those exact spellings. Do not improvise key names — if the table is wrong, fix the function and regenerate.
- **Reads are case-insensitive** (`getParam`/`getValue`), so Tier B literal edits won't change runtime behavior — `npm test` staying at 113 green is the proof you didn't break anything, not that you finished. Finishing is the grep in Task 8 Step 3 coming back clean.
- **`__setupConfig` is shared verbatim** across all v2 components and the skill's `canonical_helpers.js`. Its one Param-name literal (`'Active'` -> `'active'`) must be identical everywhere or `check:sync` / `setupConfig.test.js` fails.
- **Don't touch:** value tokens (`${rtEmailTo}`), the `_vocalls` suffix, the SQL importer's `$.path` JSON_VALUE expressions or any T-SQL logic, the swagger response schemas (already camelCase).
