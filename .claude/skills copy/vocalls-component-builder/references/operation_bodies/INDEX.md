# Operation work-node bodies — pattern index

The work-node body is the **only** thing that varies between v2 components.
There are five recognised shapes (four patterns + one one-off). Pick the
matching pattern file and load **only** that one — don't load every
operation body.

## Decision tree

```
Does the operation call an HTTP endpoint?
├── Yes → http_call.md
│         (covers SendSMS, RESTRequest, RESTGet, SkillUpdate,
│          Emergency, Schedule, anything else that issues
│          jsonHttpRequest)
└── No
    │
    Does it hand off to a downstream GUI node?
    ├── Yes → gui_exit.md
    │         (covers WorkgroupTransfer, ExternalTransfer, Menu,
    │          LanguageMenu, PlayPrompt, PlayAudio, Disconnect,
    │          GuardRouting, GuardTUI, Callback, SendEmail)
    │         The Type → exit-key lookup table is in that file.
    └── No
        │
        Does it write Param values out to globals?
        ├── Yes → set_attributes.md
        │         (covers SetAttributes and any setVariables-style
        │          attribute-projection operation)
        └── No
            │
            Does it pick a branch based on a comparison?
            ├── Yes → condition.md
            │         (covers Condition and CheckAttribute)
            └── No
                │
                Does it mutate session-level routing state?
                └── Yes → flow_jump.md
                          (FlowJump — the only Type here)
```

## Type → pattern lookup (cheat sheet)

| Type                 | Pattern file              |
| -------------------- | ------------------------- |
| `SendSMS`            | `http_call.md`            |
| `RESTRequest`        | `http_call.md`            |
| `RESTGet`            | `http_call.md`            |
| `SkillUpdate`        | `http_call.md`            |
| `Emergency`          | `http_call.md` (multi-branch via `result.status`) |
| `Schedule`           | `http_call.md` (dynamic branch via `result.state`) |
| `IVRLogging`         | `http_call.md` *or* `set_attributes.md` — depends on whether the logging endpoint is in scope. If logging is purely client-side, the pattern is `set_attributes.md` with one key (`Message`). |
| `UpdateSourceId`     | `flow_jump.md` (variant — see file)                |
| `SetAttributes`      | `set_attributes.md`       |
| `Condition`          | `condition.md`            |
| `CheckAttribute`     | `condition.md`            |
| `FlowJump`           | `flow_jump.md`            |
| `WorkgroupTransfer`  | `gui_exit.md`             |
| `ExternalTransfer`   | `gui_exit.md`             |
| `Menu`               | `gui_exit.md`             |
| `LanguageMenu`       | `gui_exit.md`             |
| `PlayPrompt`         | `gui_exit.md`             |
| `PlayAudio`          | `gui_exit.md`             |
| `Disconnect`         | `gui_exit.md` (terminal variant — no `RTDS_nextStepId` line) |
| `GuardRouting`       | `gui_exit.md`             |
| `GuardTUI`           | `gui_exit.md`             |
| `Callback`           | `gui_exit.md`             |
| `SendEmail`          | `gui_exit.md`             |

## What goes in a pattern file

Each pattern file contains:

1. The skeleton with `<componentName>` placeholders.
2. The rationale ("why this shape") — so you can judge edge cases.
3. Variants the pattern supports (e.g. multi-branch HTTP via `result.status`).
4. A worked example from a live or canonical component.
5. Operation-specific helpers when the pattern needs one
   (`__compareAttr` is inlined in `condition.md`; `__isMobileNumber` is
   inlined in `http_call.md`'s "precondition guards" section).

## What does NOT go in a pattern file

- A speculative "Typical Params" list. Params are spec'd in
  [`../RTDS_runtime_spec.md §1.5`](../RTDS_runtime_spec.md). Don't
  duplicate (or invent) them here.
- Per-Type boilerplate that only changes a log prefix. The skeleton
  parameterises that with `<componentName>`.
