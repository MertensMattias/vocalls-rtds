---
name: rtds-vocalls-component-gen
description: Generate Vocalls Designer mxGraph XML for a v2 RTDS operation component (sendSms-shaped). Use when the user asks to build, scaffold, generate, or convert an RTDS operation into a Vocalls component; cites Types like SetAttributes, Condition, CheckAttribute, FlowJump, Emergency, Schedule, SendSMS, SendEmail, PlayPrompt, WorkgroupTransfer; references handler XML or existing components; or asks for sendSms/v2 conventions. Self-contained skill with bundled conventions — works outside vocalls-rtds.
---

# RTDS Vocalls Component Generator (v2)

Produces one **v2 RTDS operation component** — a Vocalls Designer `<mxGraphModel>` file
(`.js`) for a single routing-table Type.

**Canonical example:** [references/examples/sendSms.js](references/examples/sendSms.js)

**Not for:** PureConnect handler XML, v1 components (`__rt<Key>` splay), or retired
`handler_source_file/` trees.

---

## Start here

Follow **[WORKFLOW.md](WORKFLOW.md)** — tiered loading, 7-step generation, decision tree.

**Conventions win.** Bundled in this skill (portable):

- [PROJECT_CONVENTIONS.md](PROJECT_CONVENTIONS.md) — routing + five-rule tl;dr
- [conventions/](conventions/) — especially [component-v2.md](conventions/component-v2.md)

When WORKFLOW or this file disagrees with `conventions/`, **the convention is correct**.

---

## Bundle layout

| Path | Role |
| ---- | ---- |
| [WORKFLOW.md](WORKFLOW.md) | Agent methodology |
| [PROJECT_CONVENTIONS.md](PROJECT_CONVENTIONS.md) | Routing doc |
| [conventions/](conventions/) | Full rules tree (14 files) |
| [references/operation_bodies/](references/operation_bodies/) | Work-body patterns |
| [references/examples/](references/examples/) | sendSms, sendMail, composite refs |
| [references/canonical_helpers.js](references/canonical_helpers.js) | Three master helpers |
| [references/rtds_globalCodeAndHelpers.js](references/rtds_globalCodeAndHelpers.js) | Runtime helper snapshot |
| [references/checklist.md](references/checklist.md) | Pre-delivery sweep |
| [assets/template.xml](assets/template.xml) | mxGraph skeleton |
| [scripts/](scripts/) | Layout + encoding |

Refresh from vocalls-rtds: [DEPLOY.md](DEPLOY.md).

---

## Output

Default: `rtds_vocalls_operations/components/<componentName>.js` in the user's
workspace (vocalls-rtds or other). Ask before overwrite.
