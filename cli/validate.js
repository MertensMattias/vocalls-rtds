#!/usr/bin/env node

'use strict';

/**
 * CLI Validate — ES5.1 constraint check + CONFIG validator.
 *
 * Usage:
 *   npm run validate
 *   npm run validate -- --project my-project
 *   npm run validate -- --verbose
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { validateConstraints } = require('../core/minimalVocallsCore');
const { validate: validateConfigCollapsed } = require('../core/configValidator');
const loader = require('../core/loader');

const ensureProjectRoot = () => {
    if (!fs.existsSync(path.resolve(process.cwd(), 'env.config.json'))) {
        console.error('Error: Must run from project root');
        process.exit(1);
    }
};

const parseArgs = () => {
    const args = process.argv.slice(2);
    const opts = { project: null, verbose: false, reportFile: null };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project') opts.project = args[++i];
        if (args[i] === '--verbose' || args[i] === '-v') opts.verbose = true;
        if (args[i] === '--report-file') {
            const next = args[i + 1];
            if (!next || next.startsWith('--')) {
                process.stderr.write('Error: --report-file requires a path argument\n');
                process.exit(2);
            }
            opts.reportFile = next;
            i++;
        }
    }
    return opts;
};

/**
 * Execute all AGENT_*.js files (and optionally main.js) in a shared sandbox and extract
 * AGENT_* variables plus the shared CONFIG.
 * Returns { shared: CONFIG, agents: [AGENT_PRIMARY, ...] }
 *
 * @param {string[]} configFiles - Paths to AGENT_*.js files
 * @param {string|null} [mainJsPath] - Path to main.js (loaded first to populate CONFIG.labels)
 */
const extractConfigs = (configFiles, mainJsPath = null) => {
    // Build a minimal sandbox with stubs for runtime globals
    const sandbox = {
        varObj: { language: 'EN', _tempData: { 0: { apiResult: {} } }, cdb: {} },
        segmentState: { currentSegment: 0 },
        _apiResult: { caseNumber: 1 },
        agentContext: { variables: {} },
        agentPersona: {},
        runtimeInput: {},
        runtimeWrapper: {},
        base_prompt: '',
        opening: '',
        language: 'EN',
        context: { session: { variables: {} } },
        __systemPromptForDisplay: null,
        registerAgent: function () {},
        switchAgent: function () {
            return { opening: '', objective: '', variables: {}, actionDefinitions: [] };
        },
        resolveTemplate: function (t) {
            return t || '';
        },
        buildBasePrompt: function () {
            return '';
        },
        buildKnowledge: function () {
            return '';
        },
        getCurrentAgentConfig: function () {
            return null;
        },
        safeGet: function (obj, p, def) {
            if (!obj || !p) return def;
            var parts = p.split('.');
            var cur = obj;
            for (var i = 0; i < parts.length; i++) {
                if (cur == null) return def;
                cur = cur[parts[i]];
            }
            return cur === undefined ? def : cur;
        },
        isValidObject: function (o) {
            return o && typeof o === 'object';
        },
        nowUTC: function () {
            return new Date().toISOString();
        },
        logInfo: function () {},
        logWarn: function () {},
        logError: function () {},
        Logger: {
            info: function () {},
            warn: function () {},
            debug: function () {},
            error: function () {},
        },
        console: { log: function () {}, warn: function () {}, error: function () {} },
    };

    const ctx = vm.createContext(sandbox);

    // Load AGENT_*.js files first (they define AGENT_* objects and partially build CONFIG)
    for (const filePath of configFiles) {
        const code = fs.readFileSync(filePath, 'utf8').replace(/\b(let|const)\s+/g, 'var ');
        try {
            vm.runInContext(code, ctx, { filename: filePath });
        } catch (e) {
            // Script may fail on runtime calls — that's fine, we just need the CONFIG objects
        }
    }

    // Load main.js last — mirrors the real runtime load order.
    if (mainJsPath && fs.existsSync(mainJsPath)) {
        const mainCode = fs.readFileSync(mainJsPath, 'utf8').replace(/\b(let|const)\s+/g, 'var ');
        try {
            vm.runInContext(mainCode, ctx, { filename: mainJsPath });
        } catch (e) {
            // main.js may fail on runtime calls — that's fine, we just need CONFIG
        }
    }

    // Collect CONFIG objects from sandbox
    const shared = ctx.CONFIG || null;
    const agents = [];
    for (const key of Object.keys(ctx)) {
        if (key.startsWith('AGENT_') && typeof ctx[key] === 'object' && ctx[key]?._meta) {
            agents.push(ctx[key]);
        }
    }

    return { shared, agents };
};

/**
 * Discover AGENT_*.js files in the callScripts directory, sorted alphabetically.
 */
const discoverConfigFiles = (callScriptsDir) => {
    if (!fs.existsSync(callScriptsDir)) return [];
    return fs
        .readdirSync(callScriptsDir)
        .filter((f) => /^AGENT_.*\.js$/.test(f))
        .sort()
        .map((f) => path.resolve(callScriptsDir, f));
};

