#!/usr/bin/env python3
"""
validate_config.py -- one-shot correctness gate for a generated RTDS routing-table config.

The generator (and the humans reviewing it) kept re-deriving the same checks by hand:
does every nextStep resolve? do the ids ascend in call order? did a menu op end up with
no announce text? is some param name uncatalogued (the importer THROWs 54016 on those)?
This script runs all of them at once so a config is either provably clean or fails with a
precise, actionable list.

It reads the AUTHORITATIVE param catalogue straight from
    rtds/db_seed/import_seeds_camelCase.sql
(the ('type','param',...) VALUES tuples), so it stays honest as the contract evolves --
no hand-maintained copy to drift.

Checks (each prints [OK]/[WARN]/[FAIL] with detail):
  1. JSON parses.
  2. Envelope: sourceId/name/project/promptLibrary/supportedLanguages/operations present.
  3. Exactly one op has isFirstOperation: true.
  4. Every nextStep / nextStep_* references an existing op id (5-digit values only).
  5. BFS from the first op reaches every op (no orphans).
  6. Op ids ascend in the operations array (reads top-to-bottom in call order).
  7. Last reachable op(s) are `disconnect`.
  8. No retired types: emergency, workgroupTransfer, remoteTransfer, localTransfer.
  9. `nextStep` is the LAST key in each params object (after nextStep_* branch keys).
 10. Every params key is catalogued for its type in the seed (envelope key `ttsMessages`
     is whitelisted -- it is folded in by the runtime, not a Dic_Attribute).
 11. Menu sanity: a `menu` op must be able to announce SOMETHING -- either a non-empty
     staticMessage_<LANG> or at least one menuChoiceMessage_<key>_<LANG>. A menu whose
     text lives only in ttsMessages is SILENT at runtime (the component never reads it).
 12. Duplicate setVariables ops (identical params) -> WARN (collapse candidates).
 13. A say whose text is the opening of a downstream menu's staticMessage -> WARN
     (caller hears the greeting twice; drop the standalone welcome say).
 14. A prompt-key's <Category>_ prefix disagrees with the op's applicationId
     (e.g. PreQueue_* on applicationId 14 Exception) -> WARN.
 15. One prompt key reused across multiple say ops -> WARN (confirm it fits all).
 16. Only the exception unit (Cognos 9999/DC) may set a marker before disconnect;
     any other setVariables routing straight to disconnect -> WARN.

Exit code: 0 if no FAILs (WARNs allowed), 1 otherwise.

Usage:
    python validate_config.py jsonConfig/digipolis_stad/DA_CC_MELDJEAAN.json
    python validate_config.py <file> --seed rtds/db_seed/import_seeds_camelCase.sql
"""

import argparse
import json
import os
import re
import sys
from collections import deque

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "..", ".."))
DEFAULT_SEED = os.path.join(REPO_ROOT, "rtds", "db_seed", "import_seeds_camelCase.sql")

# Envelope keys folded in by the runtime / structural, NOT validated as Dic_Attribute.
ENVELOPE_PARAM_KEYS = {"ttsMessages"}
RETIRED_TYPES = {"emergency", "workgroupTransfer", "remoteTransfer", "localTransfer"}
STEP_RE = re.compile(r"^\d{5}$")

# Dic_PromptApplication: applicationId -> Name (from rtds/db_seed/Dic_PromptApplication.tsv).
# Used to WARN when a prompt-key's <Category>_ prefix disagrees with the op's applicationId.
APP_ID_NAME = {
    1: "Scheduler", 2: "Callback", 3: "Survey", 4: "PreQueue", 5: "Queue",
    6: "AdHocMessages", 7: "Menu", 11: "Welcome", 12: "Voicemail", 13: "Info",
    14: "Exception", 15: "Emergency", 16: "Disconnect",
}
# prompt-key category prefix -> the applicationId Name it is expected to sit under.
CATEGORY_APP = {
    "prequeue": "PreQueue", "queue": "Queue", "menu": "Menu", "welcome": "Welcome",
    "adhoc": "AdHocMessages", "exception": "Exception", "scheduler": "Scheduler",
    "voicemail": "Voicemail", "info": "Info",
}


def _prompt_val(op):
    """Extract the prompt-key string from a say/menu op (handles the triplet form)."""
    pr = op.get("params", {}).get("prompt")
    if isinstance(pr, list) and pr:
        return pr[0]
    return pr if isinstance(pr, str) else None


class Report:
    def __init__(self):
        self.fails = 0
        self.warns = 0

    def ok(self, msg):
        print(f"[OK]   {msg}")

    def warn(self, msg):
        self.warns += 1
        print(f"[WARN] {msg}")

    def fail(self, msg):
        self.fails += 1
        print(f"[FAIL] {msg}")


