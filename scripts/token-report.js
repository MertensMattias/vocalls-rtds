#!/usr/bin/env node
/**
 * token-report.js — Per-sub-agent token usage report for the active Claude Code session.
 *
 * Reads the current project's session JSONL under ~/.claude/projects/<encoded-cwd>/
 * and all subagent conversations under <sessionId>/subagents/agent-*.jsonl, attributes
 * tokens to their subagent type, and writes a markdown report to
 * projects/<name>/.vocalls/token-report.md.
 *
 * Usage:
 *   node scripts/token-report.js --project <name> [--session <id>]
 *   npm run report:tokens -- --project <name>
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

function encodeCwdForClaude(cwd) {
  return cwd.replace(/[\\/:]/g, '-').replace(/^-+/, '');
}

function findProjectDir(cwd) {
  const projectsRoot = path.join(os.homedir(), '.claude', 'projects');
  if (!fs.existsSync(projectsRoot)) throw new Error('~/.claude/projects not found');
  const encoded = encodeCwdForClaude(cwd);
  const candidates = fs.readdirSync(projectsRoot).filter((d) => d.toLowerCase() === encoded.toLowerCase());
  if (!candidates.length) {
    const loose = fs.readdirSync(projectsRoot).filter((d) => d.toLowerCase().endsWith(encoded.toLowerCase().split('-').slice(-3).join('-')));
    if (!loose.length) throw new Error(`no project dir in ~/.claude/projects/ matches cwd: ${cwd} (encoded=${encoded})`);
    return path.join(projectsRoot, loose[0]);
  }
  return path.join(projectsRoot, candidates[0]);
}

function pickSession(projectDir, explicitSessionId) {
  if (explicitSessionId) {
    const p = path.join(projectDir, `${explicitSessionId}.jsonl`);
    if (!fs.existsSync(p)) throw new Error(`session JSONL not found: ${p}`);
    return { id: explicitSessionId, jsonlPath: p };
  }
  const files = fs
    .readdirSync(projectDir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ f, mtime: fs.statSync(path.join(projectDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!files.length) throw new Error('no JSONL sessions found');
  const top = files[0].f;
  return { id: top.slice(0, -'.jsonl'.length), jsonlPath: path.join(projectDir, top) };
}

function emptyBucket() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheCreate: 0,
    calls: 0,
    models: {}, // model -> same shape (without models/calls-models)
  };
}

function addUsage(bucket, usage, model) {
  if (!usage) return;
  const add = (b) => {
    b.input += usage.input_tokens || 0;
    b.output += usage.output_tokens || 0;
    b.cacheRead += usage.cache_read_input_tokens || 0;
    b.cacheCreate += usage.cache_creation_input_tokens || 0;
  };
  add(bucket);
  if (model) {
    if (!bucket.models[model]) bucket.models[model] = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 };
    const m = bucket.models[model];
    m.input += usage.input_tokens || 0;
    m.output += usage.output_tokens || 0;
    m.cacheRead += usage.cache_read_input_tokens || 0;
    m.cacheCreate += usage.cache_creation_input_tokens || 0;
  }
}

function sumJsonl(jsonlPath, bucket) {
  const lines = fs.readFileSync(jsonlPath, 'utf8').split(/\r?\n/);
  let assistantEntries = 0;
  for (const line of lines) {
    if (!line) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.type !== 'assistant') continue;
    const m = d.message || {};
    addUsage(bucket, m.usage, m.model);
    assistantEntries++;
  }
  bucket.calls = assistantEntries;
}

function scanSubagents(projectDir, sessionId) {
  const subDir = path.join(projectDir, sessionId, 'subagents');
  const byType = {}; // agentType -> { bucket, invocations }
  if (!fs.existsSync(subDir)) return byType;
  const files = fs.readdirSync(subDir).filter((f) => f.endsWith('.jsonl'));
  for (const f of files) {
    const jsonlPath = path.join(subDir, f);
    const metaPath = jsonlPath.replace(/\.jsonl$/, '.meta.json');
    let agentType = 'unknown';
    if (fs.existsSync(metaPath)) {
      try {
        agentType = JSON.parse(fs.readFileSync(metaPath, 'utf8')).agentType || 'unknown';
      } catch {}
    }
    if (!byType[agentType]) byType[agentType] = { bucket: emptyBucket(), invocations: 0 };
    const tmp = emptyBucket();
    sumJsonl(jsonlPath, tmp);
    // merge tmp into byType[agentType].bucket
    const dst = byType[agentType].bucket;
    dst.input += tmp.input;
    dst.output += tmp.output;
    dst.cacheRead += tmp.cacheRead;
    dst.cacheCreate += tmp.cacheCreate;
    dst.calls += tmp.calls;
    for (const [model, mu] of Object.entries(tmp.models)) {
      if (!dst.models[model]) dst.models[model] = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 };
      dst.models[model].input += mu.input;
      dst.models[model].output += mu.output;
      dst.models[model].cacheRead += mu.cacheRead;
      dst.models[model].cacheCreate += mu.cacheCreate;
    }
    byType[agentType].invocations += 1;
  }
  return byType;
}

function fmtN(n) {
  return n.toLocaleString('en-US');
}

function totalTokens(b) {
  return b.input + b.output + b.cacheRead + b.cacheCreate;
}

function renderReport({ projectName, sessionId, sessionStartedAt, orchestrator, subagents }) {
  const lines = [];
  lines.push(`# Token Usage Report — ${projectName}`);
  lines.push('');
  lines.push(`- Session: \`${sessionId}\``);
  lines.push(`- Report generated: ${new Date().toISOString()}`);
  if (sessionStartedAt) lines.push(`- Session started: ${sessionStartedAt}`);
  lines.push('');

  // Totals
  const grand = emptyBucket();
  const merge = (b) => {
    grand.input += b.input;
    grand.output += b.output;
    grand.cacheRead += b.cacheRead;
    grand.cacheCreate += b.cacheCreate;
    for (const [m, mu] of Object.entries(b.models)) {
      if (!grand.models[m]) grand.models[m] = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 };
      grand.models[m].input += mu.input;
      grand.models[m].output += mu.output;
      grand.models[m].cacheRead += mu.cacheRead;
      grand.models[m].cacheCreate += mu.cacheCreate;
    }
  };
  merge(orchestrator);
  for (const { bucket } of Object.values(subagents)) merge(bucket);

  lines.push('## Totals (this session)');
  lines.push('');
  lines.push(`| Metric | Tokens |`);
  lines.push(`|---|---:|`);
  lines.push(`| Input (fresh) | ${fmtN(grand.input)} |`);
  lines.push(`| Output | ${fmtN(grand.output)} |`);
  lines.push(`| Cache read | ${fmtN(grand.cacheRead)} |`);
  lines.push(`| Cache write (creation) | ${fmtN(grand.cacheCreate)} |`);
  lines.push(`| **Total** | **${fmtN(totalTokens(grand))}** |`);
  lines.push('');
  lines.push('For cost in $, run `npx ccusage@latest session`.');
  lines.push('');

  // By model
  lines.push('## By model');
  lines.push('');
  lines.push('| Model | Input | Output | Cache read | Cache write |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const [m, mu] of Object.entries(grand.models).sort((a, b) => totalTokens(b[1]) - totalTokens(a[1]))) {
    lines.push(`| ${m} | ${fmtN(mu.input)} | ${fmtN(mu.output)} | ${fmtN(mu.cacheRead)} | ${fmtN(mu.cacheCreate)} |`);
  }
  lines.push('');

  // By agent
  lines.push('## By sub-agent');
  lines.push('');
  lines.push('| Bucket | Input | Output | Cache read | Cache write | Total | Calls |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|');
  const orchestratorRow = [
    'orchestrator',
    fmtN(orchestrator.input),
    fmtN(orchestrator.output),
    fmtN(orchestrator.cacheRead),
    fmtN(orchestrator.cacheCreate),
    fmtN(totalTokens(orchestrator)),
    fmtN(orchestrator.calls),
  ];
  lines.push(`| ${orchestratorRow.join(' | ')} |`);
  const subAgentRows = Object.entries(subagents)
    .map(([agentType, data]) => ({
      agentType,
      bucket: data.bucket,
      invocations: data.invocations,
    }))
    .sort((a, b) => totalTokens(b.bucket) - totalTokens(a.bucket));
  for (const { agentType, bucket, invocations } of subAgentRows) {
    lines.push(
      `| ${agentType} (×${invocations}) | ${fmtN(bucket.input)} | ${fmtN(bucket.output)} | ${fmtN(bucket.cacheRead)} | ${fmtN(bucket.cacheCreate)} | ${fmtN(totalTokens(bucket))} | ${fmtN(bucket.calls)} |`
    );
  }
  lines.push('');
  lines.push('_Source: `~/.claude/projects/<cwd>/<session>.jsonl` (orchestrator) + `<session>/subagents/agent-*.jsonl` (per-subagent). Skill-type workflow nodes run in the orchestrator conversation and are attributed to `orchestrator`, not to individual skills._');
  lines.push('');
  return lines.join('\n');
}

function firstTimestamp(jsonlPath) {
  const lines = fs.readFileSync(jsonlPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    try {
      const d = JSON.parse(line);
      if (d.timestamp) return d.timestamp;
    } catch {}
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectName = args.project;
  if (!projectName) {
    console.error('Usage: node scripts/token-report.js --project <name> [--session <id>]');
    process.exit(1);
  }
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const projectDir = findProjectDir(cwd);
  const { id: sessionId, jsonlPath } = pickSession(projectDir, args.session);
  const sessionStartedAt = firstTimestamp(jsonlPath);

  const orchestrator = emptyBucket();
  sumJsonl(jsonlPath, orchestrator);
  const subagents = scanSubagents(projectDir, sessionId);

  const report = renderReport({ projectName, sessionId, sessionStartedAt, orchestrator, subagents });

  const outDir = path.join(cwd, 'projects', projectName, '.vocalls');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'token-report.md');
  fs.writeFileSync(outPath, report);

  process.stdout.write(`TOKEN_REPORT_WRITTEN: projects/${projectName}/.vocalls/token-report.md\n`);
}

try {
  main();
} catch (e) {
  console.error('token-report.js error:', e.message);
  process.exit(2);
}
