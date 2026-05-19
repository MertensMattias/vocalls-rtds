# Platform Tool Mapping — vocalls-brief

This skill uses **Claude Code tool names**. If you are running on a different platform,
use the lookup table below to translate each tool reference.

## Tool name mapping

| Skill references  | Copilot CLI         | Codex              | Gemini CLI          | Cursor                         |
| ----------------- | ------------------- | ------------------ | ------------------- | ------------------------------ |
| `Read`            | `view`              | native file tool   | `read_file`         | native file tool               |
| `Write`           | `create`            | native file tool   | `write_file`        | native file tool               |
| `Edit`            | `edit`              | native file tool   | `replace`           | native file tool               |
| `Bash`            | `bash`              | native shell tool  | `run_shell_command` | native shell tool              |
| `Grep`            | `grep`              | native search tool | `grep_search`       | native search tool             |
| `Glob`            | `glob`              | native search tool | `glob`              | native search tool             |
| `TodoWrite`       | `sql` (todos table) | `update_plan`      | `write_todos`       | not available — track mentally |
| `AskUserQuestion` | built-in input      | built-in input     | `ask_user`          | built-in input                 |

## Shell commands in this skill

The skill runs these shell commands via `Bash`. Platform notes:

| Command                     | Works on             | Notes                                                            |
| --------------------------- | -------------------- | ---------------------------------------------------------------- |
| `test -f "<path>"`          | All                  | POSIX — works on all platforms                                   |
| `test -d "<path>"`          | All                  | POSIX — works on all platforms                                   |
| `ls <glob>`                 | Unix / Git Bash      | On Windows cmd, use `dir` — but Git Bash is recommended          |
| `uname -s`                  | Unix / Git Bash      | Returns `Darwin`, `Linux`, or `MINGW64_NT-*` on Windows Git Bash |
| `unzip -q`                  | Unix (macOS/Linux)   | Pre-installed on macOS; `apt install unzip` on Linux             |
| `mkdir -p`                  | Unix / Git Bash      | Safe to use on Git Bash for Windows                              |
| `rm -rf`                    | Unix / Git Bash      | Safe to use on Git Bash for Windows                              |
| PowerShell `Expand-Archive` | Windows (PowerShell) | Used automatically when OS detection returns Windows             |
| PowerShell `Remove-Item`    | Windows (PowerShell) | Used automatically when OS detection returns Windows             |

## VSDX extraction — what the OS detection does

The skill runs:

```bash
OS=$(uname -s 2>/dev/null || echo "Windows")
```

- `Linux` or `Darwin` → uses `unzip` + `rm -rf`
- `MINGW*`, `CYGWIN*`, `MSYS*`, or `Windows` → uses PowerShell `Expand-Archive` + `Remove-Item`

If `unzip` is not installed on your Linux system, run: `sudo apt install unzip` (Debian/Ubuntu)
or `sudo yum install unzip` (RHEL/CentOS).

## Features not available on all platforms

| Feature                   | Copilot CLI | Codex     | Gemini CLI          | Cursor    |
| ------------------------- | ----------- | --------- | ------------------- | --------- |
| Interactive Q&A (Phase 2) | Supported   | Supported | Use `ask_user` tool | Supported |
| File write (brief.md)     | Supported   | Supported | Supported           | Supported |
| VSDX extraction           | Supported   | Supported | Supported           | Supported |

All core features of vocalls-brief are available on all platforms listed above.