def load_seed_catalogue(seed_path):
    """Parse ('type', 'param', ...) tuples from the seed into {type: set(params)}.

    Matches lines like:  ('menu', 'staticMessage_NL', 'string', 0, 0, 0, 0),
    Only the first two quoted strings (type, param) are needed.
    """
    cat = {}
    if not os.path.exists(seed_path):
        return None
    line_re = re.compile(r"^\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,")
    with open(seed_path, encoding="utf-8") as fh:
        for line in fh:
            m = line_re.match(line)
            if not m:
                continue
            typ, param = m.group(1), m.group(2)
            # skip the operation-type registration block: ('setVariables'),  (single value)
            cat.setdefault(typ, set()).add(param)
    # drop any 'type' that only ever appeared as a bare registration (no params captured)
    return {k: v for k, v in cat.items() if v}


def collect_step_targets(params):
    """Yield (key, value) for every nextStep / nextStep_* whose value looks like a step id."""
    for k, v in params.items():
        if k == "nextStep" or k.startswith("nextStep_"):
            if isinstance(v, str) and STEP_RE.match(v):
                yield k, v


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("config", help="Path to the generated config JSON")
    ap.add_argument("--seed", default=DEFAULT_SEED, help="Path to import_seeds_camelCase.sql")
    args = ap.parse_args(argv)

    r = Report()

    # 1. parse
    try:
        with open(args.config, encoding="utf-8") as fh:
            cfg = json.load(fh)
    except Exception as e:  # noqa: BLE001
        r.fail(f"JSON did not parse: {e}")
        return 1
    r.ok("JSON parses")

    # 2. envelope
    for key in ("sourceId", "name", "project", "promptLibrary", "supportedLanguages", "operations"):
        if key not in cfg:
            r.fail(f"envelope missing '{key}'")
    ops = cfg.get("operations", [])
    if not isinstance(ops, list) or not ops:
        r.fail("operations is empty or not a list")
        return 1
    ids = [o.get("id") for o in ops]
    idset = set(ids)

    # 3. exactly one isFirstOperation
    firsts = [o["id"] for o in ops if o.get("isFirstOperation") is True]
    if len(firsts) == 1:
        r.ok(f"single isFirstOperation ({firsts[0]})")
    else:
        r.fail(f"expected exactly one isFirstOperation, found {len(firsts)}: {firsts}")

    # 4. nextStep references resolve
    dangling = []
    for o in ops:
        for k, v in collect_step_targets(o.get("params", {})):
            if v not in idset:
                dangling.append(f"{o.get('id')}.{k} -> {v}")
    if dangling:
        r.fail("dangling nextStep refs: " + "; ".join(dangling))
    else:
        r.ok("all nextStep refs resolve")

    # 5. BFS reachability from the first op
    if firsts:
        start = firsts[0]
        adj = {}
        for o in ops:
            adj[o["id"]] = [v for _, v in collect_step_targets(o.get("params", {}))]
        seen = set()
        q = deque([start])
        while q:
            cur = q.popleft()
            if cur in seen:
                continue
            seen.add(cur)
            for nxt in adj.get(cur, []):
                if nxt not in seen:
                    q.append(nxt)
        orphans = [i for i in ids if i not in seen]
        if orphans:
            r.warn(f"ops not reachable from {start}: {orphans}")
        else:
            r.ok("every op reachable from the first op")

    # 6. ascending ids
    if ids == sorted(ids):
        r.ok("op ids ascend in array order (reads in call order)")
    else:
        out_of_order = [ids[i] for i in range(1, len(ids)) if ids[i] < ids[i - 1]]
        r.warn(f"op ids not ascending; out-of-order at: {out_of_order}")

    # 7. terminal disconnect
    if ops[-1].get("type") == "disconnect":
        r.ok("last op is disconnect")
    else:
        r.warn(f"last op is '{ops[-1].get('type')}', expected disconnect")

    # 8. retired types
    bad_types = sorted({o.get("type") for o in ops if o.get("type") in RETIRED_TYPES})
    if bad_types:
        r.fail(f"retired op types present: {bad_types}")
    else:
        r.ok("no retired op types")

    # 9. nextStep is the last params key
    misordered = []
    for o in ops:
        pk = list(o.get("params", {}).keys())
        if "nextStep" in pk and pk[-1] != "nextStep":
            misordered.append(o.get("id"))
    if misordered:
        r.warn(f"'nextStep' is not the last param key in: {misordered}")
    else:
        r.ok("'nextStep' is the last param key where present")

    # 10. param catalogue check against the seed
    cat = load_seed_catalogue(args.seed)
    if cat is None:
        r.warn(f"seed not found at {args.seed}; skipped param-catalogue check")
    else:
        unknown = []
        for o in ops:
            typ = o.get("type")
            known = cat.get(typ)
            if known is None:
                r.warn(f"op {o.get('id')} type '{typ}' not in seed catalogue")
                continue
            for k in o.get("params", {}):
                if k in ENVELOPE_PARAM_KEYS:
                    continue
                if k not in known:
                    unknown.append(f"{o.get('id')} ({typ}).{k}")
        if unknown:
            r.fail("uncatalogued params (importer would THROW 54016): " + "; ".join(unknown))
        else:
            r.ok("every params key is catalogued for its type")

    # 11. menu must announce something
    for o in ops:
        if o.get("type") != "menu":
            continue
        p = o.get("params", {})
        has_static = any(
            k.startswith("staticMessage_") and str(p[k]).strip() for k in p
        )
        has_choice = any(
            k.startswith("menuChoiceMessage_") and str(p[k]).strip() for k in p
        )
        if has_static or has_choice:
            r.ok(f"menu {o.get('id')} has announce text (static/per-key)")
        else:
            tts = o.get("ttsMessages") or {}
            hint = " (text is only in ttsMessages -- the menu component never reads that; move it to staticMessage_<LANG>)" if tts else ""
            r.fail(f"menu {o.get('id')} has NO announce text -> silent at runtime{hint}")

    # 12. duplicate setVariables ops
    seen_params = {}
    for o in ops:
        if o.get("type") != "setVariables":
            continue
        sig = json.dumps(o.get("params", {}), sort_keys=True, ensure_ascii=False)
        seen_params.setdefault(sig, []).append(o.get("id"))
    dupes = [v for v in seen_params.values() if len(v) > 1]
    if dupes:
        for grp in dupes:
            r.warn(f"identical setVariables ops (collapse candidates): {grp}")
    else:
        r.ok("no duplicate setVariables ops")

    # 13. welcome/say duplicates a downstream menu greeting
    def norm(s):
        return re.sub(r"\s+", " ", str(s or "")).strip().lower()
    menu_texts = []
    for o in ops:
        if o.get("type") == "menu":
            p = o.get("params", {})
            for k in p:
                if k.startswith("staticMessage_") and str(p[k]).strip():
                    menu_texts.append((o.get("id"), norm(p[k])))
    dup_greet = []
    for o in ops:
        if o.get("type") != "say":
            continue
        for lang_txt in (o.get("ttsMessages") or {}).values():
            t = norm(lang_txt)
            if not t:
                continue
            for mid, mt in menu_texts:
                if mt.startswith(t) and len(t) >= 12:
                    dup_greet.append(f"say {o.get('id')} text is the opening of menu {mid}")
    if dup_greet:
        for m in dup_greet:
            r.warn(m + " -- caller hears the greeting twice; consider dropping the say")
    elif menu_texts:
        r.ok("no say duplicates a downstream menu greeting")

    # 14. prompt-key category vs applicationId mismatch
    mismatches = []
    for o in ops:
        if o.get("type") not in ("say", "menu"):
            continue
        val = _prompt_val(o)
        appid = o.get("params", {}).get("applicationId")
        if not (isinstance(val, str) and val and val.lower() != "unknown"):
            continue
        cat = val.split("_", 1)[0].lower()
        expected = CATEGORY_APP.get(cat)
        actual = APP_ID_NAME.get(appid)
        if expected and actual and expected != actual:
            mismatches.append(f"{o.get('id')}: key '{val}' ({expected}) on applicationId {appid} ({actual})")
    if mismatches:
        for m in mismatches:
            r.warn("prompt-key category != applicationId: " + m)
    else:
        r.ok("prompt-key categories match their applicationId")

    # 15. shared prompt key reused across multiple say ops (INFO via WARN)
    key_ops = {}
    for o in ops:
        if o.get("type") != "say":
            continue
        val = _prompt_val(o)
        if isinstance(val, str) and val and val.lower() != "unknown":
            key_ops.setdefault(val, []).append(o.get("id"))
    shared = {k: v for k, v in key_ops.items() if len(v) > 1}
    if shared:
        for k, v in shared.items():
            r.warn(f"prompt key '{k}' reused across says {v} -- confirm one prompt fits all")

    # 16. Cognos markers that route straight to disconnect must be a KNOWN end-of-call
    #     code: the exception unit (9999/DC) or the scheduler Closed marker (1201/DC).
    #     Anything else logging + disconnecting is likely a stray/duplicated marker.
    END_OF_CALL_CODES = {("9999", "DC"), ("1201", "DC")}
    disc_ids = {o["id"] for o in ops if o.get("type") == "disconnect"}
    for o in ops:
        if o.get("type") != "setVariables":
            continue
        p = o.get("params", {})
        if p.get("nextStep") in disc_ids:
            ev, ac = str(p.get("ivrEvent", "")), str(p.get("ivrAction", ""))
            if (ev, ac) not in END_OF_CALL_CODES:
                r.warn(f"setVariables {o.get('id')} logs {ev}/{ac} then disconnects -- "
                       f"expected an end-of-call code (9999/DC exception, or 1201/DC Closed)")

    print()
    print(f"Summary: {r.fails} FAIL, {r.warns} WARN")
    return 1 if r.fails else 0


if __name__ == "__main__":
    sys.exit(main())
