# Runtime ↔ component lockstep

**Scope:** [All] · **Answers:** *I'm changing executeXxx — do I have to update the Vocalls component too?*

For operations that have both a JS-handled twin in the runtime (e.g. `executeSetVariables` in [rtds_2_runtime.js](../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js)) **and** a Vocalls component on the canvas (e.g. [setVariables.js](../rtds/components/setVariables.js)):

- **Both implementations must share one contract.** Same Param shape, same store ([storage.md](storage.md)), same control-key skip-list.
- The runtime twin is for inline flow execution; the component is for GUI-exit handoff. The dispatcher in `runStep` picks one based on the registry — the *result* should be observationally identical to the next operation.

When you change one, change the other. **Drift here is invisible** until a flow happens to take the other path.

## Param-shape contract (component `__setupConfig` ↔ twin `getParam`)

Both sides read a Param the same way: **array-form `[value, ...flags]` unwraps to `[0]`** (the trailing `isDisplayed`/`isEditable` flags are GUI-only), and the value's **type comes from the JSON** (no Number coercion — `"4"` stays a string). Component side: [`__setupConfig`](../rtds/components/sendSms.js) (specified in [specs/_setupConfig.spec.md](../rtds/specs/_setupConfig.spec.md)). Twin side: `getParam` in [rtds_2_runtime.js](../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js).

**`Active` coercion — one shared helper.** Both sides route Active through the **single global `activeFlag()`** ([rtds_3_vocallsEnv.js](../projects/rtds-runtime/globalLibraries/active/rtds_3_vocallsEnv.js)): `true`/`1`/`"1"`/`"true"` → active; `false`/`0`/`"0"`/`"false"`/empty/unresolved-`${}` → inactive (array form unwrapped first). The JS twins call `activeFlag()` directly; the component calls it through the thin component-local `__activeFlag` alias (which just delegates). There is no second coercion body to drift — a dictionary-emitted `Active: ["0", "isEditable"]` yields `false` on both paths. (Historically the global was named `isActive` with a `"false"`-is-truthy contract that diverged from the component; it was renamed to `activeFlag` and the component reduced to an alias, retiring the divergence.)

## Reflect on

- **[judgment]** Is there a runtime twin for this operation Type?
- **[judgment]** Do both write to the same store, skip the same control keys, accept the same Params?
