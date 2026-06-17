# Pattern: GUI-exit Types

GUI-exit is **not a Script-body pattern that generates a component**. It is
how the **runtime engine** routes a call off the routing table and onto the
canvas. Read this file to understand what to generate (often nothing) when a
Type is registered as a GUI-exit Type — do not emit the old
`walk(...) → RTDS_OP_*; return '<exit_key>'` skeleton. That model is retired.

## How GUI-exit actually works

When `runStep` hits a Type registered with `registerRtdsExit(type, exitKey)`,
the engine calls `prepareGuiHandoff(op)` in `rtds_2_runtime.js`, which:

- writes `context.session.variables.RTDS_currentOpId` and `RTDS_currentOpType`,
- writes `context.session.variables.RTDS_currentOpConfig = op.params` — the
  **whole** Params object, not per-key `RTDS_OP_*` variables,
- pre-populates `RTDS_nextStepId` with the default `nextStep` Param,
- returns the Type's **exit key** string to Vocalls, which routes the call to
  the matching canvas target.

The component author writes **none** of this. There is no `walk`, no
`RTDS_OP_<Key>` splay, and no `return '<exit_key>'` in any component body.

## What you generate for a GUI-exit Type

Two cases — decide which the target is:

1. **Vocalls-native target (most GUI-exit Types).** WorkgroupTransfer,
   ExternalTransfer, Menu, LanguageMenu, PlayPrompt, PlayAudio, Disconnect,
   GuardRouting, Callback, SendEmail are handled by **native Designer nodes**
   on the canvas (a transfer node, a menu node, an email node, …). The node
   reads `RTDS_currentOpConfig` for its parameters. **There is no v2
   component to generate** — the routing table entry plus the native canvas
   node are the whole implementation. Confirm the Type is registered with
   `registerRtdsExit` and stop.

2. **Self-contained v2 component target.** GuardTUI is the example: the
   `guard_tui` exit key routes to a generated component
   ([guardTui.js](../examples/)) that does real work — HTTP eligibility/state
   calls plus a DTMF activate/deactivate menu — and resolves its own outcome.
   This is an **ordinary v2 component**: generate it exactly like an
   HTTP-call component (init → `__setupConfig` → `__rtParams`, validate, stage
   `__rtOutcome`, resolve once at the output node with the `''` fallback). It
   reads its config from `RTDS_currentOpConfig` via `__configJSON`/`__setupConfig`
   like any other component; it does **not** read `RTDS_OP_*`. Use
   [http_call.md](http_call.md) (plus [composite.md](composite.md) for the
   DTMF menu) as the Script-body pattern.

## Type → exit-key registry (reference)

The engine emits these exit keys; the table is the source of truth for the
`registerRtdsExit` registrations, **not** for any component code.

| Type                 | `RTDS_currentOpType` value | Exit key emitted       | Target                                                              |
| -------------------- | -------------------------- | ---------------------- | ------------------------------------------------------------------ |
| `WorkgroupTransfer`  | `'WorkgroupTransfer'`      | `'workgroup_transfer'` | Native transfer node.                                               |
| `ExternalTransfer`   | `'ExternalTransfer'`       | `'external_transfer'`  | Native transfer node.                                              |
| `Menu`               | `'Menu'`                   | `'menu'`               | Native menu node. Params often include `NextStep_<n>` per option.  |
| `LanguageMenu`       | `'LanguageMenu'`           | `'language_menu'`      | Native language-menu node.                                         |
| `PlayPrompt`         | `'PlayPrompt'`             | `'play_prompt'`        | Native prompt node.                                               |
| `PlayAudio`          | `'PlayAudio'`              | `'play_audio'`         | Native audio node.                                               |
| `Disconnect`         | `'Disconnect'`             | `'disconnect'`         | Native disconnect (terminal — no next step).                      |
| `GuardRouting`       | `'GuardRouting'`           | `'guard_routing'`      | Native guard-routing node.                                        |
| `GuardTUI`           | `'GuardTUI'`               | `'guard_tui'`          | **Self-contained v2 component** (guardTui.js) — see case 2 above.  |
| `Callback`           | `'Callback'`               | `'callback'`           | Native callback node.                                            |
| `SendEmail`          | `'SendEmail'`              | `'send_email'`         | Native email node.                                              |

## Params

Do **not** invent a "typical Params" list. The runtime spec
[`../RTDS_runtime_spec.md §1.5`](../RTDS_runtime_spec.md) is the source of
truth for what Params a given Type accepts. The engine delivers them whole on
`RTDS_currentOpConfig`.
