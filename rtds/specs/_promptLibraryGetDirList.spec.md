---
status: non-operation
catalog: null
---

# Reference — NAllo_RTDS_PromptLibrary_GetDirList.xml (filesystem helper, not a Vocalls operation)

| Field          | Value                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| Operation Type | n/a (filesystem listing helper)                                           |
| Component name | n/a                                                                        |
| Pattern        | n/a                                                                        |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_PromptLibrary_GetDirList.xml` |
| Target file    | n/a — do not generate as a Vocalls component                               |

## What this handler does (PureConnect side)

`NAllo_RTDS_PromptLibrary_GetDirList` is a recursive filesystem walker. Given a directory path, it returns:

- `p_lsFileNames` — relative filenames of every `.wav` found under the directory (recursive).
- `p_lsFilePaths` — the corresponding full paths.

Used administratively to discover what prompts a library actually contains so the RTDS editor can offer them as autocomplete options when configuring a `PlayPrompt` or `Menu` operation.

## Why this isn't a Vocalls operation

This handler doesn't run on a per-call basis — it runs in the editor/admin tooling. Vocalls' equivalent is:

- A Vocalls Designer feature (the prompt library picker) that queries the prompt library on demand.
- Or a backend admin endpoint that returns the same listing.

A Vocalls flow operation cannot — and should not — list directories from the IVR runtime. File I/O at call time is the wrong layer.

## Recommendation

Do not port `NAllo_RTDS_PromptLibrary_GetDirList`. If the operator needs a per-flow autocomplete listing the available prompts, that's a Vocalls Designer / RTDS backend admin concern, not a Vocalls flow operation.

### Open questions

- Confirm the prompt-library listing is exposed through Vocalls Designer (and/or an admin endpoint), so the operator does not lose discoverability when configuring `PlayPrompt` / `Menu` / similar operations.
- Confirm the filesystem layout (`<library>/<language>/<prompt>.wav`) is preserved or whether the new system uses a database/blob-store with a different addressing scheme.