const main = () => {
    ensureProjectRoot();
    const opts = parseArgs();

    const reportBuffer = [];
    const originalLog = console.log;
    const originalError = console.error;
    if (opts.reportFile) {
        console.log = (...args) => reportBuffer.push(args.join(' '));
        console.error = (...args) => reportBuffer.push(args.join(' '));
    }

    let hasErrors = false;
    let totalErrors = 0;
    let totalWarnings = 0;
    let caught = null;

    try {
        const envConfig = loader.loadEnvConfig();
        const projectDetails = loader.loadProjectConfig(opts.project);
        const projectName = projectDetails?.name ?? opts.project ?? envConfig.activeProject;

        if (!projectName) {
            throw new Error('No active project. Run: npm run init');
        }

        const callScriptsPath =
            projectDetails?.config?.callScriptsPath ?? `projects/${projectName}/callScripts`;
        const callScriptsDir = path.resolve(process.cwd(), callScriptsPath);

        // Discover AGENT_*.js files
        const configFiles = discoverConfigFiles(callScriptsDir);

        console.log('Agent Builder Validator');
        console.log('=======================');
        console.log(`Project:   ${projectName}`);
        console.log(`Directory: ${path.relative(process.cwd(), callScriptsDir)}`);
        console.log('');

        if (configFiles.length === 0) {
            console.error(`No AGENT_*.js files found in: ${callScriptsDir}`);
            console.error('Run the pipeline first: /vocalls-build');
            hasErrors = true;
        } else {
            console.log(
                `Found ${configFiles.length} agent config file(s): ${configFiles.map((f) => path.basename(f)).join(', ')}`
            );
            console.log('');

            // ── Step 1: ES5.1 constraint check on each CONFIG file ──────────────────────
            let es5Failed = false;
            for (const filePath of configFiles) {
                const fileName = path.basename(filePath);
                const code = fs.readFileSync(filePath, 'utf8');
                const es5Result = validateConstraints(code, fileName);
                if (!es5Result.ok) {
                    console.log(
                        `❌ ES5.1 check failed in ${fileName} — ${es5Result.errors.length} violation(s):\n`
                    );
                    for (const e of es5Result.errors) {
                        console.log(`  [ES5.1] ${e.rule} at line ${e.line} — ${e.message}`);
                    }
                    es5Failed = true;
                    totalErrors += es5Result.errors.length;
                }
            }
            if (es5Failed) {
                hasErrors = true;
            } else {
                console.log('✅ ES5.1 check passed');

                // ── Step 2: Extract agent configs from AGENT_*.js files ────────────────────
                // Also load main.js so CONFIG.labels (defined there) is available to the validator
                const mainJsPath = path.resolve(callScriptsDir, 'main.js');
                const { shared, agents } = extractConfigs(configFiles, mainJsPath);

                if (agents.length === 0) {
                    console.log('⚠  No AGENT_* objects found — skipping agent config validation');
                } else {
                    console.log(
                        `   Found ${agents.length} agent CONFIG(s): ${agents.map((a) => a._meta?.agentId ?? '?').join(', ')}`
                    );
                    console.log('');

                    // ── Step 3: Run CONFIG validator on each agent CONFIG ────────────────────────
                    for (let agentIdx = 0; agentIdx < agents.length; agentIdx++) {
                        const agentConfig = agents[agentIdx];
                        const agentId = agentConfig._meta?.agentId ?? 'unknown';
                        const allAgents = agents.length > 1 ? agents : null;
                        // Pass sharedConfig only on first agent to avoid duplicate project-level errors
                        // Phase C: validateConfig collapsed to cross-field residual.
                        // sharedConfig + multi-agent diff handled at the schema layer
                        // (Phase A) or by the validator subagent's Mode 4 + 5.
                        void allAgents;
                        const issues = validateConfigCollapsed(agentConfig);
                        const errors = issues.filter((i) => i.severity === 'error');
                        const warnings = issues.filter((i) => i.severity === 'warning');
                        totalErrors += errors.length;
                        totalWarnings += warnings.length;

                        if (errors.length === 0) {
                            const passMsg =
                                issues.length === 0
                                    ? 'all checks passed'
                                    : `passed (${warnings.length} warning(s))`;
                            console.log(`Agent "${agentId}": ${passMsg}`);
                        } else {
                            console.log(
                                `Agent "${agentId}": ${errors.length} error(s), ${warnings.length} warning(s)`
                            );
                            hasErrors = true;
                        }

                        if (opts.verbose || errors.length > 0) {
                            for (const i of issues) {
                                const icon = i.severity === 'error' ? 'x' : '!';
                                console.log(
                                    `  ${icon} [${i.check}] ${i.location} — ${i.detail}`
                                );
                            }
                        } else if (warnings.length > 0) {
                            console.log(`  (use --verbose to see ${warnings.length} warning(s))`);
                        }
                        console.log('');
                    }

                    if (!hasErrors) {
                        console.log('Validation complete.');
                    }
                }
            }
        }
    } catch (e) {
        caught = e;
    }

    if (opts.reportFile) {
        // Restore unconditionally so summary + any subsequent error message hit real stdout/stderr.
        console.log = originalLog;
        console.error = originalError;
        try {
            fs.mkdirSync(path.dirname(opts.reportFile), { recursive: true });
        } catch (_) {
            // mkdir failure shouldn't lose the summary line; writeFileSync below will surface the error.
        }
        try {
            fs.writeFileSync(opts.reportFile, reportBuffer.join('\n') + '\n');
        } catch (_) {
            // If buffer write fails, still emit the summary line so orchestrator gets a signal.
        }
        const status = caught || hasErrors ? 'FAIL' : 'PASS';
        process.stdout.write(
            `VALIDATION: ${status} | ${totalErrors} errors, ${totalWarnings} warnings\n`
        );
    }

    // Throws produce default Node exit-1 with stack trace; prefer that over silent process.exit(1).
    if (caught) throw caught;
    if (hasErrors) process.exit(1);
};

if (require.main === module) {
    main();
}
