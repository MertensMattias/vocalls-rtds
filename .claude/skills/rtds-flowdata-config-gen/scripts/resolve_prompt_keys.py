#!/usr/bin/env python3
"""
resolve_prompt_keys.py -- turn a flow's prompt transcript into usable prompt keys.

The digipolis TTS transcripts under
    jsonConfig/digipolis_tts_messages/markdown/TTS_transcripties_<DOMAIN>*.md
hold every prompt key + its canonical spoken text for a project, one per row:

    | Prompt key                          | TTS-tekst                     |
    | ----------------------------------- | ----------------------------- |
    | MELDJEAAN/NL/Menu_Main              | Welkom bij de helpdesk ...    |
    | MELDJEAAN/NL/PreQueue_Kleuter...    | U wordt zo dadelijk ...       |

This script parses that table into structured records so the config generator can
wire real `prompt` names + `ttsMessages` text instead of the placeholder "unknown".
It is deterministic on purpose: parsing a markdown table the same way every run beats
having the model re-eyeball it (and mis-copy Dutch text) each time.

It does NOT decide which key belongs on which op -- that is a judgement call the skill
makes (and surfaces in its report). This script's job is to (a) load the transcript,
(b) optionally rank candidate keys for a given op role, and (c) tag each key with the
op-type it belongs to, so the caller knows a `Scheduler_*` key is played by the
scheduler in-component and must NOT become a `say` op.

Usage:
    # dump every key+text for a domain as JSON
    python resolve_prompt_keys.py --domain CC

    # give an explicit transcript file instead of resolving by domain
    python resolve_prompt_keys.py --file "jsonConfig/.../TTS_transcripties_CC (2).md"

    # rank candidate keys for one or more op roles (comma-separated)
    python resolve_prompt_keys.py --domain CC --roles "welcome,prequeue lager,menu,exception"

Output is JSON on stdout. Nothing is written to disk unless --out is given.
"""

import argparse
import glob
import json
import os
import re
import sys

# Repo-root-relative default location of the transcripts. Resolved from this
# script's path so the skill works regardless of the caller's cwd.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "..", ".."))
TRANSCRIPT_DIR = os.path.join(
    REPO_ROOT, "jsonConfig", "digipolis_tts_messages", "markdown"
)

# Categories the SCHEDULER plays itself, in-component, from the live API response.
# A key in one of these categories must NEVER be wired onto a `say` op -- doing so
# double-plays or misplaces the message (see references/prompt-keys.md).
SCHEDULER_CATEGORIES = {"scheduler"}

# Rough op-role -> (category hints, name substrings) for candidate ranking. Suggestions
# the caller ranks against; deliberately loose because transcripts name keys
# inconsistently across projects. The `name` substrings sharpen roles that share a
# category (e.g. the three Menu_* keys) so the intended one ranks first.
ROLE_HINTS = {
    "welcome": (["welcome", "menu"], ["welcome", "main"]),   # greeting sometimes folded into Menu_Main
    "adhoc": (["adhoc"], ["adhoc"]),
    "prequeue": (["prequeue", "adhoc"], ["prequeue", "transfer"]),  # "U wordt doorverbonden"
    "announcement": (["prequeue", "adhoc"], ["transfer", "prequeue"]),
    "menu": (["menu"], ["main"]),                            # -> Menu_Main (not WrongChoice/NoMoreTries)
    "menuwrong": (["menu"], ["wrong", "invalid"]),           # -> Menu_WrongChoice
    "menuretry": (["menu"], ["nomoretries", "maxtries", "nomore"]),  # -> Menu_NoMoreTries
    "exception": (["exception"], ["unexpected", "exception", "nostaffing"]),  # generic say; NOT Scheduler_*
    "queue": (["queue"], ["wait", "queue"]),
}


