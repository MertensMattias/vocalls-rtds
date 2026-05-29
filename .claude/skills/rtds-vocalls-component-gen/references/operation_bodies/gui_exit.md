# Pattern: GUI-exit operation

Use for any Type whose work body **hands off to a downstream GUI node**
rather than doing the work itself. The runtime detects the returned exit
key and routes the call to the matching GUI node, which reads
`RTDS_OP_<Key>` to get its parameters.

All 11 GUI-exit Types share one skeleton. The only things that vary are
the `RTDS_currentOpType` value (PascalCase Type name) and the returned
exit key (snake_case string). The table below is the source of truth.

Logging discipline lives in [logging.md](../../conventions/logging.md).
Two logs is enough here: skip (info) and the GUI handoff (info). The
output node's exit log fires on resumption.

## Skeleton

```js
if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[<componentName>] skipped — inactive', { nextStep: __rtNextStep });
    return;
}

var __nextStepId = getValue(__rtParams, 'NextStep', -1);

walk(__rtParams, function (key, value) {
    context.session.variables['RTDS_OP_' + key] = value;
});
context.session.variables.RTDS_currentOpType = '<TypeName>';
context.session.variables.RTDS_nextStepId    = __nextStepId;

Logger.info('[<componentName>] handing off', { exitKey: '<exit_key>', nextStep: __nextStepId });

return '<exit_key>';
```

**Why this shape**

- `walk` writes every Param to `RTDS_OP_<Key>` with operator-chosen casing
  preserved. That's the contract the downstream GUI node reads.
- The `Active` guard returns early *without* writing `RTDS_OP_*`. The skip
  log shows the default `nextStep` the call will fall through on.
- `__nextStepId` is hoisted into a local so the handoff log and the
  session-variable assignment use the same value. The `__` prefix is
  mandatory — see [naming.md](../../conventions/naming.md). `walk`'s callback
  parameters (`key`, `value`) stay bare because they're function-signature
  bindings, not `var` declarations.
- The handoff log is the terminal event — it records which GUI node the
  call is heading to and the next step it'll resume on. One line.
- The return value triggers the routing. Anything other than the
  canonical exit-key string is undefined behaviour.
- `Disconnect` is the exception — see the variant below.

## Type → TypeName + exit-key lookup

| Type                 | `RTDS_currentOpType` value | Returned exit key      | Notes                                                                       |
| -------------------- | -------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `WorkgroupTransfer`  | `'WorkgroupTransfer'`      | `'workgroup_transfer'` | Transfer to an ACD queue.                                                   |
| `ExternalTransfer`   | `'ExternalTransfer'`       | `'external_transfer'`  | Transfer to an external number.                                             |
| `Menu`               | `'Menu'`                   | `'menu'`               | DTMF / speech menu. Params often include `NextStep_<n>` per option.         |
| `LanguageMenu`       | `'LanguageMenu'`           | `'language_menu'`      | Language-selection variant of `Menu`.                                       |
| `PlayPrompt`         | `'PlayPrompt'`             | `'play_prompt'`        | TTS/dynamic prompt playback.                                                |
| `PlayAudio`          | `'PlayAudio'`              | `'play_audio'`         | Static audio file playback.                                                 |
| `Disconnect`         | `'Disconnect'`             | `'disconnect'`         | Terminal — **omit the `RTDS_nextStepId` line** (no next step).              |
| `GuardRouting`       | `'GuardRouting'`           | `'guard_routing'`      | On-call / guard rota routing.                                               |
| `GuardTUI`           | `'GuardTUI'`               | `'guard_tui'`          | Guard variant with TUI (accept/decline DTMF on the guard's leg).            |
| `Callback`           | `'Callback'`               | `'callback'`           | Callback scheduling; GUI node persists the request and ends the call leg.   |
| `SendEmail`          | `'SendEmail'`              | `'send_email'`         | Email dispatch; GUI node calls the email service.                            |

## Worked example — WorkgroupTransfer

```js
if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[workgroupTransfer] skipped — inactive', { nextStep: __rtNextStep });
    return;
}

var __nextStepId = getValue(__rtParams, 'NextStep', -1);

walk(__rtParams, function (key, value) {
    context.session.variables['RTDS_OP_' + key] = value;
});
context.session.variables.RTDS_currentOpType = 'WorkgroupTransfer';
context.session.variables.RTDS_nextStepId    = __nextStepId;

Logger.info('[workgroupTransfer] handing off', { exitKey: 'workgroup_transfer', nextStep: __nextStepId });

return 'workgroup_transfer';
```

## Worked example — Disconnect (terminal variant)

`Disconnect` drops the `RTDS_nextStepId` line and the handoff log gets a
"call ending" wording — there's no next step to record:

```js
if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[disconnect] skipped — inactive', { nextStep: __rtNextStep });
    return;
}

walk(__rtParams, function (key, value) {
    context.session.variables['RTDS_OP_' + key] = value;
});
context.session.variables.RTDS_currentOpType = 'Disconnect';

Logger.info('[disconnect] call ending');

return 'disconnect';
```

## Params

Do **not** invent a "typical Params" list. The runtime spec
[`../RTDS_runtime_spec.md §1.5`](../RTDS_runtime_spec.md) is the source of
truth for what Params a given Type accepts.
