# Runtime ↔ component lockstep

**Scope:** [All] · **Answers:** *I'm changing executeXxx — do I have to update the Vocalls component too?*

For operations that have both a JS-handled twin in the runtime (e.g. `executeSetVariables` in [rtds_2_runtime.js](../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js)) **and** a Vocalls component on the canvas (e.g. [setVariables.js](../rtds_vocalls_operations/components/setVariables.js)):

- **Both implementations must share one contract.** Same Param shape, same store ([storage.md](storage.md)), same control-key skip-list.
- The runtime twin is for inline flow execution; the component is for GUI-exit handoff. The dispatcher in `runStep` picks one based on the registry — the *result* should be observationally identical to the next operation.

When you change one, change the other. **Drift here is invisible** until a flow happens to take the other path.

## Reflect on

- **[judgment]** Is there a runtime twin for this operation Type?
- **[judgment]** Do both write to the same store, skip the same control keys, accept the same Params?