def find_transcript(domain):
    """Resolve a domain code (e.g. 'CC', 'GAPA') to its transcript file.

    Filenames carry noise (' 7 (2)', ' 5 (2)'), so match on the domain token that
    follows 'TTS_transcripties_' and precedes a space, digit, or '(' -- e.g.
    'TTS_transcripties_CC (2).md' and 'TTS_transcripties_technische_storing 8 (2).md'.
    """
    pat = os.path.join(TRANSCRIPT_DIR, "TTS_transcripties_*.md")
    matches = []
    for path in glob.glob(pat):
        base = os.path.basename(path)
        m = re.match(r"TTS_transcripties_(.+?)(?:\s|\d|\(|\.md)", base)
        token = m.group(1) if m else ""
        if token.lower() == domain.lower():
            matches.append(path)
    if not matches:
        return None
    # Prefer the shortest name if several variants exist (rare).
    return sorted(matches, key=len)[0]


def parse_transcript(path):
    """Parse a transcript markdown table into a list of key records.

    Each record: {key, project, language, category, name, text}.
    `key` is the full 'PROJECT/LANG/Category_Name'; `prompt` for the config is
    'Category_Name' (project/lang stripped).
    """
    records = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line.startswith("|"):
                continue
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) < 2:
                continue
            key, text = cells[0], cells[1]
            # skip header + separator rows
            if key.lower() in ("prompt key", "") or set(key) <= set("-: "):
                continue
            parts = key.split("/")
            if len(parts) >= 3:
                project, language, cat_name = parts[0], parts[1], "/".join(parts[2:])
            else:
                # transcript row without the PROJECT/LANG prefix -- keep as-is
                project, language, cat_name = "", "", key
            category = cat_name.split("_", 1)[0] if "_" in cat_name else cat_name
            records.append(
                {
                    "key": key,
                    "prompt": cat_name,           # what goes in config `prompt`
                    "project": project,
                    "language": language or "NL",
                    "category": category,
                    "name": cat_name,
                    "text": text,
                    "isScheduler": category.lower() in SCHEDULER_CATEGORIES,
                }
            )
    return records


def rank_candidates(records, role):
    """Return records ranked as candidates for a given op role (loose scoring).

    Roles that map to a Vocalls-side say (welcome, prequeue, menu, exception) should
    NOT resolve to a Scheduler_* key -- the scheduler plays those itself. So unless the
    role is literally about the scheduler, scheduler keys are penalised, not offered.
    """
    role_l = role.lower().strip()
    tokens = [t for t in re.split(r"[\s_]+", role_l) if t]
    # Match ROLE_HINTS keys longest-first, and once a longer key matches, suppress
    # any shorter key that is a substring of it (so 'menuwrong' does not also fire the
    # generic 'menu' hint and pull in the Menu_Main name bonus).
    hint_cats, hint_names, matched_keys = [], [], []
    for key in sorted(ROLE_HINTS, key=len, reverse=True):
        if key in role_l and not any(key in mk for mk in matched_keys):
            matched_keys.append(key)
            cats, names = ROLE_HINTS[key]
            hint_cats.extend(cats)
            hint_names.extend(names)
    role_is_scheduler = "scheduler" in role_l or "scheduler" in hint_cats
    scored = []
    for r in records:
        score = 0
        cat_l = r["category"].lower()
        name_l = r["name"].lower()
        if cat_l in hint_cats:
            score += 3
        for nm in hint_names:
            if nm in name_l:
                score += 4
        for tok in tokens:
            if tok and (tok in name_l or tok in cat_l):
                score += 2
        if r["isScheduler"] and not role_is_scheduler:
            score -= 5           # a say-role must not pick a scheduler-owned prompt
        if score > 0:
            scored.append((score, r))
    scored.sort(key=lambda x: (-x[0], x[1]["name"]))
    return [
        {"score": s, **{k: r[k] for k in ("key", "prompt", "category", "text", "isScheduler")}}
        for s, r in scored
    ]


# Roles whose match is usually unambiguous enough to apply without asking. Everything
# else is surfaced for confirmation. (Mirrors TTS_RECONCILE_TODO.md: exception/menu are
# safe-ish; welcome/adhoc/prequeue are judgement calls.)
AUTO_APPLY_ROLES = {"menu", "menuwrong", "menuretry", "exception"}


