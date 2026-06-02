# Worked Example — `NAllo_RTDS_Disconnect.xml` → `disconnect.spec.md`

A calibration example. Source handler is 72 lines of XML
([rtds/pureconnect_handlers/NAllo_RTDS_Disconnect.xml](../../../../rtds/pureconnect_handlers/NAllo_RTDS_Disconnect.xml)).
After applying [tool_filter.md](tool_filter.md) and recognising the
idioms in [pattern_recognition.md](pattern_recognition.md), the spec is
~60 lines including the work-body sketch.

## What the handler does (in the head)

The PureConnect handler has 5 steps:

- `12` — `Condition` on `StrLen(GetAt(..., "Prompt", 0)) > 0` (is the `Prompt` Param non-empty?)
- `20` — `Parse String` splitting the `Prompt` value on `"|"` into `lsPrompts` (only reached if Prompt is non-empty)
- `19` — `Subroutine` call to `NAllo_RTDS_Play` (plays `lsPrompts`)
- `18` — Telephony `Disconnect` (hangs up the call)

The only real business behaviour:

1. If `Prompt` Param is non-empty, play it before disconnecting.
2. Disconnect.

Everything else is plumbing. In Vocalls this is a **GUI-exit** operation
with exit key `"disconnect"`. Prompt-playing is handled by an upstream
`PlayPrompt` operation in the flow, not as a side-effect inside
`Disconnect`. So the spec drops the prompt logic entirely and flags it
in "Open questions".

## The resulting spec

```markdown
# Operation Spec — disconnect (Disconnect)

| Field              | Value                                                       |
| ------------------ | ----------------------------------------------------------- |
| Operation Type     | `Disconnect`                                                |
| Component name     | `disconnect`                                                |
| Pattern            | `gui_exit` (terminal — no `RTDS_nextStepId` line)            |
| Source handler     | `rtds/pureconnect_handlers/NAllo_RTDS_Disconnect.xml` |
| Target file        | `rtds/components/disconnect.js`           |

## Business purpose

Hang up the call. This operation is the terminal handoff at the end of any
flow that should release the caller — used after a successful transfer
confirmation, after a "thank you, goodbye" prompt, or as the disconnect
target on Emergency / Schedule / Guard branches.

### Inputs (Params)

| Param name | Type    | Required | Default | Description                                                                                |
| ---------- | ------- | -------- | ------- | ------------------------------------------------------------------------------------------ |
| `Active`   | boolean | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.  |

### Outputs

Exit key returned to Vocalls: `"disconnect"`.

| Branch key | Taken when                       | Fallback |
| ---------- | -------------------------------- | -------- |
| `NextStep` | Operation is inactive — skipped. | `-1`     |

Once the work body returns `"disconnect"`, Vocalls routes to the
Disconnect GUI node. There is no `NextStep_*` after the GUI handoff —
the call is terminated.

### Work-body sketch

Pattern: `gui_exit` (terminal variant) — see [operation_bodies/gui_exit.md](../../rtds-vocalls-component-gen/references/operation_bodies/gui_exit.md).

\`\`\`js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[disconnect] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

// Project Params onto context.session.variables for the GUI node.
// (Disconnect has no Params to project beyond Active; the loop here is
// a no-op, but the shape stays consistent with the other GUI-exit ops.)
var __paramKeys = ['Active'];
var __i;
for (__i = 0; __i < __paramKeys.length; __i++) {
    walk(context.session.variables, 'RTDS_OP_' + __paramKeys[__i], getValue(__rtParams, __paramKeys[__i]));
}

Logger.info('[disconnect] handoff', { exit: 'disconnect' });
return 'disconnect';
\`\`\`

### Open questions

- The source handler conditionally plays a `Prompt` Param before
  disconnecting (via `NAllo_RTDS_Play`). In Vocalls, prompt-playing is a
  separate `PlayPrompt` operation upstream — please confirm the flow
  author will model the "say goodbye then hang up" sequence as two
  operations rather than folding the prompt into `Disconnect`.
- The handler also reads `lsAttrNames`/`lsAttrValues` to drive the
  `NAllo_RTDS_Play` subroutine. After the prompt is removed, the
  Disconnect operation has no Params beyond `Active` — please confirm
  this is the desired contract.
```

## What was filtered out

Compared to the source handler, the spec **does not mention**:

- The `Condition` step on `Prompt` non-emptiness (its purpose — gate the
  prompt-play — is gone because prompt-play is gone).
- The `Parse String` step (the splitter — irrelevant once prompt-play is upstream).
- The `NAllo_RTDS_Play` subroutine call (cross-handler invocation has no Vocalls equivalent).
- The `Disconnect` Telephony step's parameters (`Cancel pending operations? = false`, `Reason Code: = 0`) — Vocalls' Disconnect GUI node owns these.
- `Interaction1`, `p_lsAttrNames`, `p_lsAttrValues`, `p_sNextStep`, `lsPrompts`, `lsPromptClosed`, `sDigits`, `sPromptSource`, `sResult` — all variables.

The Vocalls spec is ~60 lines vs. the source's 72 lines of XML, and
captures the actual business contract (the call hangs up, optionally
preceded by a prompt that is now a separate upstream operation) without
the plumbing.

## How to calibrate other handlers

Use this example as a tone reference:

- **Length** — 1–2 pages is enough for a simple `gui_exit`. `http_call`
  operations (SendSMS, Emergency) go to 2–3 pages because of Section 4 and
  the longer work-body sketch.
- **Voice** — direct, declarative. "Hang up the call." Not "This handler
  is responsible for terminating the interaction."
- **Open questions** — actively useful. The two questions in this
  example are real divergences from the source handler's behaviour that
  the flow author needs to resolve.
- **PureConnect leakage** — zero in the spec body. The only PureConnect
  artifact is the source-handler path in the header table.