def build_qa(records, roles):
    """Turn ranked candidates into a decision-ready Q/A per op role.

    Each item: {role, recommend, text, confidence, decision ('auto'|'confirm'),
    reason, alternatives}. `decision` tells the skill whether to just apply the
    recommendation or put it in front of the user; `confidence` is high|medium|low
    from the score gap between the top two candidates.
    """
    qa = []
    for role in roles:
        role = role.strip()
        if not role:
            continue
        cands = rank_candidates(records, role)
        if not cands:
            qa.append({
                "role": role, "recommend": None, "text": "",
                "confidence": "none", "decision": "confirm",
                "reason": "no transcript key matched -- leave 'unknown' or supply a key",
                "alternatives": [],
            })
            continue
        top = cands[0]
        gap = top["score"] - (cands[1]["score"] if len(cands) > 1 else 0)
        confidence = "high" if gap >= 4 else "medium" if gap >= 2 else "low"
        role_key = role.lower().replace(" ", "")
        auto = (
            any(role_key.startswith(a) or a in role_key for a in AUTO_APPLY_ROLES)
            and confidence != "low"
            and not top["isScheduler"]
        )
        qa.append({
            "role": role,
            "recommend": top["prompt"],
            "text": top["text"],
            "confidence": confidence,
            "decision": "auto" if auto else "confirm",
            "reason": (
                "scheduler-owned key -- do NOT wire onto a say op" if top["isScheduler"]
                else "clear match" if auto
                else "multiple plausible keys -- confirm"
            ),
            "alternatives": [
                {"prompt": c["prompt"], "text": c["text"]} for c in cands[1:4]
            ],
        })
    return qa


def render_qa(qa):
    """Human-readable Q/A block the skill can paste into its report for the user."""
    lines = ["Prompt-key decisions (reply with the number to change, or 'ok' to accept all):", ""]
    for i, item in enumerate(qa, 1):
        tag = "AUTO " if item["decision"] == "auto" else "ASK  "
        rec = item["recommend"] or "(none -- unknown)"
        lines.append(f"  {i}. [{tag}] {item['role']}")
        lines.append(f"       -> {rec}   (confidence: {item['confidence']}; {item['reason']})")
        if item["text"]:
            txt = item["text"] if len(item["text"]) <= 90 else item["text"][:87] + "..."
            lines.append(f'       "{txt}"')
        for alt in item["alternatives"]:
            lines.append(f"        alt: {alt['prompt']}")
        lines.append("")
    return "\n".join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--domain", help="Domain code, e.g. CC, GAPA, DL, PM, SW, SCC, technische_storing")
    src.add_argument("--file", help="Explicit transcript .md path")
    ap.add_argument("--roles", help="Comma-separated op roles to rank candidates for")
    ap.add_argument("--qa", action="store_true",
                    help="Emit a decision-ready Q/A per role (recommend + auto/confirm + alternatives) plus a rendered block")
    ap.add_argument("--out", help="Write JSON here instead of stdout")
    args = ap.parse_args(argv)

    if args.file:
        path = args.file
    else:
        path = find_transcript(args.domain)
        if not path:
            avail = sorted(
                re.match(r"TTS_transcripties_(.+?)(?:\s|\d|\(|\.md)", os.path.basename(p)).group(1)
                for p in glob.glob(os.path.join(TRANSCRIPT_DIR, "TTS_transcripties_*.md"))
            )
            json.dump(
                {"error": "no transcript for domain", "domain": args.domain, "available": avail},
                sys.stdout, ensure_ascii=False, indent=2,
            )
            print()
            return 1

    if not os.path.exists(path):
        json.dump({"error": "transcript not found", "path": path}, sys.stdout, indent=2)
        print()
        return 1

    records = parse_transcript(path)
    result = {
        "transcript": os.path.relpath(path, REPO_ROOT).replace("\\", "/"),
        "count": len(records),
        "keys": records,
    }
    roles = [r.strip() for r in args.roles.split(",")] if args.roles else []
    if roles and not args.qa:
        result["candidates"] = {
            role: rank_candidates(records, role) for role in roles if role
        }
    if roles and args.qa:
        result["qa"] = build_qa(records, roles)
        result["qaRendered"] = render_qa(result["qa"])

    text = json.dumps(result, ensure_ascii=False, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"wrote {args.out} ({len(records)} keys)")
    else:
        print(text)
        # When asking for Q/A on the console, also print the human-readable block.
        if roles and args.qa:
            print()
            print(result["qaRendered"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
